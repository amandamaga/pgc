// F1.6 — validação estática da disposição dos personagens nos 64 estímulos.
// Sem navegador e sem banco: carrega a tabela de pares do frontend e o seed do
// backend pelo Vite (os dois são TypeScript) e compara com o gabarito dos
// cartões originais.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({
  root, configFile: false, logLevel: 'error',
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { CHARACTER_PAIRS, characterSide, stimulusLayout } =
    await server.ssrLoadModule('/src/app/lib/character-layout.ts');
  const { RAW_STIMULI, RECEPTOR_PAIR } =
    await server.ssrLoadModule(fileURLToPath(new URL('../../backend/src/prisma/seed-data.ts', import.meta.url)));

  // Gabarito conferido nos 64 cartões originais (pilha inicial e seta): as
  // tentativas em que quem divide está à DIREITA (seta ←). As demais têm quem
  // divide à esquerda (seta →). Bloco 1 = A, 2 = B, 3 = A (2ª aplicação), 4 = C.
  const DISTRIBUTOR_ON_RIGHT = {
    1: [3, 5, 7, 9, 10, 13, 15, 16],
    2: [1, 2, 5, 7, 8, 12, 13, 16],
    3: [1, 3, 4, 7, 9, 11, 12, 16],
    4: [1, 3, 6, 7, 10, 13, 14, 15],
  };

  // 1. A tabela cobre exatamente os 16 personagens, cada um uma vez.
  const names = CHARACTER_PAIRS.flat();
  assert.equal(CHARACTER_PAIRS.length, 8, '8 pares');
  assert.equal(new Set(names).size, 16, '16 nomes distintos');
  assert.deepEqual([...names].sort(), Object.keys(RECEPTOR_PAIR).sort(),
    'a tabela de disposição e o RECEPTOR_PAIR do backend têm os mesmos 16 personagens');

  // 2. Os pares ordenados são os mesmos pares do backend, um de cada lado.
  for (const [left, right] of CHARACTER_PAIRS) {
    assert.equal(RECEPTOR_PAIR[left], right, `${left} faz par com ${right} no backend`);
    assert.equal(RECEPTOR_PAIR[right], left, `${right} faz par com ${left} no backend`);
    assert.equal(characterSide(left), 'left');
    assert.equal(characterSide(right), 'right');
  }

  // 3. Os 64 estímulos do seed caem no lado do gabarito.
  assert.equal(RAW_STIMULI.length, 64, '64 estímulos no seed');
  const perBlock = { 1: { left: 0, right: 0 }, 2: { left: 0, right: 0 }, 3: { left: 0, right: 0 }, 4: { left: 0, right: 0 } };
  for (const [block, trial, distributor] of RAW_STIMULI) {
    const receptor = RECEPTOR_PAIR[distributor];
    const layout = stimulusLayout(distributor, receptor);
    const expected = DISTRIBUTOR_ON_RIGHT[block].includes(trial) ? 'right' : 'left';
    const where = `bloco ${block}, tentativa ${trial} (${distributor} → ${receptor})`;
    assert.equal(layout.known, true, `${where}: par reconhecido`);
    assert.equal(layout.distributorSide, expected, `${where}: quem divide deveria estar à ${expected === 'left' ? 'esquerda' : 'direita'}`);
    assert.equal(layout[layout.distributorSide], distributor, `${where}: nome de quem divide no lado certo`);
    assert.equal(layout[expected === 'left' ? 'right' : 'left'], receptor, `${where}: nome de quem recebe no lado oposto`);
    perBlock[block][expected]++;
  }
  for (const [block, c] of Object.entries(perBlock)) {
    assert.deepEqual(c, { left: 8, right: 8 }, `bloco ${block}: 8 para cada lado`);
  }

  // 4. Par desconhecido mantém o comportamento anterior (quem divide à esquerda).
  assert.deepEqual(stimulusLayout('Ana', 'Bia'), { left: 'Ana', right: 'Bia', distributorSide: 'left', known: false });
  assert.equal(stimulusLayout('Lucas', 'Alice').known, false, 'dois do mesmo lado não é um par válido');
  assert.equal(characterSide('  isaac '), 'right', 'nome com espaços/minúsculas');

  console.log('PASS F1.6 disposição: 16 personagens, 8 pares iguais ao backend, 64 estímulos no lado do cartão original (32 à esquerda, 32 à direita)');
} finally {
  await server.close();
}
