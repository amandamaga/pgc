#!/usr/bin/env node
/**
 * test-e2e-full-game.mjs
 *
 * Teste end-to-end contra o backend real e o banco Neon.
 * Login da pesquisadora -> cria sessao -> adiciona P1 e P2 -> joga as
 * tentativas pelos dois lados -> exporta os dois CSVs e confere o conteudo.
 *
 * Sem Playwright e sem Vite: usa apenas fetch do Node, entao roda com
 *   node scripts/test-e2e-full-game.mjs
 * sem depender de build de dependencias nativas.
 *
 * Pre-requisito: backend rodando em http://localhost:3001 (ou PGC_API_BASE).
 *
 * Variaveis (opcionais):
 *   PGC_API_BASE  URL da API (padrao http://localhost:3001)
 *   PGC_EMAIL / PGC_PASSWORD  conta da pesquisadora
 *   PGC_BLOCKS    condicao de cada um dos 4 blocos, ex.: AABB (padrao ABAC)
 *
 * F8: a sessao e criada com blockConditions e o teste confere, nos dois CSVs,
 * o rotulo de cada bloco (A1, A2, B3, B4...), o APtype pela condicao base e o
 * acumulado de moedas do grupo.
 */

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = process.env.PGC_API_BASE ?? 'http://localhost:3001';
const RESEARCHER_EMAIL = process.env.PGC_EMAIL ?? 'amanda@pgc.com';
const RESEARCHER_PASSWORD = process.env.PGC_PASSWORD ?? 'TestePGC123!';
const BLOCKS = (process.env.PGC_BLOCKS ?? 'ABAC').trim().toUpperCase();
if (!/^[ABC]{4}$/.test(BLOCKS)) {
  console.error(`PGC_BLOCKS invalido: "${BLOCKS}". Use 4 letras A, B ou C (ex.: AABB).`);
  process.exit(1);
}
const BLOCK_CONDITIONS = BLOCKS.split('');
const BLOCK_SEQUENCE = BLOCK_CONDITIONS.map((c, i) => `${c}${i + 1}`).join('-');

const POLL_MS = 250;
// O protocolo tem 64 tentativas; o teto so existe para o teste nao girar
// para sempre se algum estagio ficar preso.
const MAX_STEPS = 4000;

const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
const OUT_DIR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'exports');

const TEST_PARTICIPANTS = {
  P1: { displayName: 'Participante 1 (E2E)', participantCode: `P1-E2E-${Date.now()}` },
  P2: { displayName: 'Participante 2 (E2E)', participantCode: `P2-E2E-${Date.now()}` },
};

// Escolhas ciclicas em vez de aleatorias: a corrida fica reproduzivel e
// cobre consenso e divergencia entre os dois participantes.
const CHOICES = {
  P1: { judgment: ['Unjust', 'Unjust', 'Just'], punishment: ['Punish', 'NoPunish'] },
  P2: { judgment: ['Unjust', 'Just', 'Just'], punishment: ['Punish', 'Punish', 'NoPunish'] },
};

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function api(path, { token, method = 'GET', body, accept = 'application/json' } = {}) {
  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers: {
        Accept: accept,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    throw new Error(`Nao consegui falar com ${API_BASE}${path} (${err.message}). O backend esta rodando?`);
  }

  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 200);
    try { detail = JSON.parse(text).error ?? detail; } catch { /* resposta nao-JSON */ }
    throw new Error(`${method} ${path} -> ${response.status}: ${detail}`);
  }
  return accept === 'text/csv' ? text : (text ? JSON.parse(text) : null);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Fase 1 - pesquisadora prepara a sessao
// ---------------------------------------------------------------------------

async function setupSession() {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: RESEARCHER_EMAIL, password: RESEARCHER_PASSWORD },
  });
  assert.ok(login?.token, 'login deveria devolver token');
  console.log(`  login ok como ${login.researcher.name} <${login.researcher.email}>`);
  const token = login.token;

  const session = await api('/sessions', {
    token,
    method: 'POST',
    body: { name: `E2E ${BLOCKS} ${stamp}`, blockConditions: BLOCK_CONDITIONS },
  });
  assert.ok(session?.id, 'criacao de sessao deveria devolver id');
  assert.deepEqual(session.blockConditions, BLOCK_CONDITIONS, 'sessao deveria guardar os 4 blocos enviados');
  assert.equal(session.blockSequence, BLOCK_SEQUENCE, `blockSequence deveria ser ${BLOCK_SEQUENCE}`);
  console.log(`  sessao criada: ${session.id} (${session.name}) — blocos ${session.blockSequence}`);

  const participants = {};
  for (const [slot, info] of Object.entries(TEST_PARTICIPANTS)) {
    const created = await api(`/sessions/${session.id}/participants`, {
      token,
      method: 'POST',
      body: { slot, ...info },
    });
    assert.ok(created?.accessToken, `${slot} deveria receber accessToken`);
    participants[slot] = created;
    console.log(`  ${slot} cadastrado: ${info.displayName}`);
  }

  const started = await api(`/sessions/${session.id}/start`, { token, method: 'POST' });
  assert.equal(started.status, 'IN_PROGRESS', 'sessao deveria ficar IN_PROGRESS');
  console.log('  sessao iniciada');

  return { token, session, participants };
}

// ---------------------------------------------------------------------------
// Fase 2 - os dois participantes jogam em paralelo
// ---------------------------------------------------------------------------

async function playAll(slot, accessToken) {
  const choices = CHOICES[slot];
  const counters = { judgment: 0, punishment: 0 };
  const seenAttempts = new Set();
  let state = await api('/participant/me', { token: accessToken });
  let steps = 0;

  while (state.stage !== 'COMPLETED') {
    if (++steps > MAX_STEPS) {
      throw new Error(`${slot} travou em ${state.stage} depois de ${MAX_STEPS} passos`);
    }

    const attemptId = state.currentAttempt?.id;
    if (attemptId && !seenAttempts.has(attemptId)) {
      seenAttempts.add(attemptId);
      if (seenAttempts.size % 8 === 0) console.log(`  ${slot}: ${seenAttempts.size} tentativas vistas`);
    }

    switch (state.stage) {
      case 'JUDGMENT': {
        const judgment = choices.judgment[counters.judgment++ % choices.judgment.length];
        state = await api(`/participant/attempts/${attemptId}/judgment`, {
          token: accessToken, method: 'POST', body: { judgment },
        });
        break;
      }
      case 'PUNISHMENT': {
        const punishment = choices.punishment[counters.punishment++ % choices.punishment.length];
        state = await api(`/participant/attempts/${attemptId}/punishment`, {
          token: accessToken, method: 'POST', body: { punishment },
        });
        break;
      }
      case 'RESULT': {
        state = await api(`/participant/attempts/${attemptId}/result/acknowledge`, {
          token: accessToken, method: 'POST', body: {},
        });
        break;
      }
      // Estagios de espera: so o parceiro destrava.
      case 'WAITING_SESSION':
      case 'WAITING_JUDGMENT_PARTNER':
      case 'WAITING_PUNISHMENT_PARTNER':
      case 'WAITING_RESULT_PARTNER':
        await sleep(POLL_MS);
        state = await api('/participant/me', { token: accessToken });
        break;
      default:
        throw new Error(`${slot}: estagio inesperado ${state.stage}`);
    }
  }

  console.log(`  ${slot}: concluido, ${seenAttempts.size} tentativas, ${steps} passos`);
  return seenAttempts.size;
}

// ---------------------------------------------------------------------------
// Fase 3 - exportacao
// ---------------------------------------------------------------------------

// Conta linhas de dados. As colunas sao escapadas com aspas quando contem
// virgula, entao o split por linha so seria enganoso se algum campo tivesse
// quebra de linha - o que nao ocorre nos dados gerados pelo jogo.
function dataRows(csv) {
  const lines = csv.trim().split(/\r?\n/);
  return { header: lines[0], rows: lines.slice(1) };
}

const RAW_HEADER_START = 'sessionId,sessionName,blockSequence,sessionStatus';

// Divide uma linha de CSV respeitando campos entre aspas.
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// APtype aceito por condicao base (regra de export.model.csv.ts):
// A -> APa (com consequencia) ou D; B -> APb ou APd; C -> APc ou APd.
const APTYPE_BY_CONDITION = { A: ['APa', 'D'], B: ['APb', 'APd'], C: ['APc', 'APd'] };

function checkBlocks(raw, model) {
  // CSV completo: blockSequence igual em todas as linhas; blockLabel = condicao + bloco.
  const rawHeader = splitCsvLine(raw.header);
  const col = (name) => {
    const i = rawHeader.indexOf(name);
    assert.ok(i >= 0, `CSV completo sem a coluna ${name}`);
    return i;
  };
  const iSeq = col('blockSequence');
  const iBlock = col('blockNumber');
  const iCond = col('condition');
  const iLabel = col('blockLabel');
  for (const [index, line] of raw.rows.entries()) {
    const f = splitCsvLine(line);
    const block = Number(f[iBlock]);
    const expectedCond = BLOCK_CONDITIONS[block - 1];
    assert.equal(f[iSeq], BLOCK_SEQUENCE, `linha ${index + 1}: blockSequence`);
    assert.equal(f[iCond], expectedCond, `linha ${index + 1}: condition do bloco ${block}`);
    assert.equal(f[iLabel], `${expectedCond}${block}`, `linha ${index + 1}: blockLabel`);
  }

  // CSV modelo: Condition = rotulo do bloco, 16 linhas por bloco, na ordem;
  // APtype coerente com a condicao base; G.Coins Cum. = soma de G.Coins.
  const modelHeader = splitCsvLine(model.header);
  const iMCond = modelHeader.indexOf('Condition');
  const iAP = modelHeader.indexOf('APtype');
  const iG = modelHeader.indexOf('G.Coins');
  const iGCum = modelHeader.indexOf('G.Coins Cum.');
  assert.ok(iMCond === 0 && iAP > 0 && iG > 0 && iGCum > 0, 'CSV modelo sem Condition/APtype/G.Coins');
  let gCum = 0;
  const perLabel = {};
  for (const [index, line] of model.rows.entries()) {
    const f = splitCsvLine(line);
    const block = Math.floor(index / 16) + 1;
    const cond = BLOCK_CONDITIONS[block - 1];
    assert.equal(f[iMCond], `${cond}${block}`, `modelo linha ${index + 1}: Condition`);
    assert.ok(APTYPE_BY_CONDITION[cond].includes(f[iAP]), `modelo linha ${index + 1}: APtype ${f[iAP]} nao combina com ${cond}`);
    gCum += Number(f[iG]);
    assert.equal(Number(f[iGCum]), gCum, `modelo linha ${index + 1}: G.Coins Cum.`);
    perLabel[f[iMCond]] = (perLabel[f[iMCond]] ?? 0) + 1;
  }
  console.log(`  blocos conferidos: ${Object.entries(perLabel).map(([k, v]) => `${k}=${v}`).join(' ')}; moedas do grupo ${gCum}`);
}
const MODEL_HEADER_START = 'Condition,Trial,Distributor,Initial';

async function exportAndCheck(token, session, expectedAttempts) {
  mkdirSync(OUT_DIR, { recursive: true });

  const rawCsv = await api(`/sessions/${session.id}/export.csv`, { token, accept: 'text/csv' });
  const modelCsv = await api(`/sessions/${session.id}/export-model.csv`, { token, accept: 'text/csv' });

  const raw = dataRows(rawCsv);
  const model = dataRows(modelCsv);

  // Cabecalhos vem de EXPORT_COLUMNS / MODEL_COLUMNS no backend.
  assert.ok(raw.header.startsWith(RAW_HEADER_START), `cabecalho do CSV completo inesperado: ${raw.header.slice(0, 80)}`);
  assert.ok(raw.header.includes('culturalConsequence'), 'CSV completo deveria trazer culturalConsequence');
  assert.ok(raw.header.includes('p1Judgment') && raw.header.includes('p2Punishment'), 'CSV completo deveria trazer respostas dos dois');
  assert.ok(model.header.startsWith(MODEL_HEADER_START), `cabecalho do CSV de modelagem inesperado: ${model.header.slice(0, 80)}`);
  assert.ok(model.header.includes('Culturant'), 'CSV de modelagem deveria trazer a coluna Culturant');

  assert.ok(raw.rows.length > 0, 'CSV completo veio sem linhas: nenhuma tentativa foi registrada');
  assert.equal(raw.rows.length, model.rows.length, 'os dois CSVs deveriam ter o mesmo numero de linhas');
  assert.equal(raw.rows.length, expectedAttempts, `esperava ${expectedAttempts} linhas, vieram ${raw.rows.length}`);

  // Toda linha do CSV completo pertence a esta sessao.
  for (const [index, row] of raw.rows.entries()) {
    assert.ok(row.startsWith(session.id + ','), `linha ${index + 1} nao e desta sessao`);
  }

  checkBlocks(raw, model);

  const rawPath = join(OUT_DIR, `session-${session.id}.csv`);
  const modelPath = join(OUT_DIR, `session-${session.id}-model.csv`);
  writeFileSync(rawPath, rawCsv, 'utf8');
  writeFileSync(modelPath, modelCsv, 'utf8');

  console.log(`  CSV completo:   ${raw.rows.length} linhas -> ${rawPath}`);
  console.log(`  CSV modelagem:  ${model.rows.length} linhas -> ${modelPath}`);

  return { rawPath, modelPath, rows: raw.rows.length };
}

// ---------------------------------------------------------------------------

async function main() {
  const started = Date.now();
  console.log(`\nE2E contra ${API_BASE} — blocos ${BLOCKS} (${BLOCK_SEQUENCE})\n`);

  console.log('1/3 preparando a sessao');
  const { token, session, participants } = await setupSession();

  console.log('\n2/3 jogando as duas pontas');
  const [p1Attempts, p2Attempts] = await Promise.all([
    playAll('P1', participants.P1.accessToken),
    playAll('P2', participants.P2.accessToken),
  ]);
  assert.equal(p1Attempts, p2Attempts, 'os dois participantes deveriam ver o mesmo numero de tentativas');

  console.log('\n3/3 exportando e conferindo');
  await exportAndCheck(token, session, p1Attempts);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nPASS: ${p1Attempts} tentativas jogadas e exportadas em ${seconds}s.`);
  console.log(`Sessao no banco: ${session.id}\n`);
}

main().catch((err) => {
  console.error(`\nFALHOU: ${err.message}\n`);
  process.exitCode = 1;
});
