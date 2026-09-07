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
  const stages = { P1: 'WAITING_SESSION', P2: 'WAITING_SESSION' };
  const posts = [];
  let failure = 0;
  const attempt = { id: 'attempt-one', endowment: 12, distributorDistribution: 8, receptorDistribution: 4, distributorCharacter: 'Ana', receptorCharacter: 'Bia' };
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
