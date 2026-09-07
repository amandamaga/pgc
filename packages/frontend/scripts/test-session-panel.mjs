// Isolated browser fixtures: no database access.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,preview:{host:'127.0.0.1',port:4188,strictPort:true}});
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext();
 await context.addInitScript(()=>{localStorage.setItem('researcherToken','fixture-only');localStorage.setItem('researcher','{}');});
 let status=200, calls=0;
 const panel={session:{id:'fixture',name:'Sessão de teste',sequenceVariant:'CBCB',status:'WAITING',startedAt:null,completedAt:null},participants:[],progress:{totalAttempts:0,finalizedAttempts:0,acknowledgedAttempts:0,activeAttemptNumber:null}};
 await context.route('**/sessions/fixture/panel',async route=>{
  calls++; assert.equal(route.request().headers().authorization,'Bearer fixture-only');
  await route.fulfill({status,json:status===200?panel:{error:'Falha controlada'}});
 });
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4188/researcher/sessions/fixture/monitor');
 await expect(page.getByRole('heading',{name:'Sessão de teste'})).toBeVisible();
 await expect(page.getByText('Participante não cadastrado.')).toHaveCount(2);
 panel.session.status='IN_PROGRESS';
 panel.progress={totalAttempts:23,finalizedAttempts:9,acknowledgedAttempts:8,activeAttemptNumber:10};
 panel.participants=[{id:'p1',slot:'P1',displayName:'Teste P1',participantCode:'C1',joinedAt:null,lastSeenAt:null,stage:'WAITING_JUDGMENT_PARTNER'},{id:'p2',slot:'P2',displayName:'Teste P2',participantCode:'C2',joinedAt:null,lastSeenAt:null,stage:'JUDGMENT'}];
 await expect(page.getByText('Aguardando julgamento do parceiro',{exact:true})).toBeVisible();
 await expect(page.getByText('Respondendo justo/injusto',{exact:true})).toBeVisible();
 await expect(page.getByText('23',{exact:true})).toBeVisible();
 assert.ok(calls>=2);
 status=500;
 await expect(page.getByRole('alert')).toContainText('última atualização bem-sucedida');
 await expect(page.getByText('23',{exact:true})).toBeVisible();
 status=200;panel.session.status='COMPLETED';panel.session.completedAt='2026-09-07T12:00:00Z';
 panel.participants.forEach(p=>p.stage='COMPLETED');
 await page.getByRole('button',{name:'Tentar novamente'}).click();
 await expect(page.getByText('Concluído',{exact:true})).toHaveCount(2);
 const completedCalls=calls;
 await page.waitForTimeout(2300);
 assert.equal(calls,completedCalls,'polling must stop on completion');
 status=404;
 await page.getByRole('button',{name:'Atualizar painel'}).click();
 await expect(page.getByRole('alert')).toBeVisible();
 await expect(page.getByText('23',{exact:true})).toHaveCount(0);
 status=401;
 await page.getByRole('button',{name:'Tentar novamente'}).click();
 await expect(page).toHaveURL(/\/login$/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('researcherToken')),null);
 console.log('PASS: real panel route, Bearer, missing participants, polling, backend counts/stages, 500 recovery, completion, 404 and 401.');
} finally {await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));}
