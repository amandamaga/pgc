import { useState, useEffect, useRef } from "react";
import { translations, PARTICIPANT_LANG } from "../../lib/game-i18n";
import { characterImage } from "../../lib/character-images";
import { stimulusLayout } from "../../lib/character-layout";
import { GameButton } from "../../components/game/game-button";
import { PartnerWaiting } from "../../components/game/partner-waiting";
import { PiggyBankCounter } from "../../components/game/piggy-bank-counter";
import { motion, AnimatePresence } from "motion/react";
import { useGameSounds } from "../../hooks/use-game-sounds";
import { useParticipantState } from "../../hooks/use-participant-state";
import { AUTO_SCREEN_MS } from "../../lib/game-timing";

const SIDEBAR_W = 120;

// Janela de tolerância para considerar o parceiro desconectado. Com o heartbeat
// em todas as telas (HEARTBEAT_INTERVAL_MS = 10 s), secondsSinceSeen não passa
// de ~10 s enquanto o parceiro está com o jogo aberto. O valor ainda é o antigo
// (75 s) de propósito: só deve cair para ~45 s depois que este front, com o
// heartbeat, estiver no ar e testado com dois navegadores.
const PARTNER_DISCONNECT_THRESHOLD_SECONDS = 75;

// Aviso de desconexão do parceiro. Proposta de texto (F2) — confirmar com a
// Luiza. Antes: "{nome} pode ter se desconectado" / "Sem notícias há um tempo.
// Isso volta sozinho assim que a conexão for reestabelecida."
const partnerAwayTitle = (name: string) => `Esperando ${name} voltar`;
const partnerAwayBody = (name: string) =>
  `Parece que ${name} saiu do jogo. Quando voltar, o jogo continua sozinho. Se demorar, chame a pesquisadora.`;

// "1 moedas" aparecia em toda punicao simples; a crianca le esse texto varias
// dezenas de vezes por sessao, entao vale concordar o plural.
const moedas = (n: number) => (n === 1 ? "1 moeda" : `${n} moedas`);

// A pergunta ja diz "voce daria 1 das suas moedas": a confirmacao na hora do
// clique usa o mesmo numero. O valor definitivo vem do servidor no resultado.
const PUNISH_COST_TO_SELF = 1;

// Maior numero de moedas que uma pilha precisa mostrar: no passo "hora de
// dividir" um dos personagens segura o endowment inteiro (ate 32).
const PILE_MAX_DOTS = 32;

// ── Fila de avisos do resultado (itens 4 e 5 da Luiza, 26/10) ───────────────
// Os avisos de uma história entram UM DE CADA VEZ, nesta ordem:
//   own     "Você perdeu 1 moeda"            som "Perdeu" (no clique do SIM)
//   partner "{parceiro} perdeu 1 moeda"      som "Perdeu"
//   bubble  balão "X perdeu N moedas"        sem som (decisão da Amanda, 29/10)
//   end     "Vocês ganharam moedas" + som "Ganhou", ou só o botão
//           "Ver a próxima história" quando a dupla não ganhou moedas
// Cada aviso só entra depois que o anterior ficou NOTICE_GAP_MS na tela,
// contando também o "Você perdeu" mostrado no clique. Nada sai da tela até o
// fim: a janela de ganho abre por cima. Sem nenhuma perda, "end" vem na hora.
// Antes: linhas juntas (0,5 s de intervalo), 3 s por linha e o som "Ganhou"
// 400 ms depois do resultado, antes da janela aparecer.
const NOTICE_GAP_MS = AUTO_SCREEN_MS;
type NoticeKey = "own" | "partner" | "bubble" | "end";
// Sinal de presenca chega a cada ~1 s nas telas de espera e a cada 10 s
// (heartbeat) nas demais: 20 s de folga significa "esta aqui agora".
const PARTNER_PRESENT_THRESHOLD_SECONDS = 20;

// Prelúdio local de cada história: só animação, nada disso vai para o servidor.
// O servidor decide o que perguntar; estes passos decidem quando mostrar.
type Prelude = "intro" | "dividing" | "transferring" | "divided" | "ready";

// ── Ritmo da historia ─────────────────────────────────────────────────────────
// Todos os tempos automaticos do ensaio derivam de AUTO_SCREEN_MS
// (lib/game-timing.ts, 3 s na F2). O publico tem 8-11 anos e nao controla o
// avanco destas etapas: cada uma fica o mesmo tempo na tela.
//
// Tempo que "Hora de Dividir" fica na tela antes das moedas sairem: a crianca
// precisa ler o aviso, mas nao precisa clicar em nada para a divisao acontecer.
const DIVIDE_CUE_MS = AUTO_SCREEN_MS;
// Etapa das moedas voando. O voo ocupa a etapa: cada moeda leva COIN_FLIGHT_MS
// e as saidas se espalham por COIN_FLIGHT_SPREAD_MS, terminando com uma folga
// antes da proxima etapa, independente de quantas moedas o distribuidor passou.
const COIN_TRANSFER_MS = AUTO_SCREEN_MS;
const COIN_LANDING_SLACK_MS = 250;
const COIN_FLIGHT_MS = Math.min(1000, Math.round(COIN_TRANSFER_MS * 0.4));
const COIN_FLIGHT_SPREAD_MS = Math.max(0, COIN_TRANSFER_MS - COIN_FLIGHT_MS - COIN_LANDING_SLACK_MS);
// Pausa com a divisao ja feita ("Moedas distribuidas..."), antes da primeira
// pergunta: e o momento em que a crianca compara as duas pilhas.
const DIVIDED_HOLD_MS = AUTO_SCREEN_MS;

// ── Escala da tela (F2: prioridade para notebook) ───────────────────────────
// Os tamanhos abaixo (retratos, textos, botões) foram desenhados para um
// notebook de 1280×600 úteis (1280×720 com a barra do navegador). Em telas maiores tudo cresce junto, na mesma
// proporção, até UI_SCALE_MAX; em telas menores encolhe um pouco, até
// UI_SCALE_MIN. A altura é o que mais limita (o estado mais alto — punição com
// duas linhas de perda — ocupa ~93% de 600 px), a largura só entra em telas
// estreitas. Os componentes leem a escala via CSS (--ui) com u(px).
const UI_REF_HEIGHT = 600;
const UI_REF_WIDTH = 1100;
const UI_SCALE_MIN = 0.92;
const UI_SCALE_MAX = 1.4;
function computeUiScale(): number {
  if (typeof window === "undefined") return 1;
  const s = Math.min(window.innerHeight / UI_REF_HEIGHT, window.innerWidth / UI_REF_WIDTH);
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, s));
}
function useUiScale(): number {
  const [scale, setScale] = useState(computeUiScale);
  useEffect(() => {
    const onResize = () => setScale(computeUiScale());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}
// Tamanho em px multiplicado pela escala da tela.
const u = (px: number) => `calc(${px}px * var(--ui, 1))`;
// Altura reservada para a área de ação (pergunta, botões, avisos), igual à do
// estado mais alto: pergunta + botões + duas linhas de perda. Com a altura fixa,
// o bloco dos personagens não muda de lugar quando a tela troca de estado.
const ACTION_AREA_MIN_H = 240;

// Pares fora da tabela de disposição: avisa uma vez por par, não a cada render.
const warnedUnknownPairs = new Set<string>();
function warnUnknownPair(distributor: string, receptor: string) {
  const key = `${distributor}|${receptor}`;
  if (warnedUnknownPairs.has(key)) return;
  warnedUnknownPairs.add(key);
  console.warn(`[layout] par não reconhecido: ${distributor} / ${receptor}; quem divide fica à esquerda.`);
}

// ── Coin dot ──────────────────────────────────────────────────────────────────
function CoinDot({ size = 8 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        backgroundColor: "#FFD900", border: "1px solid #CE9200", flexShrink: 0,
      }}
    />
  );
}

// ── Coin dot grid (4-col) ─────────────────────────────────────────────────────
function CoinDotGrid({ count, maxDots = 12, dotSize = 7, cols = 4, gap = 2 }: {
  count: number; maxDots?: number; dotSize?: number; cols?: number; gap?: number;
}) {
  const active = Math.min(count, maxDots);
  if (active <= 0) return null;
  // Desenha so os pontos que existem. Com placeholders invisiveis ocupando as
  // celulas, uma pilha de 3 moedas ficava encostada a esquerda de um bloco
  // largo e vazio, deslocada do personagem a que pertence.
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(cols, active)}, ${dotSize}px)`,
        gap,
        justifyContent: "center",
      }}
    >
      {Array.from({ length: active }, (_, i) => (
        <CoinDot key={i} size={dotSize} />
      ))}
    </div>
  );
}

// ── Sidebar coins ─────────────────────────────────────────────────────────────
// Pilha individual de cada criança. Cada uma começa com 80 moedas e só perde
// (experiment.rules.ts: p1Coins/p2Coins só diminuem), então 80 é o máximo.
//
// Item 12 da Luiza (26/10): a pilha fica apoiada EMBAIXO e o espaço vazio
// cresce no topo, logo abaixo da faixa amarela. Número, "moedas" e nome ficam
// sempre no mesmo lugar, e no mesmo lugar dos dois lados, o jogo inteiro.
// Antes a pilha ficava no topo e o número subia conforme ela encolhia.
//
// Tamanho da bolinha (decisão da Amanda, 29/10): o maior que deixa as 80
// caberem na altura disponível, até SIDEBAR_DOT_MAX (o tamanho de antes).
// Calculado sempre para as 80, nunca para o saldo atual: o tamanho não muda
// enquanto a pilha encolhe, só se a janela mudar de altura. Os dois lados têm a
// mesma altura, então chegam ao mesmo tamanho.
const SIDEBAR_MAX_COINS = 80;
const SIDEBAR_COLS = 4;
const SIDEBAR_DOT_MAX = 16;
const SIDEBAR_DOT_MIN = 6;
// Espaço entre bolinhas proporcional ao tamanho delas (4 px com 16 px).
const sidebarGap = (dot: number) => Math.max(2, Math.round(dot / 4));

function fitSidebarDot(availableHeight: number): number {
  const rows = Math.ceil(SIDEBAR_MAX_COINS / SIDEBAR_COLS);
  for (let dot = SIDEBAR_DOT_MAX; dot > SIDEBAR_DOT_MIN; dot--) {
    if (rows * dot + (rows - 1) * sidebarGap(dot) <= availableHeight) return dot;
  }
  return SIDEBAR_DOT_MIN;
}

function SidebarCoins({ count, label, flash = false, align = "left" }: {
  count: number; label: string; flash?: boolean; align?: "left" | "right";
}) {
  // Altura livre para a pilha: tudo o que sobra na barra acima do número.
  const pileAreaRef = useRef<HTMLDivElement>(null);
  const [dot, setDot] = useState(SIDEBAR_DOT_MAX);
  useEffect(() => {
    const el = pileAreaRef.current;
    if (!el) return;
    const measure = () => setDot(fitSidebarDot(el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      className="h-full flex flex-col items-center px-5 pt-4 pb-4 overflow-hidden"
      data-testid={`sidebar-${align}`}
      style={{
        width: SIDEBAR_W, flexShrink: 0,
        backgroundColor: "rgba(245,240,232,0.6)",
        borderRight: align === "left" ? "1.5px dashed #DDD8CE" : undefined,
        borderLeft: align === "right" ? "1.5px dashed #DDD8CE" : undefined,
      }}
      animate={flash ? { backgroundColor: ["rgba(255,75,75,0.05)", "rgba(255,75,75,0.25)", "rgba(245,240,232,0.6)"] } : {}}
      transition={{ duration: 0.5 }}
    >
      {/* Área da pilha: ocupa todo o espaço livre e encosta a pilha embaixo. */}
      <div ref={pileAreaRef} className="flex-1 min-h-0 w-full flex flex-col items-center justify-end overflow-hidden">
        {/* scaleY(-1) vira a grade de cabeça para baixo: a última moeda desenhada
            fica no TOPO, então gastar uma moeda esvazia a pilha de cima para
            baixo, como a retirada física (item 6 da Luiza, 07/10). As bolinhas
            são círculos, então o espelhamento não muda o desenho de cada uma. */}
        <div aria-hidden data-testid={`sidebar-pile-${align}`} style={{ transform: "scaleY(-1)" }}>
          <CoinDotGrid count={count} maxDots={SIDEBAR_MAX_COINS} dotSize={dot} cols={SIDEBAR_COLS} gap={sidebarGap(dot)} />
        </div>
      </div>
      {/* Número e rótulos com altura fixa: não se mexem quando a pilha muda. */}
      <div className="flex flex-col items-center flex-shrink-0 pt-3" style={{ gap: 6 }}>
        <span className="font-nunito font-black" data-testid={`sidebar-count-${align}`}
          style={{ fontSize: 28, color: "#58CC02", lineHeight: 1 }}>
          {count}
        </span>
        {/* "moedas" por extenso embaixo das pilhas individuais (item 1). */}
        <span className="font-nunito font-bold" style={{ fontSize: 13, color: "#8A7A52", lineHeight: 1.25 }}>
          {count === 1 ? "moeda" : "moedas"}
        </span>
        {/* Sempre duas linhas reservadas para o nome, nos dois lados: um nome
            comprido do parceiro quebra em duas linhas sem empurrar o número
            daquele lado para cima. Mais de duas linhas é cortado. */}
        <span className="font-nunito font-bold uppercase text-center"
          style={{
            fontSize: 13, color: "#8A7A52", letterSpacing: 1, lineHeight: 1.25,
            height: "2.5em", overflow: "hidden", overflowWrap: "anywhere",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
          {label}
        </span>
      </div>
    </motion.div>
  );
}

// ── Character circle ──────────────────────────────────────────────────────────
function CharacterCircle({ name, size = 44, isDistributor = false }: {
  name: string; size?: number; isDistributor?: boolean;
}) {
  const src = characterImage(name);
  // Amarelo para quem divide, azul para quem recebe — o papel deixa de depender
  // so da seta, como pede a especificacao do protocolo.
  const borderColor = isDistributor ? "#FFC800" : "#1CB0F6";
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: "50%", overflow: "hidden",
        backgroundColor: src ? "#FFFFFF" : "#1CB0F6",
        border: `3px solid ${borderColor}`,
      }}
    >
      {src ? (
        // alt vazio de proposito: o nome ja aparece como texto logo abaixo.
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span className="font-nunito font-black text-white text-center px-1" style={{ fontSize: size >= 50 ? 11 : 9, lineHeight: 1 }}>
          {name}
        </span>
      )}
    </div>
  );
}

// ── Character block ───────────────────────────────────────────────────────────
function CharacterBlock({
  nameA, nameB, coinA, coinB, distributorIsA, circleSize = 44, bubble,
  transferring = false, transferCount = 0,
}: {
  nameA: string; nameB: string; coinA: number; coinB: number;
  distributorIsA: boolean; circleSize?: number; bubble?: string | null;
  transferring?: boolean; transferCount?: number;
}) {
  // Tudo no bloco escala a partir do retrato: mudar circleSize redimensiona
  // moedas, numeros, nomes e seta juntos, sem numeros magicos espalhados.
  const k = circleSize / 44;
  const px = (n: number) => Math.round(n * k);

  // A pilha e sempre de 2 colunas, mas so enquanto couber ao lado do retrato.
  // Com 18 moedas em 2 colunas seriam 9 fileiras, mais altas que o personagem, e
  // a pilha vazava o cartao por cima do nome. A partir dai ela ganha colunas em
  // vez de altura: a altura fica travada na do retrato e a largura cresce para o
  // centro, onde ha espaco sobrando.
  const pileDot = px(5);
  const pileGap = px(2);
  const pileMaxRows = Math.max(2, Math.floor((circleSize + pileGap) / (pileDot + pileGap)));
  // Teto de 5 colunas: com 6 a pilha do endowment cheio (32) passaria do vao ate
  // a seta. Em 5 ela ganha uma fileira a mais que o retrato, o que o padding do
  // cartao absorve.
  const pileCols = (n: number) =>
    Math.min(5, Math.max(2, Math.ceil(Math.min(n, PILE_MAX_DOTS) / pileMaxRows)));

  // O voo das moedas e medido do DOM em vez de calculado a mao: assim ele
  // continua certo se o tamanho do retrato, a pilha ou o espacamento mudarem.
  const rowRef = useRef<HTMLDivElement>(null);
  const pileARef = useRef<HTMLDivElement>(null);
  const pileBRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<{ x0: number; y0: number; x1: number; y1: number }[]>([]);

  useEffect(() => {
    if (!transferring || transferCount <= 0) { setFlight([]); return; }
    // Saem da pilha de quem divide e pousam na de quem recebe, seja qual for o
    // lado de cada um no cartão.
    const row = rowRef.current;
    const from = distributorIsA ? pileARef.current : pileBRef.current;
    const to = distributorIsA ? pileBRef.current : pileARef.current;
    if (!row || !from || !to) return;

    const r = row.getBoundingClientRect();
    const rf = from.getBoundingClientRect();
    const rt = to.getBoundingClientRect();

    const dot = pileDot, gap = pileGap;
    const n = Math.min(transferCount, PILE_MAX_DOTS);
    // Mesmo número de colunas que a CoinDotGrid vai desenhar no destino.
    const cols = Math.min(pileCols(n), n);
    const rows = Math.ceil(n / cols);
    const width = cols * dot + (cols - 1) * gap;
    // A pilha do lado esquerdo é ancorada pela borda esquerda (cresce para a
    // direita, rumo ao centro); a do lado direito, pela borda direita (cresce
    // para a esquerda). Nas duas, o centro vertical é o do retrato.
    const toLeft = distributorIsA ? rt.left - r.left - width : rt.left - r.left;
    const toTop = rt.top - r.top - (rows * dot + (rows - 1) * gap) / 2;
    // Saem do meio da pilha do distribuidor.
    const fromCx = rf.left - r.left + rf.width / 2 - dot / 2;
    const fromCy = rf.top - r.top + rf.height / 2 - dot / 2;

    setFlight(Array.from({ length: n }, (_, i) => ({
      x0: fromCx, y0: fromCy,
      x1: toLeft + (i % cols) * (dot + gap),
      y1: toTop + Math.floor(i / cols) * (dot + gap),
    })));
  }, [transferring, transferCount, circleSize, distributorIsA]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center" style={{ gap: px(6) }}>
      <div ref={rowRef} className="flex items-start" style={{ gap: px(42), position: "relative" }}>
        {/* Lado A (esquerda do cartão) */}
        <div className="flex flex-col items-center gap-0.5"
          data-testid="character-left" data-name={nameA}
          data-role={distributorIsA ? "distributor" : "receptor"}>
          <div style={{ position: "relative" }}>
            <AnimatePresence>
              {distributorIsA && bubble && (
                <motion.div
                  key="bubble-a"
                  data-testid="distributor-bubble"
                  initial={{ opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 rounded-xl"
                  style={{
                    padding: `${px(2)}px ${px(4)}px`,
                    backgroundColor: "#FFF0F0", border: "2px solid #FF4B4B",
                    position: "absolute", bottom: "calc(100% - 12px)", left: 0,
                    zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: px(6) }}>❌</span>
                  <span className="font-nunito font-black" style={{ fontSize: px(7), color: "#CC0000" }}>{bubble}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <CharacterCircle name={nameA} size={circleSize} isDistributor={distributorIsA} />
            {/* Moedas a direita do retrato, viradas para o centro do cartao.
                Absolutas de proposito: assim nao deslocam o nome, que segue
                centralizado sob o personagem. */}
            <div
              style={{
                position: "absolute", left: `calc(100% + ${px(8)}px)`,
                top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
              }}
              ref={pileARef}
              data-testid="coin-pile-left"
            >
              <CoinDotGrid count={coinA} maxDots={PILE_MAX_DOTS} dotSize={pileDot}
                cols={pileCols(coinA)} gap={pileGap} />
            </div>
          </div>
          {/* px(6)→px(8) e px(9)→px(11): frases e números maiores sob os
              personagens (item 3 da Luiza, 07/10). */}
          <span className="font-nunito font-bold" style={{ fontSize: px(8), color: "#3C3C3C" }}>{nameA}</span>
          <span className="font-nunito font-black" style={{ fontSize: px(11), color: "#58CC02", lineHeight: 1 }}
            data-testid="coin-count-left">
            {coinA}
          </span>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0" style={{ marginTop: Math.round(circleSize / 2) - px(5) }}>
          <svg width={px(22)} height={px(10)} viewBox="0 0 22 10" fill="none"
            data-testid="distribution-arrow" data-direction={distributorIsA ? "right" : "left"}>
            <path
              d={distributorIsA
                ? "M1 5 L21 5 M15 1.5 L21 5 L15 8.5"
                : "M21 5 L1 5 M7 1.5 L1 5 L7 8.5"}
              stroke="#1CB0F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Lado B (direita do cartão) */}
        <div className="flex flex-col items-center gap-0.5"
          data-testid="character-right" data-name={nameB}
          data-role={distributorIsA ? "receptor" : "distributor"}>
          <div style={{ position: "relative" }}>
            <AnimatePresence>
              {!distributorIsA && bubble && (
                <motion.div
                  key="bubble-b"
                  data-testid="distributor-bubble"
                  initial={{ opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 rounded-xl"
                  style={{
                    padding: `${px(2)}px ${px(4)}px`,
                    backgroundColor: "#FFF0F0", border: "2px solid #FF4B4B",
                    position: "absolute", bottom: "calc(100% - 12px)", right: 0,
                    zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: px(6) }}>❌</span>
                  <span className="font-nunito font-black" style={{ fontSize: px(7), color: "#CC0000" }}>{bubble}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <CharacterCircle name={nameB} size={circleSize} isDistributor={!distributorIsA} />
            {/* Espelhado do lado A: as moedas ficam a esquerda do retrato. */}
            <div
              style={{
                position: "absolute", right: `calc(100% + ${px(8)}px)`,
                top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
              }}
              ref={pileBRef}
              data-testid="coin-pile-right"
            >
              <CoinDotGrid count={coinB} maxDots={PILE_MAX_DOTS} dotSize={pileDot}
                cols={pileCols(coinB)} gap={pileGap} />
            </div>
          </div>
          <span className="font-nunito font-bold" style={{ fontSize: px(8), color: "#3C3C3C" }}>{nameB}</span>
          <span className="font-nunito font-black" style={{ fontSize: px(11), color: "#58CC02", lineHeight: 1 }}
            data-testid="coin-count-right">
            {coinB}
          </span>
        </div>

        {/* Moedas em voo: saem da pilha do distribuidor e pousam exatamente
            onde a pilha do receptor vai aparecer, em qualquer direção. */}
        <AnimatePresence>
          {transferring && flight.map((f, i) => (
            <motion.div
              key={`fly-${i}`}
              data-testid="coin-flight"
              initial={{ x: f.x0, y: f.y0, opacity: 0, scale: 0.5 }}
              animate={{
                x: f.x1,
                y: [f.y0, Math.min(f.y0, f.y1) - px(16), f.y1],
                opacity: [0, 1, 1],
                scale: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: COIN_FLIGHT_MS / 1000,
                delay: (i * (COIN_FLIGHT_SPREAD_MS / Math.max(flight.length, 1))) / 1000,
                ease: "easeInOut",
                times: [0, 0.5, 1],
              }}
              style={{ position: "absolute", left: 0, top: 0, zIndex: 20, pointerEvents: "none" }}
            >
              <CoinDot size={px(5)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Avatar seal ───────────────────────────────────────────────────────────────
function AvatarSeal({ label, color }: { label: string; color: string }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 20 }}
      className="inline-flex items-center font-nunito font-black uppercase rounded-full"
      // Fonte 8→11 (item 3 da Luiza, 07/10: aumentar o nome dos participantes
      // em cima dos botões de escolha).
      style={{
        backgroundColor: color, color: "white",
        fontSize: 11, padding: "3px 8px",
        border: "1.5px solid rgba(255,255,255,0.35)",
        letterSpacing: 0.5, lineHeight: 1.8, flexShrink: 0,
      }}
    >
      {label}
    </motion.span>
  );
}

// ── Decision card ─────────────────────────────────────────────────────────────
type BtnDef = { value: string; label: string; bg: string; border: string };

function DecisionCard({
  question, buttons, playerChoice, partnerChoice,
  onChoose, partnerName, topButton, footer, disabled = false,
}: {
  question: string;
  buttons: [BtnDef, BtnDef];
  playerChoice: string | null;
  partnerChoice: string | null;
  onChoose: (value: string) => void;
  partnerName: string;
  topButton?: React.ReactNode;
  // Espaco logo abaixo dos botoes: e ali que a crianca olha depois de escolher,
  // entao o resultado da escolha aparece nesse lugar em vez de num modal.
  footer?: React.ReactNode;
  disabled?: boolean;
}) {
  const playerAnswered = playerChoice !== null;
  const partnerAnswered = partnerChoice !== null;
  const locked = playerAnswered || disabled;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="flex flex-col gap-2"
    >
      {topButton}

      <div className="rounded-2xl px-6 py-4" style={{ backgroundColor: "#F2F2F2", border: "2px solid #E0E0E0" }}>
        <p className="font-nunito font-black text-center leading-snug" style={{ fontSize: u(23), color: "#3C3C3C" }}>
          {question}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {buttons.map((btn) => {
          const playerHere = playerChoice === btn.value;
          const partnerHere = partnerChoice === btn.value;
          const neitherHere = !playerHere && !partnerHere;
          const opacity = playerAnswered && neitherHere ? 0.3 : 1;

          return (
            <button
              key={btn.value}
              onClick={() => !locked && onChoose(btn.value)}
              disabled={locked}
              className="font-nunito font-black uppercase text-white flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: btn.bg,
                border: `2px solid ${btn.border}`,
                borderBottom: `4px solid ${btn.border}`,
                borderRadius: 12,
                padding: `${u(12)} 8px`,
                fontSize: u(19),
                opacity,
                cursor: locked ? "default" : "pointer",
                transition: "opacity 0.2s",
                minHeight: u(54),
              }}
            >
              {btn.label}
              <AnimatePresence>
                {playerHere && <AvatarSeal key="V" label="VOCÊ" color="#46A302" />}
                {partnerHere && <AvatarSeal key="M" label={partnerName.toUpperCase()} color="#1CB0F6" />}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {!partnerAnswered && playerAnswered && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-1.5"
          >
            <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
              <circle cx="6" cy="4.5" r="2.8" fill="#AFA99A" />
              <path d="M0.5 12.5 Q0.5 8.5 6 8.5 Q11.5 8.5 11.5 12.5" stroke="#AFA99A" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            </svg>
            <span className="font-nunito font-bold" style={{ fontSize: u(14), color: "#AFA99A" }}>
              {partnerName} respondendo
            </span>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1CB0F6" }}
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {footer}
    </motion.div>
  );
}

// ── Linha de perda ────────────────────────────────────────────────────────────
function LossRow({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2.5 rounded-xl px-4 py-2"
      style={{ backgroundColor: "#FFF0F0", border: "2px solid #FFCDD2" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF4B4B" opacity="0.15" />
        <path d="M12 7v5" stroke="#CC0000" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.2" fill="#CC0000" />
      </svg>
      <span className="font-nunito font-black" style={{ fontSize: u(18), color: "#CC0000" }}>
        {msg}
      </span>
    </motion.div>
  );
}

// ── Aviso de perda de moedas ──────────────────────────────────────────────────
// Fica embaixo dos botoes, no fluxo da tela: a crianca ve o que aconteceu sem
// perder de vista a escolha que acabou de fazer. So as linhas de perda -- um
// titulo "Punicao aplicada" por cima delas seria dizer duas vezes a mesma coisa.
// Cada linha entra quando a fila de avisos a libera (NOTICE_GAP_MS); a chave
// estável faz só a linha nova animar, sem redesenhar as que já estavam.
function LossFeedback({ lines }: { lines: { key: string; msg: string }[] }) {
  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
      <AnimatePresence>
        {lines.map((line) => (
          <LossRow key={line.key} msg={line.msg} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Ganho da dupla ────────────────────────────────────────────────────────────
// Modal em vez de tela cheia: o tabuleiro continua visivel atras, entao a crianca
// ve que o ganho veio da historia que ainda esta na tela, e nao de um lugar novo.
// Avisa quem o desenhou assim que entra na tela (uma vez por montagem). Usado
// para registrar nextStoryAvailableAt no momento em que o botão existe.
function MountSignal({ onMount }: { onMount: () => void }) {
  useEffect(() => { onMount(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function GroupRewardModal({ amount, piggyBank, onContinue, onButtonShown, disabled = false }: {
  amount: number; piggyBank: number; onContinue: () => void; onButtonShown: () => void; disabled?: boolean;
}) {
  return (
    <motion.div
      key="group-reward"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(15,15,15,0.5)", backdropFilter: "blur(2px)" }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 28, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="rounded-3xl flex flex-col items-center text-center gap-4 px-8 py-7"
        style={{ width: "100%", maxWidth: u(380), backgroundColor: "#58CC02", boxShadow: "0 6px 0 #3A9200" }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 14 }}
        >
          <svg viewBox="0 0 64 64" fill="none" style={{ width: u(64), height: u(64) }}>
            <path d="M20 8 H44 V34 Q44 54 32 56 Q20 54 20 34 Z" fill="#F5C400" stroke="#CE9200" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M8 10 Q8 28 20 33" stroke="#CE9200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M56 10 Q56 28 44 33" stroke="#CE9200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="28" y="56" width="8" height="4" fill="#CE9200" />
            <rect x="18" y="60" width="28" height="4" rx="2" fill="#CE9200" />
          </svg>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="font-nunito font-black text-white" style={{ fontSize: u(24), lineHeight: 1.3 }}
        >
          Vocês ganharam moedas! +{amount}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex justify-center gap-3"
        >
          {Array.from({ length: amount }, (_, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.42 + i * 0.1, type: "spring" }}>
              <div style={{ width: u(32), height: u(32), borderRadius: "50%", backgroundColor: "#FFD900", border: "2px solid #CE9200" }} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="rounded-2xl px-6 py-2.5" style={{ backgroundColor: "white" }}
        >
          <p className="font-nunito font-bold" style={{ color: "#1CB0F6", fontSize: u(16) }}>
            Moedas do grupo: {piggyBank}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          style={{ width: "100%", maxWidth: u(300) }}
        >
          <MountSignal onMount={onButtonShown} />
          <button
            onClick={onContinue}
            disabled={disabled}
            className="w-full font-nunito font-black rounded-2xl py-3"
            style={{
              backgroundColor: "#FFD900", color: "#7A5800",
              border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: u(18),
              opacity: disabled ? 0.6 : 1,
            }}
          >
            Ver a próxima história
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Tela cheia simples (espera, fim, erro) ────────────────────────────────────
function FullScreenNotice({ title, message, action }: {
  title: string; message?: string; action?: React.ReactNode;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: "#F5F2EB" }}>
      <h2 className="font-nunito font-black" style={{ fontSize: 20, color: "#3C3C3C" }}>{title}</h2>
      {message && <p className="font-nunito font-bold" style={{ fontSize: 14, color: "#8B8B8B" }}>{message}</p>}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FFD900" }}
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
      {action}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ExperimentFlowVertical({ token }: { token: string }) {
  const {
    state, error, isLoading, isSubmitting,
    storyShownStatus, nextStoryAvailableStatus,
    refresh, submitJudgment, submitPunishment, acknowledgeResult,
    markStoryShown, markNextStoryAvailable,
  } = useParticipantState(token);
  const ui = useUiScale();

  const T = translations[PARTICIPANT_LANG];
  const { playCulturantSound, playPunishmentSound } = useGameSounds();

  const stage = state?.stage;
  const attempt = state?.currentAttempt ?? null;
  const result = state?.trialResult ?? null;
  const partner = state?.partner ?? null;
  const own = state?.own ?? null;
  const balances = state?.balances ?? null;
  const partnerName = partner?.displayName ?? "seu parceiro";
  const ownName = state?.participant?.displayName?.trim() ?? "";
  const attemptId = attempt?.id ?? null;

  // "Parceiro desconectado": só aparece enquanto EU estou esperando por ele —
  // no meu próprio turno o aviso atrapalharia a resposta sem que eu possa fazer
  // nada. Some sozinho quando secondsSinceSeen volta a ficar abaixo da janela.
  const waitingForPartner = stage === "WAITING_JUDGMENT_PARTNER" || stage === "WAITING_PUNISHMENT_PARTNER" || stage === "WAITING_RESULT_PARTNER";

  // "Chegou" = fez polling agora há pouco, ou seja, já apertou COMEÇAR e está
  // dentro do jogo. Enquanto ele ainda está na tela de nome, ninguém o viu.
  const partnerPresent = partner?.secondsSinceSeen != null
    && partner.secondsSinceSeen <= PARTNER_PRESENT_THRESHOLD_SECONDS;
  const [partnerEverSeen, setPartnerEverSeen] = useState(false);
  useEffect(() => {
    if (partnerPresent) setPartnerEverSeen(true);
  }, [partnerPresent]);

  // Só desconecta quem chegou: sem esta trava, quem ainda está digitando o nome
  // aparece como "desconectado" para o outro, que é o caso mais comum na coleta.
  const partnerDisconnected = waitingForPartner
    && partnerEverSeen
    && partner?.secondsSinceSeen != null
    && partner.secondsSinceSeen > PARTNER_DISCONNECT_THRESHOLD_SECONDS;

  const [prelude, setPrelude] = useState<Prelude>("intro");
  // Tentativa a que o prelúdio atual pertence. No primeiro render de uma
  // história nova o `prelude` ainda é o da anterior (o reset vem no efeito
  // abaixo); sem esta marca, um "ready" velho dispararia o story-shown cedo.
  const [preludeAttemptId, setPreludeAttemptId] = useState<string | null>(null);
  const [coinLostFlash, setCoinLostFlash] = useState(false);

  // Fila de avisos (ver NoticeKey): quando cada aviso desta história entrou na
  // tela (Date.now()). O estado desenha; o ref é lido pelo efeito da fila sem
  // depender de render. Zera a cada história nova.
  const [noticeShownAt, setNoticeShownAt] = useState<Partial<Record<NoticeKey, number>>>({});
  const noticeShownAtRef = useRef<Partial<Record<NoticeKey, number>>>({});
  const showNotice = (key: NoticeKey) => {
    if (noticeShownAtRef.current[key] != null) return false;
    const at = Date.now();
    noticeShownAtRef.current = { ...noticeShownAtRef.current, [key]: at };
    setNoticeShownAt(noticeShownAtRef.current);
    return true;
  };

  // Clique único entre histórias (F2): o "Ver a próxima história" do resultado
  // já é o clique que inicia a história seguinte. Marca que esta criança
  // avançou a partir de um resultado; a próxima tentativa começa direto na
  // divisão, sem o botão "Ver História". Esse botão continua só onde não houve
  // clique anterior: primeira história da sessão e volta depois de um refresh.
  // Nenhum marco de tempo depende do botão "Ver História" (ele nunca foi ao
  // servidor): resultAcknowledgedAt continua no clique do resultado e
  // storyShownAt no fim do prelúdio.
  const advancedFromResult = useRef(false);
  const advanceToNextStory = () => {
    advancedFromResult.current = true;
    void acknowledgeResult();
  };

  // Cada história nova recomeça o prelúdio. Se a criança já respondeu (voltou
  // depois de um refresh), pula direto para a pergunta.
  useEffect(() => {
    if (!attemptId) return;
    const startDirectly = advancedFromResult.current;
    advancedFromResult.current = false;
    setPrelude(own?.judgment ? "ready" : startDirectly ? "dividing" : "intro");
    setPreludeAttemptId(attemptId);
    noticeShownAtRef.current = {};
    setNoticeShownAt({});
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Hora de Dividir" e so um aviso: a divisao comeca sozinha.
  useEffect(() => {
    if (prelude !== "dividing") return;
    const t = setTimeout(() => setPrelude("transferring"), DIVIDE_CUE_MS);
    return () => clearTimeout(t);
  }, [prelude]);

  // O voo das moedas termina sozinho e entrega o estado ja dividido.
  useEffect(() => {
    if (prelude !== "transferring") return;
    const t = setTimeout(() => setPrelude("divided"), COIN_TRANSFER_MS);
    return () => clearTimeout(t);
  }, [prelude]);

  // "Moedas distribuídas..." segura antes da pergunta.
  useEffect(() => {
    if (prelude !== "divided") return;
    const t = setTimeout(() => setPrelude("ready"), DIVIDED_HOLD_MS);
    return () => clearTimeout(t);
  }, [prelude]);

  const earnedCoins = (result?.culturalConsequence ?? 0) > 0;

  // ── Fila de avisos do resultado ────────────────────────────────────────────
  // Quais avisos esta história tem, na ordem em que entram. As linhas de perda
  // são só as da dupla; a perda do personagem que dividiu vai no balão sobre o
  // retrato dele (bubble), e não se repete embaixo.
  const isResult = stage === "RESULT" && !!result;
  const resultNotices: NoticeKey[] = [];
  if (isResult) {
    if (result.ownIndividualCost > 0) resultNotices.push("own");
    if (partner?.punishment === "Punish") resultNotices.push("partner");
    if (result.distributorResult) resultNotices.push("bubble");
    resultNotices.push("end");
  }
  const resultNoticesKey = resultNotices.join(",");

  // Agenda os avisos que ainda não apareceram: cada um NOTICE_GAP_MS depois do
  // mais recente que já está na tela (inclusive o "Você perdeu" do clique).
  // Recalcula a partir dos horários guardados, então rodar de novo (StrictMode,
  // novo render) continua do ponto em que estava, sem repetir aviso nem som.
  useEffect(() => {
    if (!isResult || !attemptId) return;
    const keys = resultNoticesKey.split(",") as NoticeKey[];
    const shown = noticeShownAtRef.current;
    const now = Date.now();
    let last: number | null = null;
    for (const k of keys) {
      const at = shown[k];
      if (at != null) last = last == null ? at : Math.max(last, at);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const k of keys) {
      if (shown[k] != null) continue;
      const appearAt: number = last == null ? now : Math.max(now, last + NOTICE_GAP_MS);
      timers.push(setTimeout(() => {
        if (!showNotice(k)) return;
        // Som de cada aviso, tocado quando ele entra. O balão não tem som.
        if (k === "own" || k === "partner") playPunishmentSound();
        if (k === "end" && earnedCoins) playCulturantSound();
      }, appearAt - now));
      last = appearAt;
    }
    return () => timers.forEach(clearTimeout);
  }, [isResult, attemptId, resultNoticesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Linhas de perda que já estão na tela. "Você perdeu" entra no clique do SIM
  // com o custo fixo da pergunta; no resultado usa o valor do servidor.
  const lossLines: { key: string; msg: string }[] = [];
  if (noticeShownAt.own != null) {
    lossLines.push({ key: "own", msg: `Você perdeu ${moedas(isResult ? result.ownIndividualCost : PUNISH_COST_TO_SELF)}` });
  }
  if (noticeShownAt.partner != null && partner?.punishment === "Punish") {
    lossLines.push({ key: "partner", msg: `${partnerName} perdeu ${moedas(1)}` });
  }

  // Fim da fila: "Ver a próxima história" passa a existir (na janela de ganho
  // ou sozinho). Sem nenhuma perda, a fila é só "end" e o botão vem na hora,
  // sem esperar o efeito acima (que ainda registra o horário e toca o som).
  const onlyEndNotice = resultNoticesKey === "end";
  const resultFeedbackDone = isResult && !!attemptId
    && (noticeShownAt.end != null || onlyEndNotice);

  // storyShownAt: a história completa (divisão final) está na tela e a criança
  // já pode julgá-la. Não vale no "Ver história" nem durante a animação; e se
  // ela já julgou (voltou depois de um refresh), não se cria registro tardio.
  const storyReadyToJudge = stage === "JUDGMENT" && !!attemptId
    && preludeAttemptId === attemptId && prelude === "ready" && !own?.judgment;
  useEffect(() => {
    if (storyReadyToJudge && storyShownStatus === "idle") void markStoryShown();
  }, [storyReadyToJudge, storyShownStatus, markStoryShown]);

  // nextStoryAvailableAt: o avanço acabou de ficar disponível para esta criança.
  // Dispara quando o botão "Ver a próxima história" entra na tela (MountSignal
  // dentro dos dois botões), e não no fim da fila: sem ganho, o botão ainda
  // espera ~0,3 s a saída do cartão da pergunta, e o marco saía antes dele.
  const [advanceButtonFor, setAdvanceButtonFor] = useState<string | null>(null);
  const onAdvanceButtonShown = () => setAdvanceButtonFor(attemptId);
  const advanceButtonShown = resultFeedbackDone && advanceButtonFor === attemptId;
  useEffect(() => {
    if (advanceButtonShown && nextStoryAvailableStatus === "idle") void markNextStoryAvailable();
  }, [advanceButtonShown, nextStoryAvailableStatus, markNextStoryAvailable]);

  // Os botões só respondem depois que o servidor confirmou o respectivo marco.
  const judgmentBlocked = !own?.judgment && storyShownStatus !== "done";
  const advanceBlocked = nextStoryAvailableStatus !== "done";

  // ── Estados que ocupam a tela inteira ──────────────────────────────────────
  if (error) {
    return <FullScreenNotice
      title="Não consegui falar com o jogo"
      message={error}
      action={<GameButton onClick={() => void refresh()}>Tentar de novo</GameButton>}
    />;
  }
  if (isLoading || !state || !balances) {
    return <FullScreenNotice title="Preparando o jogo..." />;
  }
  if (stage === "WAITING_SESSION") {
    return <PartnerWaiting partnerName={partnerName} partnerReady={partnerPresent} t={T} />;
  }
  if (stage === "COMPLETED") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center" style={{ backgroundColor: "#58CC02" }}>
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 14 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M20 8 H44 V34 Q44 54 32 56 Q20 54 20 34 Z" fill="#F5C400" stroke="#CE9200" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M8 10 Q8 28 20 33" stroke="#CE9200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M56 10 Q56 28 44 33" stroke="#CE9200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="28" y="56" width="8" height="4" fill="#CE9200" />
            <rect x="18" y="60" width="28" height="4" rx="2" fill="#CE9200" />
          </svg>
        </motion.div>
        <p className="font-nunito font-black text-white" style={{ fontSize: 22 }}>Você terminou!</p>
        <div className="rounded-2xl px-6 py-3 flex gap-6" style={{ backgroundColor: "white" }}>
          <div>
            {/* TEXTO-05: "Suas moedas (nome)" — o nome confirma para a criança
                (e para a pesquisadora ao lado) de quem é o placar. */}
            <p className="font-nunito font-bold" style={{ color: "#8A7A52", fontSize: 11 }} data-testid="final-own-label">
              SUAS MOEDAS{ownName ? ` (${ownName.toUpperCase()})` : ""}
            </p>
            <p className="font-nunito font-black" style={{ color: "#58CC02", fontSize: 22 }}>{balances.ownCoins}</p>
          </div>
          <div>
            {/* "Moedas do grupo", o mesmo rótulo da faixa do topo (item 9 da
                Luiza, 26/10). Antes "COFRINHO DA DUPLA". */}
            <p className="font-nunito font-bold" style={{ color: "#8A7A52", fontSize: 11 }}>MOEDAS DO GRUPO</p>
            <p className="font-nunito font-black" style={{ color: "#1CB0F6", fontSize: 22 }}>{balances.groupCoins}</p>
          </div>
        </div>
        <p className="font-nunito font-bold text-white" style={{ fontSize: 14 }}>Avise a pesquisadora.</p>
      </div>
    );
  }

  // ── Dados da história atual ────────────────────────────────────────────────
  if (!attempt) {
    return <FullScreenNotice title="Preparando a próxima história..." />;
  }

  // Cada par tem lado fixo no cartão original; quem divide pode estar à
  // esquerda (seta →) ou à direita (seta ←).
  const layout = stimulusLayout(attempt.distributorCharacter, attempt.receptorCharacter);
  if (!layout.known) warnUnknownPair(attempt.distributorCharacter, attempt.receptorCharacter);
  const distributorIsA = layout.distributorSide === "left";
  const nameA = layout.left;
  const nameB = layout.right;
  const distributorName = attempt.distributorCharacter;
  const total = attempt.endowment;
  const judged = own?.judgment ?? null;
  const punished = own?.punishment ?? null;

  // O reset do prelúdio para uma história nova roda num efeito, ou seja, DEPOIS
  // do primeiro render com a tentativa nova. Nesse render o `prelude` ainda é o
  // "ready" da história anterior, e a pergunta "justa ou injusta" aparecia por
  // um instante antes de "Hora de Dividir". A tela usa o estado que o efeito
  // vai aplicar, para não piscar.
  const shownPrelude: Prelude = preludeAttemptId === attemptId
    ? prelude
    : own?.judgment ? "ready" : advancedFromResult.current ? "dividing" : "intro";

  let distributorCoins = attempt.distributorDistribution;
  let receptorCoins = attempt.receptorDistribution;
  if (shownPrelude === "intro") {
    distributorCoins = 0; receptorCoins = 0;
  } else if (shownPrelude === "dividing") {
    distributorCoins = total; receptorCoins = 0;
  } else if (shownPrelude === "transferring") {
    // O distribuidor ja fica com a parte dele; as que faltam estao voando.
    distributorCoins = attempt.distributorDistribution; receptorCoins = 0;
  } else if (result?.distributorResult) {
    // Punido: a pilha de quem dividiu fica com o que sobrou, como no cartão
    // original ("Lucas perdeu 8 moedas" com 4 na frente dele).
    distributorCoins = result.distributorResult.finalCoins;
  }
  const displayCoinA = distributorIsA ? distributorCoins : receptorCoins;
  const displayCoinB = distributorIsA ? receptorCoins : distributorCoins;

  // O balão entra na vez dele na fila de avisos, não junto com o resultado.
  const distributorBubble = isResult && noticeShownAt.bubble != null && result?.distributorResult
    ? `${result.distributorResult.character} perdeu ${moedas(result.distributorResult.coinsLost)}`
    : null;

  // Durante a fila o cartão da punição continua na tela com as linhas de perda.
  // Ele sai no fim só quando a dupla não ganhou moedas: o botão toma o lugar
  // dele. Com ganho, a janela abre por cima e o cartão fica atrás.
  const showPunishmentCard = stage === "PUNISHMENT" || stage === "WAITING_PUNISHMENT_PARTNER"
    // Pela lista da fila, não pelas linhas já mostradas: senão o cartão sumia
    // por um instante no resultado, antes da primeira linha nova entrar.
    || (isResult && (resultNotices.includes("own") || resultNotices.includes("partner"))
        && !(resultFeedbackDone && !earnedCoins));

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: "#F5F2EB", ["--ui" as string]: ui }}>

      <PiggyBankCounter count={balances.groupCoins} label={T.together} />

      <div className="flex-1 flex min-h-0">

        <SidebarCoins count={balances.ownCoins} label="VOCÊ" flash={coinLostFlash} align="left" />

        {/* Coluna central com largura máxima: em tela larga os botões não esticam
            de borda a borda, e a história fica no centro do campo de visão. */}
        <div
          className="flex-1 flex flex-col min-h-0 px-10 pt-7 pb-4 gap-3 w-full mx-auto"
          // "safe center": centraliza quando sobra altura e volta a alinhar no
          // topo se um dia a tela for baixa demais, sem cortar o personagem.
          style={{ maxWidth: u(1000), justifyContent: "safe center" }}
        >

          {/* Character block — escondido na tela de abertura */}
          {shownPrelude !== "intro" && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 rounded-2xl flex-shrink-0"
                style={{ backgroundColor: "#EDE8DC", padding: "22px 28px 16px", overflow: "visible" }}
              >
                <CharacterBlock
                  nameA={nameA}
                  nameB={nameB}
                  coinA={displayCoinA}
                  coinB={displayCoinB}
                  distributorIsA={distributorIsA}
                  circleSize={Math.round(144 * ui)}
                  bubble={distributorBubble}
                  transferring={shownPrelude === "transferring"}
                  transferCount={attempt.receptorDistribution}
                />
              </motion.div>
            </div>
          )}

          {/* Action area */}
          <div className="flex flex-col flex-shrink-0" style={{ minHeight: u(ACTION_AREA_MIN_H) }}>
            <AnimatePresence mode="wait">

              {shownPrelude === "intro" && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <GameButton variant="primary" size="lg" onClick={() => setPrelude("dividing")} className="shadow-lg px-8">
                    <span className="flex items-center gap-2" style={{ fontSize: u(20) }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M8 5l8 7-8 7V5z" fill="currentColor" />
                      </svg>
                      {T.seeStory}
                    </span>
                  </GameButton>
                </motion.div>
              )}

              {shownPrelude === "dividing" && (
                <motion.div
                  key="hora-dividir"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center pt-1"
                >
                  {/* Aviso, não botão (item 8 da Luiza, 26/10): fundo branco e
                      a mesma borda do cartão da pergunta, sem a borda inferior
                      mais grossa que dá cara de botão. Antes amarelo, igual ao
                      "Repetir história", que é clicável. */}
                  <div
                    className="font-nunito font-black rounded-2xl select-none"
                    data-testid="divide-cue"
                    style={{
                      backgroundColor: "#FFFFFF", color: "#3C3C3C", padding: `${u(8)} ${u(22)}`,
                      border: "2px solid #E0E0E0", fontSize: u(17),
                    }}
                  >
                    Hora de Dividir
                  </div>
                </motion.div>
              )}

              {shownPrelude === "transferring" && (
                <motion.div
                  key="transferindo"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <span className="font-nunito font-bold" style={{ fontSize: u(15), color: "#AFA99A" }}>
                    Dividindo...
                  </span>
                </motion.div>
              )}

              {/* Pausa com a divisão feita (DIVIDED_HOLD_MS): sem texto — a
                  Luiza pediu a remoção de "Moedas distribuídas..." (itens 2 e
                  4, 07/10). A criança só olha as duas pilhas. */}

              {shownPrelude === "ready" && (stage === "JUDGMENT" || stage === "WAITING_JUDGMENT_PARTNER") && (
                <DecisionCard
                  key="justice"
                  question={T.justiceQuestion}
                  buttons={[
                    { value: "Just",   label: T.just,   bg: "#1CB0F6", border: "#1899D6" },
                    { value: "Unjust", label: T.unjust, bg: "#0069A8", border: "#005080" },
                  ]}
                  playerChoice={judged}
                  partnerChoice={partner?.judgment ?? null}
                  onChoose={(v) => void submitJudgment(v as "Just" | "Unjust")}
                  partnerName={partnerName}
                  disabled={isSubmitting || judgmentBlocked}
                  topButton={
                    !judged ? (
                      <div className="flex justify-center">
                        <button
                          onClick={() => setPrelude("dividing")}
                          className="font-nunito font-black rounded-2xl"
                          style={{
                            backgroundColor: "#FFD900", color: "#7A5800", padding: `${u(6)} ${u(18)}`,
                            border: "2px solid #CE9200", borderBottom: "3px solid #CE9200", fontSize: u(15),
                          }}
                        >
                          Repetir história
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              )}

              {shownPrelude === "ready" && showPunishmentCard && (
                <motion.div
                  key="punishment"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                >
                  <DecisionCard
                    question={T.punishQuestion(distributorName, attempt.punishmentLoss)}
                    buttons={[
                      { value: "Punish",   label: "SIM", bg: "#58CC02", border: "#46A302" },
                      { value: "NoPunish", label: "NÃO", bg: "#FF4B4B", border: "#CC3939" },
                    ]}
                    playerChoice={punished}
                    partnerChoice={partner?.punishment ?? null}
                    onChoose={(v) => {
                      if (v === "Punish") {
                        // "Você perdeu" sai no clique, não só quando o servidor
                        // devolve o resultado; é o primeiro aviso da fila.
                        if (showNotice("own")) playPunishmentSound();
                        setCoinLostFlash(true);
                        setTimeout(() => setCoinLostFlash(false), 600);
                      }
                      void submitPunishment(v as "Punish" | "NoPunish");
                    }}
                    partnerName={partnerName}
                    disabled={isSubmitting}
                    footer={lossLines.length > 0 ? <LossFeedback lines={lossLines} /> : undefined}
                  />
                </motion.div>
              )}

              {stage === "RESULT" && !earnedCoins && resultFeedbackDone && (
                <motion.div
                  key="result-plain"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 flex-1"
                >
                  {/* Sem a frase "Nesta história a dupla não ganhou moedas" —
                      removida a pedido da Luiza (item 5, 07/10). */}
                  <MountSignal onMount={onAdvanceButtonShown} />
                  <button
                    onClick={advanceToNextStory}
                    disabled={isSubmitting || advanceBlocked}
                    className="font-nunito font-black rounded-2xl"
                    style={{
                      backgroundColor: "#FFD900", color: "#7A5800", padding: `${u(12)} ${u(30)}`,
                      border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: u(18),
                      opacity: isSubmitting || advanceBlocked ? 0.6 : 1,
                    }}
                  >
                    Ver a próxima história
                  </button>
                </motion.div>
              )}

              {stage === "WAITING_RESULT_PARTNER" && (
                <motion.div
                  key="waiting-result"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2 flex-1"
                >
                  {/* Só "Esperando {nome}" (item 12 da Luiza, 07/10). */}
                  <span className="font-nunito font-bold" style={{ fontSize: u(16), color: "#AFA99A" }}>
                    Esperando {partnerName}
                  </span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#1CB0F6" }}
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }} />
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

        <SidebarCoins count={balances.partnerCoins} label={partnerName} align="right" />

      </div>

      {/* Ganho da dupla */}
      <AnimatePresence>
        {stage === "RESULT" && earnedCoins && resultFeedbackDone && (
          <GroupRewardModal
            amount={result?.culturalConsequence ?? 0}
            piggyBank={balances.groupCoins}
            onContinue={advanceToNextStory}
            onButtonShown={onAdvanceButtonShown}
            disabled={isSubmitting || advanceBlocked}
          />
        )}
      </AnimatePresence>

      {/* Parceiro desconectado — sinal real (secondsSinceSeen), some sozinho quando ele volta */}
      <AnimatePresence>
        {partnerDisconnected && (
          <motion.div
            key="partner-disconnected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center px-5"
            style={{ backgroundColor: "rgba(15,15,15,0.82)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="bg-white rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center gap-4"
              style={{ maxWidth: 340, width: "90%" }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FFF0F0" }}>
                <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="18" fill="#FF4B4B" opacity="0.15" />
                  <circle cx="20" cy="20" r="7" stroke="#FF4B4B" strokeWidth="2.5" fill="none" />
                  <path d="M8 8 L32 32" stroke="#FF4B4B" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="font-nunito font-black text-xl mb-1" style={{ color: "#3C3C3C" }}>
                  {partnerAwayTitle(partnerName)}
                </h2>
                <p className="font-nunito font-bold text-sm" style={{ color: "#8B8B8B" }}>
                  {partnerAwayBody(partnerName)}
                </p>
              </div>
              <div className="flex gap-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FF4B4B" }}
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
