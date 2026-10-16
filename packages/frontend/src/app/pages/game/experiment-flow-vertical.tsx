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

const SIDEBAR_W = 120;

// Janela de tolerância para considerar o parceiro desconectado. secondsSinceSeen
// cresce normalmente durante o turno do parceiro (sem polling nesse momento), então
// um valor curto geraria falsos alarmes só porque a criança está pensando na
// resposta. 75s é o meio da janela de 60-90s combinada para este fluxo.
const PARTNER_DISCONNECT_THRESHOLD_SECONDS = 75;

// "1 moedas" aparecia em toda punicao simples; a crianca le esse texto varias
// dezenas de vezes por sessao, entao vale concordar o plural.
const moedas = (n: number) => (n === 1 ? "1 moeda" : `${n} moedas`);

// A pergunta ja diz "voce daria 1 das suas moedas": a confirmacao na hora do
// clique usa o mesmo numero. O valor definitivo vem do servidor no resultado.
const PUNISH_COST_TO_SELF = 1;

// Maior numero de moedas que uma pilha precisa mostrar: no passo "hora de
// dividir" um dos personagens segura o endowment inteiro (ate 32).
const PILE_MAX_DOTS = 32;

// Tempo de leitura do aviso de perdas: um piso para a crianca registrar que
// algo mudou, mais uma folga por linha. Duas perdas nao se leem no mesmo tempo
// que uma.
const LOSS_READ_BASE_MS = 5000;
const LOSS_READ_PER_LINE_MS = 2800;
// As linhas entram uma de cada vez, com pausa suficiente para a primeira ser
// lida antes da segunda aparecer.
const LOSS_LINE_STAGGER_S = 0.5;
// Polling e de ~2s: 20s de folga significa "esta aqui agora".
const PARTNER_PRESENT_THRESHOLD_SECONDS = 20;

// Prelúdio local de cada história: só animação, nada disso vai para o servidor.
// O servidor decide o que perguntar; estes passos decidem quando mostrar.
type Prelude = "intro" | "dividing" | "transferring" | "divided" | "ready";

// ── Ritmo da historia ─────────────────────────────────────────────────────────
// Todos os tempos automaticos do ensaio ficam juntos aqui. O publico tem 8-11
// anos e nao controla o avanco destas etapas, entao o ritmo e deliberadamente
// lento: e melhor a crianca esperar um pouco do que perder o que aconteceu.
//
// Duracao do voo de cada moeda e do escalonamento entre elas. O total nunca
// passa de COIN_FLIGHT_MS + COIN_FLIGHT_SPREAD_MS, independente de quantas
// moedas o distribuidor passou.
const COIN_FLIGHT_MS = 750;
const COIN_FLIGHT_SPREAD_MS = 700;
const COIN_TRANSFER_MS = COIN_FLIGHT_MS + COIN_FLIGHT_SPREAD_MS + 250;
// Tempo que "Hora de Dividir" fica na tela antes das moedas sairem: a crianca
// precisa ler o aviso, mas nao precisa clicar em nada para a divisao acontecer.
const DIVIDE_CUE_MS = 1600;
// Pausa com a divisao ja feita, antes da primeira pergunta aparecer: e o momento
// em que a crianca compara as duas pilhas para decidir se foi justa.
const DIVIDED_HOLD_MS = 2200;

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
// O experimento começa com 80 moedas, que não cabem como pontos soltos: a barra
// mostra a proporção e o número exato fica embaixo.
function SidebarCoins({ count, label, flash = false, align = "left", max = 80 }: {
  count: number; label: string; flash?: boolean; align?: "left" | "right"; max?: number;
}) {
  return (
    <motion.div
      className="h-full flex flex-col items-center px-5 pt-6 pb-6 gap-1.5 overflow-y-auto"
      style={{
        width: SIDEBAR_W, flexShrink: 0,
        backgroundColor: "rgba(245,240,232,0.6)",
        borderRight: align === "left" ? "1.5px dashed #DDD8CE" : undefined,
        borderLeft: align === "right" ? "1.5px dashed #DDD8CE" : undefined,
      }}
      animate={flash ? { backgroundColor: ["rgba(255,75,75,0.05)", "rgba(255,75,75,0.25)", "rgba(245,240,232,0.6)"] } : {}}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-3" aria-hidden>
        <CoinDotGrid count={count} maxDots={max} dotSize={16} cols={4} gap={4} />
      </div>
      <span className="font-nunito font-black" style={{ fontSize: 28, color: "#58CC02", lineHeight: 1 }}>
        {count}
      </span>
      <span className="font-nunito font-bold uppercase text-center" style={{ fontSize: 11, color: "#8A7A52", letterSpacing: 1 }}>
        {label}
      </span>
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
                  <span style={{ fontSize: px(5) }}>❌</span>
                  <span className="font-nunito font-black" style={{ fontSize: px(5), color: "#CC0000" }}>{bubble}</span>
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
          <span className="font-nunito font-bold" style={{ fontSize: px(6), color: "#3C3C3C" }}>{nameA}</span>
          <span className="font-nunito font-black" style={{ fontSize: px(9), color: "#58CC02", lineHeight: 1 }}
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
                  <span style={{ fontSize: px(5) }}>❌</span>
                  <span className="font-nunito font-black" style={{ fontSize: px(5), color: "#CC0000" }}>{bubble}</span>
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
          <span className="font-nunito font-bold" style={{ fontSize: px(6), color: "#3C3C3C" }}>{nameB}</span>
          <span className="font-nunito font-black" style={{ fontSize: px(9), color: "#58CC02", lineHeight: 1 }}
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
      style={{
        backgroundColor: color, color: "white",
        fontSize: 8, padding: "2px 6px",
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
        <p className="font-nunito font-black text-center leading-snug" style={{ fontSize: 22, color: "#3C3C3C" }}>
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
                padding: "11px 8px",
                fontSize: 14,
                opacity,
                cursor: locked ? "default" : "pointer",
                transition: "opacity 0.2s",
                minHeight: 44,
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
            <span className="font-nunito font-bold" style={{ fontSize: 10, color: "#AFA99A" }}>
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
function LossRow({ msg, delay = 0 }: { msg: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay }}
      className="flex items-center gap-2.5 rounded-xl px-4 py-2"
      style={{ backgroundColor: "#FFF0F0", border: "2px solid #FFCDD2" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF4B4B" opacity="0.15" />
        <path d="M12 7v5" stroke="#CC0000" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1.2" fill="#CC0000" />
      </svg>
      <span className="font-nunito font-black" style={{ fontSize: 17, color: "#CC0000" }}>
        {msg}
      </span>
    </motion.div>
  );
}

// ── Aviso de perda de moedas ──────────────────────────────────────────────────
// Fica embaixo dos botoes, no fluxo da tela: a crianca ve o que aconteceu sem
// perder de vista a escolha que acabou de fazer. So as linhas de perda -- um
// titulo "Punicao aplicada" por cima delas seria dizer duas vezes a mesma coisa.
function LossFeedback({ messages }: { messages: string[] }) {
  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
      {messages.map((msg, i) => (
        <LossRow key={i} msg={msg} delay={i * LOSS_LINE_STAGGER_S} />
      ))}
    </div>
  );
}

// ── Ganho da dupla ────────────────────────────────────────────────────────────
// Modal em vez de tela cheia: o tabuleiro continua visivel atras, entao a crianca
// ve que o ganho veio da historia que ainda esta na tela, e nao de um lugar novo.
function GroupRewardModal({ amount, piggyBank, onContinue, disabled = false }: {
  amount: number; piggyBank: number; onContinue: () => void; disabled?: boolean;
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
        style={{ width: "100%", maxWidth: 360, backgroundColor: "#58CC02", boxShadow: "0 6px 0 #3A9200" }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 240, damping: 14 }}
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <path d="M20 8 H44 V34 Q44 54 32 56 Q20 54 20 34 Z" fill="#F5C400" stroke="#CE9200" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M8 10 Q8 28 20 33" stroke="#CE9200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M56 10 Q56 28 44 33" stroke="#CE9200" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="28" y="56" width="8" height="4" fill="#CE9200" />
            <rect x="18" y="60" width="28" height="4" rx="2" fill="#CE9200" />
          </svg>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="font-nunito font-black text-white" style={{ fontSize: 22, lineHeight: 1.3 }}
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
              <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#FFD900", border: "2px solid #CE9200" }} />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="rounded-2xl px-6 py-2.5" style={{ backgroundColor: "white" }}
        >
          <p className="font-nunito font-bold" style={{ color: "#1CB0F6", fontSize: 14 }}>
            Cofrinho da dupla: {piggyBank}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          style={{ width: "100%", maxWidth: 280 }}
        >
          <button
            onClick={onContinue}
            disabled={disabled}
            className="w-full font-nunito font-black rounded-2xl py-3"
            style={{
              backgroundColor: "#FFD900", color: "#7A5800",
              border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: 15,
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

  const T = translations[PARTICIPANT_LANG];
  const { playCulturantSound, playPunishmentSound } = useGameSounds();

  const stage = state?.stage;
  const attempt = state?.currentAttempt ?? null;
  const result = state?.trialResult ?? null;
  const partner = state?.partner ?? null;
  const own = state?.own ?? null;
  const balances = state?.balances ?? null;
  const partnerName = partner?.displayName ?? "seu parceiro";
  const attemptId = attempt?.id ?? null;

  // "Parceiro desconectado": só faz sentido enquanto EU estou esperando por ele
  // (ele não estaria fazendo polling durante o próprio turno de qualquer jeito).
  // Some sozinho quando secondsSinceSeen volta a ficar abaixo da janela.
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
  // Marca que a crianca escolheu punir, para o "voce perdeu" sair no clique e nao
  // so quando o servidor devolve o resultado da dupla.
  const [justPunished, setJustPunished] = useState(false);
  const [showLossFeedback, setShowLossFeedback] = useState(false);

  // Cada história nova recomeça o prelúdio. Se a criança já respondeu (voltou
  // depois de um refresh), pula direto para a pergunta.
  useEffect(() => {
    if (!attemptId) return;
    setPrelude(own?.judgment ? "ready" : "intro");
    setPreludeAttemptId(attemptId);
    setShowLossFeedback(false);
    setJustPunished(false);
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

  // Som de ganho quando a dupla ganhou moedas nesta história.
  const earnedCoins = (result?.culturalConsequence ?? 0) > 0;
  useEffect(() => {
    if (stage !== "RESULT" || !earnedCoins) return;
    const t = setTimeout(() => playCulturantSound(), 400);
    return () => clearTimeout(t);
  }, [stage, earnedCoins, playCulturantSound]);

  // O aviso de perda aparece assim que o resultado chega e sai sozinho.
  // So as perdas da dupla. A perda do personagem distribuidor ja aparece no balao
  // sobre o retrato dele (distributorBubble), e repetir aqui embaixo misturava o
  // que aconteceu com a historia e o que aconteceu com as duas criancas.
  const lossMessages: string[] = [];
  if (result) {
    if (result.ownIndividualCost > 0) lossMessages.push(`Você perdeu ${moedas(result.ownIndividualCost)}`);
    if (partner?.punishment === "Punish") lossMessages.push(`${partnerName} perdeu ${moedas(1)}`);
  }
  const lossLineCount = lossMessages.length;
  // O aviso depende das proprias mensagens: qualquer perda individual da dupla
  // (minha ou do parceiro) conta. Antes dependia de punishmentApplied/meu custo,
  // e quando so o parceiro punia a perda dele nunca aparecia para mim.
  const anyoneLostCoins = lossLineCount > 0;

  // Tentativa cujo aviso de perda já terminou. `showLossFeedback` sozinho não
  // basta: ele começa false antes do efeito abaixo ligá-lo, e esse false inicial
  // não pode ser confundido com "o aviso já acabou".
  const [lossFeedbackDoneFor, setLossFeedbackDoneFor] = useState<string | null>(null);

  useEffect(() => {
    if (stage !== "RESULT" || !anyoneLostCoins) return;
    setShowLossFeedback(true);
    const t = setTimeout(() => {
      setShowLossFeedback(false);
      setLossFeedbackDoneFor(attemptId);
    }, LOSS_READ_BASE_MS + LOSS_READ_PER_LINE_MS * lossLineCount);
    return () => clearTimeout(t);
  }, [stage, anyoneLostCoins, lossLineCount, attemptId]);

  // Todos os avisos obrigatórios do resultado terminaram: ou não houve perda
  // individual, ou o aviso de perda desta tentativa já saiu da tela. É o ponto
  // em que "Ver a próxima história" passa a existir (com ou sem ganho da dupla).
  const resultFeedbackDone = stage === "RESULT" && !!attemptId
    && (!anyoneLostCoins || lossFeedbackDoneFor === attemptId);

  // storyShownAt: a história completa (divisão final) está na tela e a criança
  // já pode julgá-la. Não vale no "Ver história" nem durante a animação; e se
  // ela já julgou (voltou depois de um refresh), não se cria registro tardio.
  const storyReadyToJudge = stage === "JUDGMENT" && !!attemptId
    && preludeAttemptId === attemptId && prelude === "ready" && !own?.judgment;
  useEffect(() => {
    if (storyReadyToJudge && storyShownStatus === "idle") void markStoryShown();
  }, [storyReadyToJudge, storyShownStatus, markStoryShown]);

  // nextStoryAvailableAt: o avanço acabou de ficar disponível para esta criança.
  useEffect(() => {
    if (resultFeedbackDone && nextStoryAvailableStatus === "idle") void markNextStoryAvailable();
  }, [resultFeedbackDone, nextStoryAvailableStatus, markNextStoryAvailable]);

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
            <p className="font-nunito font-bold" style={{ color: "#8A7A52", fontSize: 11 }}>SUAS MOEDAS</p>
            <p className="font-nunito font-black" style={{ color: "#58CC02", fontSize: 22 }}>{balances.ownCoins}</p>
          </div>
          <div>
            <p className="font-nunito font-bold" style={{ color: "#8A7A52", fontSize: 11 }}>COFRINHO DA DUPLA</p>
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

  let distributorCoins = attempt.distributorDistribution;
  let receptorCoins = attempt.receptorDistribution;
  if (prelude === "intro") {
    distributorCoins = 0; receptorCoins = 0;
  } else if (prelude === "dividing") {
    distributorCoins = total; receptorCoins = 0;
  } else if (prelude === "transferring") {
    // O distribuidor ja fica com a parte dele; as que faltam estao voando.
    distributorCoins = attempt.distributorDistribution; receptorCoins = 0;
  } else if (result?.distributorResult) {
    // Punido: a pilha de quem dividiu fica com o que sobrou, como no cartão
    // original ("Lucas perdeu 8 moedas" com 4 na frente dele).
    distributorCoins = result.distributorResult.finalCoins;
  }
  const displayCoinA = distributorIsA ? distributorCoins : receptorCoins;
  const displayCoinB = distributorIsA ? receptorCoins : distributorCoins;

  const distributorBubble = stage === "RESULT" && result?.distributorResult
    ? `${result.distributorResult.character} perdeu ${moedas(result.distributorResult.coinsLost)}`
    : null;

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: "#F5F2EB" }}>

      <PiggyBankCounter count={balances.groupCoins} label={T.together} />

      <div className="flex-1 flex min-h-0">

        <SidebarCoins count={balances.ownCoins} label="VOCÊ" flash={coinLostFlash} align="left" />

        <div className="flex-1 flex flex-col min-h-0 px-10 pt-7 pb-4 gap-3">

          {/* Character block — escondido na tela de abertura */}
          {prelude !== "intro" && (
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
                  circleSize={144}
                  bubble={distributorBubble}
                  transferring={prelude === "transferring"}
                  transferCount={attempt.receptorDistribution}
                />
              </motion.div>
            </div>
          )}

          {/* Action area */}
          <div className="flex-1 flex flex-col min-h-0">
            <AnimatePresence mode="wait">

              {prelude === "intro" && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <GameButton variant="primary" size="lg" onClick={() => setPrelude("dividing")} className="shadow-lg px-8">
                    <span className="flex items-center gap-2 text-lg">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M8 5l8 7-8 7V5z" fill="currentColor" />
                      </svg>
                      {T.seeStory}
                    </span>
                  </GameButton>
                </motion.div>
              )}

              {prelude === "dividing" && (
                <motion.div
                  key="hora-dividir"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center pt-1"
                >
                  <div
                    className="font-nunito font-black rounded-2xl px-5 py-2 select-none"
                    style={{
                      backgroundColor: "#FFD900", color: "#7A5800",
                      border: "2px solid #CE9200", borderBottom: "3px solid #CE9200", fontSize: 13,
                    }}
                  >
                    Hora de Dividir
                  </div>
                </motion.div>
              )}

              {prelude === "transferring" && (
                <motion.div
                  key="transferindo"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <span className="font-nunito font-bold" style={{ fontSize: 12, color: "#AFA99A" }}>
                    Dividindo...
                  </span>
                </motion.div>
              )}

              {prelude === "divided" && (
                <motion.div
                  key="dist-after"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: "#FFD900" }}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    <span className="font-nunito font-bold" style={{ fontSize: 12, color: "#AFA99A" }}>
                      Moedas distribuídas...
                    </span>
                  </div>
                </motion.div>
              )}

              {prelude === "ready" && (stage === "JUDGMENT" || stage === "WAITING_JUDGMENT_PARTNER") && (
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
                          className="font-nunito font-black rounded-2xl px-4 py-1.5"
                          style={{
                            backgroundColor: "#FFD900", color: "#7A5800",
                            border: "2px solid #CE9200", borderBottom: "3px solid #CE9200", fontSize: 12,
                          }}
                        >
                          Repetir história
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              )}

              {prelude === "ready"
                && (stage === "PUNISHMENT" || stage === "WAITING_PUNISHMENT_PARTNER"
                    || (stage === "RESULT" && showLossFeedback && lossMessages.length > 0)) && (
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
                        setJustPunished(true);
                        setCoinLostFlash(true);
                        playPunishmentSound();
                        setTimeout(() => setCoinLostFlash(false), 600);
                      }
                      void submitPunishment(v as "Punish" | "NoPunish");
                    }}
                    partnerName={partnerName}
                    disabled={isSubmitting}
                    footer={
                      stage === "RESULT" && showLossFeedback && lossMessages.length > 0 ? (
                        <LossFeedback messages={lossMessages} />
                      ) : justPunished ? (
                        <LossFeedback messages={[`Você perdeu ${moedas(PUNISH_COST_TO_SELF)}`]} />
                      ) : undefined
                    }
                  />
                </motion.div>
              )}

              {stage === "RESULT" && !earnedCoins && resultFeedbackDone && (
                <motion.div
                  key="result-plain"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 flex-1"
                >
                  <p className="font-nunito font-bold text-center" style={{ fontSize: 13, color: "#8B8B8B" }}>
                    Nesta história a dupla não ganhou moedas.
                  </p>
                  <button
                    onClick={() => void acknowledgeResult()}
                    disabled={isSubmitting || advanceBlocked}
                    className="font-nunito font-black rounded-2xl px-5 py-2.5"
                    style={{
                      backgroundColor: "#FFD900", color: "#7A5800",
                      border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: 13,
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
                  <span className="font-nunito font-bold" style={{ fontSize: 12, color: "#AFA99A" }}>
                    Esperando {partnerName} ver o resultado
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
            onContinue={() => void acknowledgeResult()}
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
                  {partnerName} pode ter se desconectado
                </h2>
                <p className="font-nunito font-bold text-sm" style={{ color: "#8B8B8B" }}>
                  Sem notícias há um tempo. Isso volta sozinho assim que a conexão for reestabelecida.
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
