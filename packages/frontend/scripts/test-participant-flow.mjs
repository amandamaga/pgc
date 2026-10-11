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
  // Tempos reais da tela (LOSS_READ_BASE_MS + LOSS_READ_PER_LINE_MS * 1 linha).
  const LOSS_ONE_LINE_MS = 5000 + 2800;
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
    await expect(page.getByText('Moedas distribuídas...',{exact:true})).toBeVisible();
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
