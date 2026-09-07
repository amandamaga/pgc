import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = join(__dirname, '../screenshots');

// Criar pasta de screenshots
mkdirSync(OUTPUT_DIR, { recursive: true });

// Definir viewports
const viewports = {
  desktop: { width: 1920, height: 1080, name: 'desktop' },
  tablet: { width: 768, height: 1024, name: 'tablet' },
  mobile: { width: 375, height: 667, name: 'mobile' },
};

// Rotas para capturar
const routes = [
  // Dashboard (Pesquisador)
  { path: '/login', name: 'auth-login', viewport: 'desktop' },
  { path: '/register', name: 'auth-register', viewport: 'desktop' },
  { path: '/', name: 'dashboard-home', viewport: 'desktop' },
  { path: '/participants', name: 'dashboard-participants', viewport: 'desktop' },
  { path: '/experiments/new', name: 'dashboard-create-experiment', viewport: 'desktop' },
  { path: '/experiments/1', name: 'dashboard-experiment-details', viewport: 'desktop' },
  { path: '/experiments/1/sessions', name: 'dashboard-sessions', viewport: 'desktop' },
  { path: '/experiments/1/sessions/1/monitor', name: 'dashboard-session-monitor', viewport: 'desktop' },

  // Game (Participante) - Desktop e Mobile
  { path: '/game-preview', name: 'game-intro', viewport: 'mobile' },
  { path: '/game-preview/waiting', name: 'game-waiting', viewport: 'mobile', wait: 1000 },
  { path: '/game-preview/flow-vertical?round=1', name: 'game-flow-distribute', viewport: 'mobile', wait: 500 },
  { path: '/game-preview/flow-vertical?round=2', name: 'game-flow-justice', viewport: 'mobile', wait: 4500 },
  { path: '/game-preview/end', name: 'game-end', viewport: 'mobile' },
];

async function captureScreenshots() {
  console.log('🎬 Iniciando captura de screenshots...\n');

  const browser = await chromium.launch({ headless: true });

  for (const route of routes) {
    const viewport = viewports[route.viewport] || viewports.desktop;
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });

    const page = await context.newPage();

    try {
      const url = `${BASE_URL}${route.path}`;
      console.log(`📸 Capturando: ${route.name} (${viewport.name})`);
      console.log(`   URL: ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

      // Aguardar tempo extra se especificado (para animações)
      if (route.wait) {
        await page.waitForTimeout(route.wait);
      }

      // Capturar screenshot
      const screenshotPath = join(OUTPUT_DIR, `${route.name}-${viewport.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      console.log(`   ✅ Salvo em: ${screenshotPath}\n`);
    } catch (error) {
      console.error(`   ❌ Erro ao capturar ${route.name}:`, error.message, '\n');
    }

    await context.close();
  }

  await browser.close();
  console.log('✨ Captura concluída! Screenshots salvos em:', OUTPUT_DIR);
}

// Executar
captureScreenshots().catch(console.error);
