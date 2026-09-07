// Isolated browser fixtures: no database access.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
// Conteúdo servido pelas rotas simuladas: o frontend deve entregá-lo byte a byte.
const RAW_CSV = 'sessionId,attemptNumber,slot,judgment\nfixture,1,P1,Just\nfixture,1,P2,Unjust';
const MODEL_CSV = 'sessionId,attemptNumber,culturalConsequence\nfixture,1,3';
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),configFile:false,preview:{host:'127.0.0.1',port:4189,strictPort:true}});
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({acceptDownloads:true});
 await context.addInitScript(()=>{localStorage.setItem('researcherToken','fixture-only');localStorage.setItem('researcher','{}');});
 // Sessão encerrada: o polling do painel para e não interfere nas exportações.
 const panel={session:{id:'fixture',name:'Sessão de teste',sequenceVariant:'CBCB',status:'COMPLETED',startedAt:'2026-09-07T11:00:00Z',completedAt:'2026-09-07T12:00:00Z'},participants:[],progress:{totalAttempts:24,finalizedAttempts:24,acknowledgedAttempts:24,activeAttemptNumber:null}};
 await context.route('**/sessions/fixture/panel',route=>route.fulfill({status:200,json:panel}));
 let exportStatus=200;
 const seen=[];
 const csvRoute=(body,filename)=>async route=>{
  const headers=route.request().headers();
  seen.push({url:route.request().url(),authorization:headers['authorization'],accept:headers['accept']});
  if(exportStatus!==200){await route.fulfill({status:exportStatus,json:{error:'Falha controlada na exportação'}});return;}
  await route.fulfill({status:200,body,headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${filename}"`,'cache-control':'no-store'}});
 };
 await context.route('**/sessions/fixture/export.csv',csvRoute(RAW_CSV,'session-fixture.csv'));
 await context.route('**/sessions/fixture/export-model.csv',csvRoute(MODEL_CSV,'session-fixture-model.csv'));
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4189/researcher/sessions/fixture/monitor');
 await expect(page.getByRole('heading',{name:'Sessão de teste'})).toBeVisible();
 for(const [label,expectedName,expectedBody] of [
  ['Baixar CSV completo','session-fixture.csv',RAW_CSV],
  ['Baixar CSV para modelagem','session-fixture-model.csv',MODEL_CSV],
 ]){
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:label}).click()]);
  assert.equal(download.suggestedFilename(),expectedName);
  assert.equal(readFileSync(await download.path(),'utf8'),expectedBody,`conteúdo íntegro de ${expectedName}`);
 }
 assert.equal(seen.length,2,'uma requisição por download');
 assert.ok(seen[0].url.endsWith('/sessions/fixture/export.csv'),'primeira rota é export.csv');
 assert.ok(seen[1].url.endsWith('/sessions/fixture/export-model.csv'),'segunda rota é export-model.csv');
 for(const call of seen){
  assert.equal(call.authorization,'Bearer fixture-only');
  assert.ok(call.accept.includes('text/csv'),'exportação deve pedir CSV, não JSON');
 }
 // Erro HTTP não pode ser salvo como se fosse CSV.
 exportStatus=500;
 let downloadedOnError=false;
 page.once('download',()=>{downloadedOnError=true;});
 await page.getByRole('button',{name:'Baixar CSV completo'}).click();
 await expect(page.getByRole('alert')).toContainText('Falha controlada na exportação');
 await page.waitForTimeout(500);
 assert.equal(downloadedOnError,false,'erro HTTP não pode virar download');
 // 401 limpa a autenticação e volta ao login.
 exportStatus=401;
 await page.getByRole('button',{name:'Baixar CSV para modelagem'}).click();
 await expect(page).toHaveURL(/\/login$/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('researcherToken')),null);
 console.log('PASS: both real export routes, Bearer, Accept text/csv, filenames, byte-exact CSV, HTTP error not downloaded, 401 redirect.');
} finally {await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));}
