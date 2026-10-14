// Browser integration checks with isolated HTTP fixtures; never connects to Neon.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const server = await preview({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, preview: { host: '127.0.0.1', port: 4187, strictPort: true } });
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });

  // F1.2: aviso de perda individual da dupla na tela de RESULT, do ponto de vista
  // de quem joga (eu) contra o parceiro João. O caso 3 é o bug corrigido: só o
  // parceiro pune e a perda dele precisa aparecer para mim.
  async function checkLossFeedback(label, ownPunish, partnerPunish, expected, absent) {
    const bothPunish = ownPunish === 'Punish' && partnerPunish === 'Punish';
    const snap = {
      participant: {id:'P1', slot:'P1', displayName:'Maria', participantCode:'P1'},
      session: {id:'fixture', name:'Fixture', status:'IN_PROGRESS'},
      stage: 'RESULT',
      currentAttempt: { id:'attempt-loss', endowment:12, distributorDistribution:8, receptorDistribution:4, distributorCharacter:'Ana', receptorCharacter:'Bia', punishmentLoss:4 },
      trialResult: {
        ownIndividualCost: ownPunish === 'Punish' ? 1 : 0,
        ownCoinsAfter: ownPunish === 'Punish' ? 79 : 80,
        punishmentApplied: bothPunish,
        distributorResult: bothPunish ? {character:'Ana', finalCoins:4, coinsLost:4} : null,
        culturalConsequence: 0,
        groupCoinsAfter: 0,
      },
      partner: { slot:'P2', displayName:'João', judgment:'Unjust', punishment:partnerPunish, hasAck:false, coinsAfter: partnerPunish === 'Punish' ? 79 : 80, secondsSinceSeen:1 },
      own: { judgment:'Unjust', punishment:ownPunish, hasAck:false },
      balances: { ownCoins: ownPunish === 'Punish' ? 79 : 80, partnerCoins: partnerPunish === 'Punish' ? 79 : 80, groupCoins:0 },
    };
    const context = await browser.newContext({viewport:{width:768,height:1024}});
    await context.addInitScript(() => sessionStorage.setItem('intro-done:fixture-loss', '1'));
    await context.route('**/participant/**', route => route.fulfill({json:snap}));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4187/participant#token=fixture-loss');
    // Sem perda, o botão de seguir aparece direto; com perda, ele só vem depois do aviso.
    const next = page.getByRole('button',{name:'Ver a próxima história',exact:true});
    if (expected.length === 0) await expect(next).toBeVisible();
    else await expect(next).toHaveCount(0);
    for (const text of expected) await expect(page.getByText(text,{exact:true})).toBeVisible();
    for (const text of absent) await expect(page.getByText(text,{exact:true})).toHaveCount(0);
    if (bothPunish) {
      // A perda do distribuidor segue no balão do distributorResult, não na lista da dupla.
      await expect(page.getByText('Ana perdeu 4 moedas',{exact:true})).toHaveCount(1);
    } else {
      await expect(page.getByText('Ana perdeu',{exact:false})).toHaveCount(0);
    }
    console.log(`PASS F1.2 ${label}`);
    await context.close();
  }
  await checkLossFeedback('caso 1: NoPunish + NoPunish → sem aviso', 'NoPunish', 'NoPunish', [], ['Você perdeu 1 moeda', 'João perdeu 1 moeda']);
  await checkLossFeedback('caso 2: Punish + NoPunish → só eu', 'Punish', 'NoPunish', ['Você perdeu 1 moeda'], ['João perdeu 1 moeda']);
  await checkLossFeedback('caso 3: NoPunish + Punish → só o parceiro', 'NoPunish', 'Punish', ['João perdeu 1 moeda'], ['Você perdeu 1 moeda']);
  await checkLossFeedback('caso 4: Punish + Punish → as duas', 'Punish', 'Punish', ['Você perdeu 1 moeda', 'João perdeu 1 moeda'], []);

  // ===========================================================================
  // F1.5: marcos de tempo storyShownAt / nextStoryAvailableAt.
  // Fixtures isoladas: cada cenário tem o próprio token e um "servidor" em
  // memória que registra cada requisição com horário de chegada e de resposta.
  // ===========================================================================
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // Tempos reais da tela (F2): o aviso de perda dura LOSS_READ_PER_LINE_MS por linha.
  const LOSS_PER_LINE_MS = 3000;
  const LOSS_ONE_LINE_MS = LOSS_PER_LINE_MS;
  const attemptA = { id:'att-f15-a', endowment:12, distributorDistribution:8, receptorDistribution:4, distributorCharacter:'Ana', receptorCharacter:'Bia', punishmentLoss:4 };
  const attemptB = { id:'att-f15-b', endowment:12, distributorDistribution:6, receptorDistribution:6, distributorCharacter:'Caio', receptorCharacter:'Duda', punishmentLoss:3 };
  function f15Snap(o) {
    return {
      participant: {id:'P1', slot:'P1', displayName:'Maria', participantCode:'P1'},
      session: {id:'fixture', name:'Fixture', status:'IN_PROGRESS'},
      stage: o.stage,
      currentAttempt: o.attempt ?? attemptA,
      trialResult: o.result ?? null,
      partner: { slot:'P2', displayName:'João', judgment:o.pj ?? null, punishment:o.pp ?? null, hasAck:false, coinsAfter:null, secondsSinceSeen:1 },
      own: { judgment:o.oj ?? null, punishment:o.op ?? null, hasAck:false },
      balances: { ownCoins:o.ownCoins ?? 80, partnerCoins:80, groupCoins:o.group ?? 0 },
    };
  }
  let f15Seq = 0;
  async function openF15(initial, handlers = {}) {
    const token = `fixture-f15-${++f15Seq}`;
    const log = [];
    let snap = initial;
    const context = await browser.newContext({viewport:{width:768,height:1024}});
    await context.addInitScript(key => sessionStorage.setItem(key, '1'), `intro-done:${token}`);
    await context.route('**/participant/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const method = req.method();
      const kind = path.endsWith('/story-shown') ? 'story'
        : path.endsWith('/next-story-available') ? 'next'
        : path.endsWith('/judgment') ? 'judgment'
        : path.endsWith('/result/acknowledge') ? 'ack'
        : method === 'GET' ? 'get' : 'other';
      const entry = { kind, method, path, t: Date.now(), body: method === 'POST' ? req.postDataJSON() : undefined };
      log.push(entry);
      if (handlers[kind]) { const next = await handlers[kind](entry, snap); if (next) snap = next; }
      entry.doneAt = Date.now();
      await route.fulfill({json:snap});
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4187/participant#token=${token}`);
    return {
      page, context, log,
      set: next => { snap = next; },
      all: kind => log.filter(e => e.kind === kind),
      count: kind => log.filter(e => e.kind === kind).length,
    };
  }
  // Força re-renders sem mudar de etapa: troca o idioma e volta. Usa o evento
  // direto porque, com o modal de ganho aberto, o overlay cobre esse botão.
  async function rerender(page) {
    await page.getByRole('button', {name:/Norsk/}).dispatchEvent('click');
    await expect(page.getByRole('button', {name:/PT/})).toBeAttached();
    await page.getByRole('button', {name:/PT/}).dispatchEvent('click');
    await expect(page.getByRole('button', {name:/Norsk/})).toBeAttached();
  }
  function assertMarkerBody(entry, attemptId) {
    assert.ok(entry.path.endsWith(`/participant/attempts/${attemptId}/${entry.kind === 'story' ? 'story-shown' : 'next-story-available'}`), entry.path);
    assert.deepEqual(entry.body, {}, 'marco não envia nenhum dado científico');
  }

  // --- story-shown -----------------------------------------------------------
  {
    const s = await openF15(f15Snap({ stage:'JUDGMENT' }), {
      // Resposta lenta: prova que Justa/Injusta seguem bloqueados até o servidor confirmar.
      story: async () => { await sleep(1500); },
      judgment: async (e, snap) => ({ ...snap, stage:'WAITING_JUDGMENT_PARTNER', own:{ ...snap.own, judgment:e.body.judgment } }),
    });
    const { page } = s;
    const seeStory = page.getByRole('button', {name:'Ver História'});
    await expect(seeStory).toBeVisible();
    await sleep(800);
    assert.equal(s.count('story'), 0, 'antes de "Ver história" não há story-shown');

    await seeStory.click();
    assert.equal(s.count('story'), 0, 'o clique em "Ver história" não envia story-shown');
    await expect(page.getByText('Hora de Dividir',{exact:true})).toBeVisible();
    assert.equal(s.count('story'), 0, 'dividing não envia story-shown');
    await expect(page.getByText('Dividindo...',{exact:true})).toBeVisible();
    assert.equal(s.count('story'), 0, 'transferring não envia story-shown');
    await expect(page.getByText('Moedas distribuídas...',{exact:true})).toBeVisible({timeout:10000});
    const dividedSeenAt = Date.now();
    assert.equal(s.count('story'), 0, 'divided não envia story-shown');

    const just = page.getByRole('button', {name:'Justa',exact:true});
    await expect(just).toBeVisible();
    await expect(just).toBeDisabled();                       // story-shown ainda pendente
    await expect.poll(() => s.count('story')).toBe(1);
    const story = s.all('story')[0];
    assert.ok(story.t >= dividedSeenAt, 'story-shown só depois da fase "divided"');
    assertMarkerBody(story, attemptA.id);
    await expect(just).toBeEnabled({timeout:5000});          // liberado após o sucesso

    // Re-renders e replay da história não duplicam o POST.
    await rerender(page);
    await page.getByRole('button', {name:'Repetir história'}).click();
    await expect(page.getByText('Hora de Dividir',{exact:true})).toBeVisible();
    await expect(just).toBeVisible({timeout:15000});
    await expect(just).toBeEnabled();
    await sleep(500);
    assert.equal(s.count('story'), 1, 're-render / repetir história não duplica story-shown');

    await just.click();
    await expect.poll(() => s.count('judgment')).toBe(1);
    const judgment = s.all('judgment')[0];
    assert.ok(s.log.indexOf(story) < s.log.indexOf(judgment), 'story-shown antes de /judgment');
    assert.ok(judgment.t >= story.doneAt, '/judgment só sai depois de story-shown confirmado');
    console.log('PASS F1.5 story-shown: nada no clique nem na animação, um POST quando Justa/Injusta aparece, antes do /judgment, sem duplicar');
    await s.context.close();
  }

  // Já julgou antes de carregar (refresh): nenhum storyShownAt tardio.
  for (const stage of ['WAITING_JUDGMENT_PARTNER', 'JUDGMENT']) {
    const s = await openF15(f15Snap({ stage, oj:'Just' }));
    await expect(s.page.getByText('Você acha que essa divisão foi justa ou injusta?',{exact:true})).toBeVisible();
    await sleep(2500);
    assert.equal(s.count('story'), 0, `own.judgment já existe (${stage}) → sem story-shown`);
    await s.context.close();
  }
  console.log('PASS F1.5 story-shown: own.judgment já existente ao carregar não cria timestamp tardio');

  // --- next-story-available ---------------------------------------------------
  async function checkNextStory({ label, ownLoss, gain }) {
    const ownPunish = ownLoss ? 'Punish' : 'NoPunish';
    const resultSnap = f15Snap({
      stage:'RESULT', oj:'Unjust', op:ownPunish, pj:'Unjust', pp:'NoPunish',
      result: { ownIndividualCost: ownLoss ? 1 : 0, ownCoinsAfter: ownLoss ? 79 : 80, punishmentApplied:false,
        distributorResult:null, culturalConsequence: gain ? 3 : 0, groupCoinsAfter: gain ? 3 : 0 },
      ownCoins: ownLoss ? 79 : 80, group: gain ? 3 : 0,
    });
    let resultServedAt = null;
    const s = await openF15(f15Snap({ stage:'WAITING_PUNISHMENT_PARTNER', oj:'Unjust', op:ownPunish, pj:'Unjust' }), {
      get: (e, snap) => { if (snap.stage === 'RESULT' && resultServedAt === null) resultServedAt = e.t; },
      next: async () => { await sleep(1500); },
      // Depois do ack a dupla segue para a próxima história (attempt B).
      ack: async () => f15Snap({ stage:'JUDGMENT', attempt:attemptB }),
    });
    const { page } = s;
    await expect(page.getByText('Você daria 1 das suas moedas para que Ana perca 4 moedas?',{exact:true})).toBeVisible();
    s.set(resultSnap);                                      // o parceiro decidiu; o polling entra em RESULT
    const next = page.getByRole('button', {name:'Ver a próxima história',exact:true});

    if (ownLoss) {
      const loss = page.getByText('Você perdeu 1 moeda',{exact:true});
      await expect(loss).toBeVisible({timeout:5000});
      // Durante todo o tempo do aviso de perda: nenhum POST e nenhum botão de
      // avançar. A janela é medida a partir da entrada em RESULT, e não pela
      // visibilidade do texto, que ainda some com animação depois do fim.
      assert.ok(resultServedAt !== null);
      while (Date.now() - resultServedAt < LOSS_ONE_LINE_MS - 300) {
        assert.equal(s.count('next'), 0, `${label}: next-story-available antes do fim do aviso de perda`);
        assert.equal(await next.count(), 0, `${label}: botão de avançar visível durante o aviso de perda`);
        if (gain) assert.equal(await page.getByText('Vocês ganharam moedas!',{exact:false}).count(), 0);
        await sleep(250);
      }
    }
    await expect(next).toBeVisible({timeout:15000});
    await expect(next).toBeDisabled();                       // ainda aguardando o servidor
    await expect.poll(() => s.count('next')).toBe(1);
    const mark = s.all('next')[0];
    assertMarkerBody(mark, attemptA.id);
    assert.ok(resultServedAt !== null);
    if (ownLoss) {
      assert.ok(mark.t - resultServedAt >= LOSS_ONE_LINE_MS - 250,
        `${label}: next-story-available ${mark.t - resultServedAt}ms após RESULT, antes do fim do aviso (${LOSS_ONE_LINE_MS}ms)`);
    }
    await expect(next).toBeEnabled({timeout:5000});

    await rerender(page);
    await sleep(500);
    assert.equal(s.count('next'), 1, `${label}: re-render não duplica next-story-available`);

    await next.click();
    await expect.poll(() => s.count('ack')).toBe(1);
    const ack = s.all('ack')[0];
    assert.ok(s.log.indexOf(mark) < s.log.indexOf(ack), `${label}: next-story-available antes de /result/acknowledge`);
    assert.ok(ack.t >= mark.doneAt, `${label}: acknowledge só depois de next-story-available confirmado`);

    // Próxima história: o "ready" da anterior não pode disparar story-shown.
    await expect(page.getByRole('button', {name:'Ver História'})).toBeVisible();
    await sleep(1500);
    assert.equal(s.count('story'), 0, `${label}: story-shown precoce na troca de história`);
    console.log(`PASS F1.5 next-story-available — ${label}`);
    await s.context.close();
  }
  await checkNextStory({ label:'perda, sem ganho (culturalConsequence = 0)', ownLoss:true,  gain:false });
  await checkNextStory({ label:'perda, com ganho da dupla (modal)',        ownLoss:true,  gain:true  });
  await checkNextStory({ label:'sem perda, sem ganho',                     ownLoss:false, gain:false });
  await checkNextStory({ label:'sem perda, com ganho da dupla (modal)',    ownLoss:false, gain:true  });

  // ===========================================================================
  // F1.6: disposição dos personagens como nos cartões originais. Cada par tem
  // lado fixo; quem divide pode estar à esquerda (→) ou à direita (←). Os 16
  // casos são estímulos reais do seed: para cada par, um com quem divide à
  // esquerda e outro com quem divide à direita.
  // ===========================================================================
  const LAYOUT_CASES = [
    { card:'A2',  distributor:'Alice',    receptor:'Laura',    side:'left',  endowment:4,  dd:3,  rd:1,  loss:2,  final:1 },
    { card:'A5',  distributor:'Laura',    receptor:'Alice',    side:'right', endowment:4,  dd:2,  rd:2,  loss:1,  final:1 },
    { card:'A4',  distributor:'David',    receptor:'Theo',     side:'left',  endowment:8,  dd:6,  rd:2,  loss:4,  final:2 },
    { card:'A10', distributor:'Theo',     receptor:'David',    side:'right', endowment:8,  dd:4,  rd:4,  loss:2,  final:2 },
    { card:'A8',  distributor:'Isabella', receptor:'Cecilia',  side:'left',  endowment:12, dd:9,  rd:3,  loss:6,  final:3 },
    { card:'A3',  distributor:'Cecilia',  receptor:'Isabella', side:'right', endowment:12, dd:6,  rd:6,  loss:3,  final:3 },
    { card:'A6',  distributor:'Maria',    receptor:'Sarah',    side:'left',  endowment:20, dd:15, rd:5,  loss:10, final:5 },
    { card:'B16', distributor:'Sarah',    receptor:'Maria',    side:'right', endowment:28, dd:21, rd:7,  loss:14, final:7 },
    { card:'A14', distributor:'Sofia',    receptor:'Olivia',   side:'left',  endowment:32, dd:24, rd:8,  loss:16, final:8 },
    { card:'A9',  distributor:'Olivia',   receptor:'Sofia',    side:'right', endowment:32, dd:16, rd:16, loss:8,  final:8 },
    { card:'A1',  distributor:'Lucas',    receptor:'Isaac',    side:'left',  endowment:16, dd:12, rd:4,  loss:8,  final:4 },
    { card:'A16', distributor:'Isaac',    receptor:'Lucas',    side:'right', endowment:16, dd:8,  rd:8,  loss:4,  final:4 },
    { card:'A11', distributor:'Oliver',   receptor:'William',  side:'left',  endowment:24, dd:18, rd:6,  loss:12, final:6 },
    { card:'A13', distributor:'William',  receptor:'Oliver',   side:'right', endowment:24, dd:12, rd:12, loss:6,  final:6 },
    { card:'A12', distributor:'Phillip',  receptor:'Benjamin', side:'left',  endowment:28, dd:21, rd:7,  loss:14, final:7 },
    { card:'A15', distributor:'Benjamin', receptor:'Phillip',  side:'right', endowment:28, dd:14, rd:14, loss:7,  final:7 },
  ];
  const other = side => side === 'left' ? 'right' : 'left';
  const YELLOW = 'rgb(255, 200, 0)', BLUE = 'rgb(28, 176, 246)';
  async function sideInfo(page, side) {
    const el = page.locator(`[data-testid="character-${side}"]`);
    const box = await el.boundingBox();
    return {
      name: await el.getAttribute('data-name'),
      role: await el.getAttribute('data-role'),
      x: box.x + box.width / 2,
      count: (await page.getByTestId(`coin-count-${side}`).innerText()).trim(),
      border: await el.locator('img').first().evaluate(img => getComputedStyle(img.parentElement).borderTopColor),
    };
  }
  async function checkLayoutCase(c) {
    const tag = `${c.card} ${c.distributor}→${c.receptor}`;
    const dSide = c.side, rSide = other(c.side);
    const left = dSide === 'left' ? c.distributor : c.receptor;
    const right = dSide === 'left' ? c.receptor : c.distributor;
    const attempt = { id:`att-f16-${c.card}`, endowment:c.endowment, distributorDistribution:c.dd, receptorDistribution:c.rd,
      distributorCharacter:c.distributor, receptorCharacter:c.receptor, punishmentLoss:c.loss };

    // --- história: lados, pilha inicial, seta, voo das moedas -------------------
    const s = await openF15(f15Snap({ stage:'JUDGMENT', attempt }));
    const { page } = s;
    await page.getByRole('button', {name:'Ver História'}).click();
    // Registra, quadro a quadro, a posição de cada moeda em voo.
    await page.evaluate(() => {
      window.__flight = [];
      const tick = () => {
        const coins = [...document.querySelectorAll('[data-testid="coin-flight"]')];
        if (coins.length) window.__flight.push(coins.map(el => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }));
        if (window.__flight.length < 2000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await expect(page.getByText('Hora de Dividir',{exact:true})).toBeVisible();

    const L = await sideInfo(page, 'left'), R = await sideInfo(page, 'right');
    assert.equal(L.name, left,  `${tag}: personagem da esquerda`);
    assert.equal(R.name, right, `${tag}: personagem da direita`);
    assert.ok(L.x < R.x, `${tag}: esquerda antes da direita na tela`);
    const D = dSide === 'left' ? L : R, Rc = dSide === 'left' ? R : L;
    assert.equal(D.role, 'distributor'); assert.equal(Rc.role, 'receptor');
    assert.equal(D.border, YELLOW, `${tag}: borda amarela em quem divide`);
    assert.equal(Rc.border, BLUE, `${tag}: borda azul em quem recebe`);
    assert.equal(D.count, String(c.endowment), `${tag}: pilha inicial com quem divide`);
    assert.equal(Rc.count, '0', `${tag}: quem recebe começa sem moedas`);

    const arrow = page.getByTestId('distribution-arrow');
    const direction = await arrow.getAttribute('data-direction');
    const head = await arrow.locator('path').getAttribute('d');
    assert.equal(direction, Rc.x > D.x ? 'right' : 'left', `${tag}: seta aponta de quem divide para quem recebe`);
    assert.ok(direction === 'right' ? head.startsWith('M1 5 L21 5') : head.startsWith('M21 5 L1 5'), `${tag}: desenho da seta (${head})`);

    await expect(page.getByText('Moedas distribuídas...',{exact:true})).toBeVisible({timeout:10000});
    const frames = await page.evaluate(() => window.__flight);
    assert.ok(frames.length > 5, `${tag}: voo das moedas registrado`);
    const first = frames[0], last = frames[frames.length - 1];
    const sign = Math.sign(Rc.x - D.x);
    for (let i = 0; i < last.length; i++) {
      assert.ok(Math.sign(last[i].x - first[i].x) === sign, `${tag}: moeda ${i} voa no sentido da seta`);
    }
    const pile = await page.getByTestId(`coin-pile-${rSide}`).boundingBox();
    for (const p of last) {
      assert.ok(p.x >= pile.x - 3 && p.x <= pile.x + pile.width + 3, `${tag}: moeda pousa na pilha de quem recebe (x=${p.x.toFixed(1)}, pilha ${pile.x.toFixed(1)}–${(pile.x + pile.width).toFixed(1)})`);
    }
    const dAfter = (await sideInfo(page, dSide)).count, rAfter = (await sideInfo(page, rSide)).count;
    assert.equal(dAfter, String(c.dd), `${tag}: quem divide fica com a parte dele`);
    assert.equal(rAfter, String(c.rd), `${tag}: quem recebe fica com a parte dele`);
    await s.context.close();

    // --- punição: a pergunta cita quem divide -----------------------------------
    const pq = await openF15(f15Snap({ stage:'PUNISHMENT', attempt, oj:'Unjust', pj:'Unjust' }));
    await expect(pq.page.getByText(`Você daria 1 das suas moedas para que ${c.distributor} perca ${c.loss === 1 ? '1 moeda' : `${c.loss} moedas`}?`, {exact:true})).toBeVisible();
    await pq.context.close();

    // --- resultado com punição: balão e pilha final em quem dividiu --------------
    const rs = await openF15(f15Snap({
      stage:'RESULT', attempt, oj:'Unjust', op:'Punish', pj:'Unjust', pp:'Punish', ownCoins:79,
      result: { ownIndividualCost:1, ownCoinsAfter:79, punishmentApplied:true,
        distributorResult:{ character:c.distributor, finalCoins:c.final, coinsLost:c.loss }, culturalConsequence:0, groupCoinsAfter:0 },
    }));
    const bubble = rs.page.locator(`[data-testid="character-${dSide}"] [data-testid="distributor-bubble"]`);
    await expect(bubble).toBeVisible();
    await expect(bubble).toContainText(`${c.distributor} perdeu ${c.loss === 1 ? '1 moeda' : `${c.loss} moedas`}`);
    assert.equal(await rs.page.locator(`[data-testid="character-${rSide}"] [data-testid="distributor-bubble"]`).count(), 0, `${tag}: balão só em quem dividiu`);
    assert.equal((await sideInfo(rs.page, dSide)).count, String(c.final), `${tag}: pilha de quem dividiu mostra o que sobrou`);
    assert.equal((await sideInfo(rs.page, rSide)).count, String(c.rd), `${tag}: pilha de quem recebeu não muda`);
    await rs.context.close();

    // --- resultado sem punição: pilha de quem dividiu não muda -------------------
    const np = await openF15(f15Snap({
      stage:'RESULT', attempt, oj:'Just', op:'NoPunish', pj:'Just', pp:'NoPunish',
      result: { ownIndividualCost:0, ownCoinsAfter:80, punishmentApplied:false, distributorResult:null, culturalConsequence:0, groupCoinsAfter:0 },
    }));
    await expect(np.page.getByTestId('distribution-arrow')).toBeVisible();
    assert.equal((await sideInfo(np.page, dSide)).count, String(c.dd), `${tag}: sem punição, quem dividiu mantém ${c.dd}`);
    assert.equal(await np.page.getByTestId('distributor-bubble').count(), 0);
    await np.context.close();
  }
  for (const c of LAYOUT_CASES) await checkLayoutCase(c);
  console.log(`PASS F1.6 disposição na tela: ${LAYOUT_CASES.length} estímulos reais (8 pares × 2 direções) — lados, pilha inicial, seta, voo das moedas, pergunta, balão e pilha final`);

  // ===========================================================================
  // F2: ritmo padronizado em 3 s. Cada etapa da história ("Hora de Dividir",
  // moedas voando, "Moedas distribuídas...") dura 3 s, e o aviso de perda dura
  // 3 s por linha. Mede no navegador quando cada etapa aparece.
  // ===========================================================================
  const STEP_MS = 3000, TOL_MS = 450;
  const near = (got, want, what) => assert.ok(Math.abs(got - want) <= TOL_MS, `${what}: ${got} ms (esperado ${want} ± ${TOL_MS} ms)`);
  {
    const s = await openF15(f15Snap({ stage:'JUDGMENT' }));
    const { page } = s;
    // Marca, no próprio navegador, o instante em que cada etapa fica visível.
    await page.evaluate(() => {
      window.__steps = {};
      const watch = { cue:'Hora de Dividir', flying:'Dividindo...', divided:'Moedas distribuídas...' };
      const tick = () => {
        const text = document.body.innerText;
        for (const [k, t] of Object.entries(watch)) if (!window.__steps[k] && text.includes(t)) window.__steps[k] = performance.now();
        const q = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Justa');
        if (!window.__steps.question && q) window.__steps.question = performance.now();
        if (!window.__steps.question) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole('button', {name:'Ver História'}).click();
    await expect(page.getByRole('button', {name:'Justa',exact:true})).toBeVisible({timeout:15000});
    const st = await page.evaluate(() => window.__steps);
    near(st.flying - st.cue, STEP_MS, '"Hora de Dividir"');
    near(st.divided - st.flying, STEP_MS, 'moedas voando');
    near(st.question - st.divided, STEP_MS, '"Moedas distribuídas..."');
    console.log(`PASS F2 história: Hora de Dividir ${Math.round(st.flying - st.cue)} ms, voo ${Math.round(st.divided - st.flying)} ms, Moedas distribuídas ${Math.round(st.question - st.divided)} ms`);
    await s.context.close();
  }
  // Aviso de perda: 3 s com uma linha, 6 s com as duas. Mede da entrada em
  // RESULT até o botão de avançar aparecer (que espera o aviso terminar).
  for (const { label, ownPunish, partnerPunish, lines } of [
    { label:'uma perda', ownPunish:'Punish', partnerPunish:'NoPunish', lines:1 },
    { label:'duas perdas', ownPunish:'Punish', partnerPunish:'Punish', lines:2 },
  ]) {
    const both = lines === 2;
    const s = await openF15(f15Snap({
      stage:'RESULT', oj:'Unjust', op:ownPunish, pj:'Unjust', pp:partnerPunish, ownCoins:79,
      result:{ ownIndividualCost:1, ownCoinsAfter:79, punishmentApplied:both,
        distributorResult: both ? { character:'Ana', finalCoins:4, coinsLost:4 } : null, culturalConsequence:0, groupCoinsAfter:0 },
    }));
    const { page } = s;
    await expect(page.getByText('Você perdeu 1 moeda',{exact:true})).toBeVisible();
    const shownAt = await page.evaluate(() => performance.now());
    await expect(page.getByRole('button', {name:'Ver a próxima história',exact:true})).toBeVisible({timeout:10000});
    const doneAt = await page.evaluate(() => performance.now());
    // O botão vem logo depois do fim do aviso: só a saída do aviso (~0,3 s) entre os dois.
    const want = LOSS_PER_LINE_MS * lines, got = doneAt - shownAt;
    assert.ok(got >= want - 150 && got <= want + 500, `aviso de perda com ${label}: botão em ${Math.round(got)} ms (esperado entre ${want} e ${want + 500} ms)`);
    console.log(`PASS F2 aviso de perda — ${label}: ${Math.round(doneAt - shownAt)} ms`);
    await s.context.close();
  }
  const stages = { P1: 'WAITING_SESSION', P2: 'WAITING_SESSION' };
  const posts = [];
  let failure = 0;
  const attempt = { id: 'attempt-one', endowment: 12, distributorDistribution: 8, receptorDistribution: 4, distributorCharacter: 'Ana', receptorCharacter: 'Bia', punishmentLoss: 4 };
  const result = { ownIndividualCost: 2, ownCoinsAfter: 73, punishmentApplied: true, distributorResult: {character:'Ana', finalCoins: 3, coinsLost: 5}, culturalConsequence: 7, groupCoinsAfter: 19 };
  function snapshot(slot) {
    return {participant: {id:slot, slot, displayName:slot, participantCode:slot}, session: {id:'fixture',name:'Fixture',status:'IN_PROGRESS'},stage:stages[slot],currentAttempt:['WAITING_SESSION','COMPLETED'].includes(stages[slot])?null:attempt,trialResult:['RESULT','WAITING_RESULT_PARTNER'].includes(stages[slot])?result:null};
  }
  const pages = [];
  for (const slot of ['P1','P2']) {
    const context = await browser.newContext({viewport:{width:768,height:1024}});
    await context.route('**/participant/**', async route => {
      const req = route.request();
      assert.equal(req.headers().authorization, `Bearer fixture-${slot}`);
      if (failure) { const status=failure; failure=0; await route.fulfill({status,json:{error:'fixture error'}}); return; }
      if (req.method()==='POST') {
        const path=new URL(req.url()).pathname;
        const body=req.postDataJSON(); posts.push({slot,path,body});
        if(path.endsWith('/judgment')) {
          assert.ok(['Just','Unjust'].includes(body.judgment));
          stages[slot]='WAITING_JUDGMENT_PARTNER';
          if(Object.values(stages).every(s=>s==='WAITING_JUDGMENT_PARTNER')) stages.P1=stages.P2='PUNISHMENT';
        } else if(path.endsWith('/punishment')) {
          assert.ok(['Punish','NoPunish'].includes(body.punishment));
          stages[slot]='WAITING_PUNISHMENT_PARTNER';
          if(Object.values(stages).every(s=>s==='WAITING_PUNISHMENT_PARTNER')) stages.P1=stages.P2='RESULT';
        } else {
          assert.ok(path.endsWith('/result/acknowledge'));
          stages[slot]='WAITING_RESULT_PARTNER';
          if(Object.values(stages).every(s=>s==='WAITING_RESULT_PARTNER')) stages.P1=stages.P2='COMPLETED';
        }
      }
      await route.fulfill({json:snapshot(slot)});
    });
    const page=await context.newPage(); pages.push(page);
    await page.goto(`http://127.0.0.1:4187/participant#token=fixture-${slot}`);
    await expect(page.getByText('Aguarde a pesquisadora iniciar o jogo.')).toBeVisible();
  }
  const [p1,p2]=pages;
  stages.P1=stages.P2='JUDGMENT';
  await expect(p1.getByRole('button',{name:'Justa',exact:true})).toBeVisible();
  await p1.getByRole('button',{name:'Justa',exact:true}).click();
  await expect(p1.getByText('Resposta enviada!',{exact:false})).toBeVisible();
  await p2.getByRole('button',{name:'Injusta',exact:true}).click();
  await expect(p1.getByRole('button',{name:'Sim',exact:true})).toBeVisible();
  // F1.1: a pergunta usa a perda real da tentativa (8/4 → 4), não um 3 fixo.
  await expect(p1.getByText('Você daria 1 das suas moedas para que Ana perca 4 moedas?')).toBeVisible();
  await expect(p1.getByText('perca 3 moedas',{exact:false})).toHaveCount(0);
  await p1.getByRole('button',{name:'Sim',exact:true}).click();
  await expect(p1.getByText('Resposta enviada!',{exact:false})).toBeVisible();
  await p2.getByRole('button',{name:'Não',exact:true}).click();
  await expect(p1.getByText('73',{exact:true})).toBeVisible();
  await expect(p1.getByText('19',{exact:true})).toBeVisible();
  await expect(p1.getByText('A dupla recebeu 7 moedas nesta história.')).toBeVisible();
  await p1.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(p1.getByText('Aguarde seu parceiro ver o resultado.')).toBeVisible();
  await p2.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(p1.getByText('Você terminou!')).toBeVisible();
  await expect(p2.getByText('Você terminou!')).toBeVisible();
  assert.equal(posts.length,6);
  for(const page of pages) assert.doesNotMatch(await page.locator('body').innerText(), /ABAC|ACAB|rodadas|sequência|condição/i);
  failure=401;
  await p1.reload();
  await expect(p1.getByRole('alert')).toContainText('Este acesso não é válido');
  await p1.getByRole('button',{name:'Tentar novamente'}).click();
  await expect(p1.getByText('Você terminou!')).toBeVisible();
  stages.P1='JUDGMENT';
  await p1.reload();
  await expect(p1.getByRole('button',{name:'Justa',exact:true})).toBeVisible();
  failure=409; stages.P1='PUNISHMENT';
  await p1.getByRole('button',{name:'Justa',exact:true}).click();
  await expect(p1.getByRole('button',{name:'Sim',exact:true})).toBeVisible();
  assert.equal(posts.length,6); // Conflict refreshed state without replaying POST.
  console.log('PASS: two participants, all eight stages, exact server results, six actions, polling, 401, 409, and no experimental metadata.');
} finally {
  await browser?.close();
  await new Promise(resolve=>server.httpServer.close(resolve));
}
