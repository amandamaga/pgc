import { useState, useEffect } from "react";
import { getLang, translations, setPreviewLang, type Lang } from "../../lib/game-i18n";
import { GameButton } from "../../components/game/game-button";
import { PiggyBankCounter } from "../../components/game/piggy-bank-counter";
import { motion, AnimatePresence } from "motion/react";
import { useGameSounds } from "../../hooks/use-game-sounds";
import { useParticipantState } from "../../hooks/use-participant-state";

const SIDEBAR_W = 56;

// Prelúdio local de cada história: só animação, nada disso vai para o servidor.
// O servidor decide o que perguntar; estes passos decidem quando mostrar.
type Prelude = "intro" | "dividing" | "divided" | "ready";

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
function CoinDotGrid({ count, maxDots = 12, dotSize = 7, cols = 4 }: {
  count: number; maxDots?: number; dotSize?: number; cols?: number;
}) {
  const active = Math.min(count, maxDots);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`, gap: 2 }}>
      {Array.from({ length: maxDots }, (_, i) => (
        <div key={i} style={{ visibility: i < active ? "visible" : "hidden" }}>
          <CoinDot size={dotSize} />
        </div>
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
  const blocks = 10;
  const filled = max > 0 ? Math.ceil((Math.max(0, count) / max) * blocks) : 0;
  return (
    <motion.div
      className="h-full flex flex-col items-center pt-3 pb-4 gap-1"
      style={{
        width: SIDEBAR_W, flexShrink: 0,
        backgroundColor: "rgba(245,240,232,0.6)",
        borderRight: align === "left" ? "1.5px dashed #DDD8CE" : undefined,
        borderLeft: align === "right" ? "1.5px dashed #DDD8CE" : undefined,
      }}
      animate={flash ? { backgroundColor: ["rgba(255,75,75,0.05)", "rgba(255,75,75,0.25)", "rgba(245,240,232,0.6)"] } : {}}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col-reverse gap-[3px] mb-1" aria-hidden>
        {Array.from({ length: blocks }, (_, i) => (
          <div
            key={i}
            style={{
              width: 22, height: 7, borderRadius: 3,
              backgroundColor: i < filled ? "#FFD900" : "#E7E1D4",
              border: `1px solid ${i < filled ? "#CE9200" : "#DDD8CE"}`,
            }}
          />
        ))}
      </div>
      <span className="font-nunito font-black" style={{ fontSize: 18, color: "#58CC02", lineHeight: 1 }}>
        {count}
      </span>
      <span className="font-nunito font-bold uppercase text-center" style={{ fontSize: 7, color: "#8A7A52", letterSpacing: 1 }}>
        {label}
      </span>
    </motion.div>
  );
}

// ── Character circle ──────────────────────────────────────────────────────────
function CharacterCircle({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: "50%",
        backgroundColor: "#1CB0F6", border: "2px solid #1899D6",
      }}
    >
      <span className="font-nunito font-black text-white text-center px-1" style={{ fontSize: size >= 50 ? 11 : 9, lineHeight: 1 }}>
        {name}
      </span>
    </div>
  );
}

// ── Character block ───────────────────────────────────────────────────────────
function CharacterBlock({ nameA, nameB, coinA, coinB, distributorIsA, circleSize = 44, bubble }: {
  nameA: string; nameB: string; coinA: number; coinB: number;
  distributorIsA: boolean; circleSize?: number; bubble?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-end gap-2">
        {/* Side A: coins above, circle below */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex flex-col items-center gap-0.5">
            <CoinDotGrid count={coinA} maxDots={12} dotSize={6} cols={4} />
            <span className="font-nunito font-black" style={{ fontSize: 11, color: "#58CC02", lineHeight: 1 }}>
              {coinA}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <AnimatePresence>
              {distributorIsA && bubble && (
                <motion.div
                  key="bubble-a"
                  initial={{ opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 rounded-xl px-2.5 py-1"
                  style={{
                    backgroundColor: "#FFF0F0", border: "1.5px solid #FF4B4B",
                    position: "absolute", bottom: "calc(100% - 12px)", left: 0,
                    zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: 10 }}>❌</span>
                  <span className="font-nunito font-bold" style={{ fontSize: 10, color: "#CC0000" }}>{bubble}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <CharacterCircle name={nameA} size={circleSize} />
          </div>
          <span className="font-nunito font-bold" style={{ fontSize: 9, color: "#3C3C3C" }}>{nameA}</span>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 mx-0.5 mb-4">
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
            <path
              d={distributorIsA
                ? "M1 5 L21 5 M15 1.5 L21 5 L15 8.5"
                : "M21 5 L1 5 M7 1.5 L1 5 L7 8.5"}
              stroke="#1CB0F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Side B: coins above, circle below */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex flex-col items-center gap-0.5">
            <CoinDotGrid count={coinB} maxDots={12} dotSize={6} cols={4} />
            <span className="font-nunito font-black" style={{ fontSize: 11, color: "#58CC02", lineHeight: 1 }}>
              {coinB}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <AnimatePresence>
              {!distributorIsA && bubble && (
                <motion.div
                  key="bubble-b"
                  initial={{ opacity: 0, y: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 rounded-xl px-2.5 py-1"
                  style={{
                    backgroundColor: "#FFF0F0", border: "1.5px solid #FF4B4B",
                    position: "absolute", bottom: "calc(100% - 12px)", right: 0,
                    zIndex: 10, whiteSpace: "nowrap", pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: 10 }}>❌</span>
                  <span className="font-nunito font-bold" style={{ fontSize: 10, color: "#CC0000" }}>{bubble}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <CharacterCircle name={nameB} size={circleSize} />
          </div>
          <span className="font-nunito font-bold" style={{ fontSize: 9, color: "#3C3C3C" }}>{nameB}</span>
        </div>
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
  question, questionInBox = true, buttons, playerChoice, partnerChoice,
  onChoose, partnerName, topButton, disabled = false,
}: {
  question: string;
  questionInBox?: boolean;
  buttons: [BtnDef, BtnDef];
  playerChoice: string | null;
  partnerChoice: string | null;
  onChoose: (value: string) => void;
  partnerName: string;
  topButton?: React.ReactNode;
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

      {questionInBox ? (
        <div className="rounded-xl px-3 py-2" style={{ backgroundColor: "#F2F2F2", border: "1.5px solid #E0E0E0" }}>
          <p className="font-nunito font-black text-center leading-snug" style={{ fontSize: 13, color: "#3C3C3C" }}>
            {question}
          </p>
        </div>
      ) : (
        <p className="font-nunito font-bold text-center" style={{ fontSize: 12, color: "#3C3C3C" }}>
          {question}
        </p>
      )}

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
    refresh, submitJudgment, submitPunishment, acknowledgeResult,
  } = useParticipantState(token);

  const [lang, setLangState] = useState<Lang>(() => getLang(undefined));
  const T = translations[lang];
  const { playCulturantSound, playPunishmentSound } = useGameSounds();

  const stage = state?.stage;
  const attempt = state?.currentAttempt ?? null;
  const result = state?.trialResult ?? null;
  const partner = state?.partner ?? null;
  const own = state?.own ?? null;
  const balances = state?.balances ?? null;
  const partnerName = partner?.displayName ?? "seu parceiro";
  const attemptId = attempt?.id ?? null;

  const [prelude, setPrelude] = useState<Prelude>("intro");
  const [coinLostFlash, setCoinLostFlash] = useState(false);
  const [showLossPopup, setShowLossPopup] = useState(false);

  // Cada história nova recomeça o prelúdio. Se a criança já respondeu (voltou
  // depois de um refresh), pula direto para a pergunta.
  useEffect(() => {
    if (!attemptId) return;
    setPrelude(own?.judgment ? "ready" : "intro");
    setShowLossPopup(false);
  }, [attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Moedas distribuídas..." segura 1.2s antes da pergunta.
  useEffect(() => {
    if (prelude !== "divided") return;
    const t = setTimeout(() => setPrelude("ready"), 1200);
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
  const punishmentApplied = result?.punishmentApplied ?? false;
  const anyoneLostCoins = punishmentApplied || (result?.ownIndividualCost ?? 0) > 0;
  useEffect(() => {
    if (stage !== "RESULT" || !anyoneLostCoins) return;
    setShowLossPopup(true);
    const t = setTimeout(() => setShowLossPopup(false), 2600);
    return () => clearTimeout(t);
  }, [stage, anyoneLostCoins]);

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
    return <FullScreenNotice
      title={`Olá, ${state.participant.displayName}!`}
      message="Espere a pesquisadora começar o jogo."
    />;
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

  const nameA = attempt.distributorCharacter;
  const nameB = attempt.receptorCharacter;
  const total = attempt.endowment;
  const judged = own?.judgment ?? null;
  const punished = own?.punishment ?? null;

  let displayCoinA = attempt.distributorDistribution;
  let displayCoinB = attempt.receptorDistribution;
  if (prelude === "intro") {
    displayCoinA = 0; displayCoinB = 0;
  } else if (prelude === "dividing") {
    displayCoinA = total; displayCoinB = 0;
  }

  const distributorBubble = stage === "RESULT" && result?.distributorResult
    ? `${result.distributorResult.character} perdeu ${result.distributorResult.coinsLost} moedas`
    : null;

  const lossMessages: string[] = [];
  if (result) {
    if (result.ownIndividualCost > 0) lossMessages.push(`Você perdeu ${result.ownIndividualCost} moedas`);
    if (partner?.punishment === "Punish") lossMessages.push(`${partnerName} perdeu 1 moeda`);
    if (result.distributorResult) {
      lossMessages.push(`${result.distributorResult.character} perdeu ${result.distributorResult.coinsLost} moedas`);
    }
  }

  // ── Tela cheia de ganho da dupla ───────────────────────────────────────────
  if (stage === "RESULT" && earnedCoins && !showLossPopup) {
    return (
      <motion.div
        className="h-full flex flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ backgroundColor: "#58CC02" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
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
          className="font-nunito font-black text-white" style={{ fontSize: 20, lineHeight: 1.3 }}
        >
          Vocês ganharam moedas! +{result?.culturalConsequence}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex justify-center gap-3"
        >
          {Array.from({ length: result?.culturalConsequence ?? 0 }, (_, i) => (
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
          <p className="font-nunito font-bold" style={{ color: "#1CB0F6", fontSize: 13 }}>
            Cofrinho da dupla: {balances.groupCoins}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          style={{ width: "100%", maxWidth: 280 }}
        >
          <button
            onClick={() => void acknowledgeResult()}
            disabled={isSubmitting}
            className="w-full font-nunito font-black rounded-2xl py-3"
            style={{
              backgroundColor: "#FFD900", color: "#7A5800",
              border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: 14,
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Ver a próxima história
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: "#F5F2EB" }}>

      <PiggyBankCounter count={balances.groupCoins} label={T.together} />

      <div className="flex-1 flex min-h-0">

        <SidebarCoins count={balances.ownCoins} label="VOCÊ" flash={coinLostFlash} align="left" />

        <div className="flex-1 flex flex-col min-h-0 px-3 pt-3 pb-2 gap-2">

          {/* Character block — escondido na tela de abertura */}
          {prelude !== "intro" && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-2 rounded-2xl flex-shrink-0"
                style={{ backgroundColor: "#EDE8DC", padding: "10px 8px 8px", overflow: "visible" }}
              >
                <p
                  className="font-nunito font-black text-center"
                  style={{
                    fontSize: 12,
                    color: "#3C3C3C",
                    visibility: prelude === "dividing" ? "visible" : "hidden",
                  }}
                >
                  Moedas Totais Distribuídas
                </p>
                <CharacterBlock
                  nameA={nameA}
                  nameB={nameB}
                  coinA={displayCoinA}
                  coinB={displayCoinB}
                  distributorIsA
                  circleSize={44}
                  bubble={distributorBubble}
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
                  <button
                    onClick={() => setPrelude("divided")}
                    className="font-nunito font-black rounded-2xl px-5 py-2"
                    style={{
                      backgroundColor: "#FFD900", color: "#7A5800",
                      border: "2px solid #CE9200", borderBottom: "3px solid #CE9200", fontSize: 13,
                    }}
                  >
                    Hora de Dividir
                  </button>
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
                  questionInBox
                  buttons={[
                    { value: "Just",   label: T.just,   bg: "#1CB0F6", border: "#1899D6" },
                    { value: "Unjust", label: T.unjust, bg: "#0069A8", border: "#005080" },
                  ]}
                  playerChoice={judged}
                  partnerChoice={partner?.judgment ?? null}
                  onChoose={(v) => void submitJudgment(v as "Just" | "Unjust")}
                  partnerName={partnerName}
                  disabled={isSubmitting}
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

              {prelude === "ready" && (stage === "PUNISHMENT" || stage === "WAITING_PUNISHMENT_PARTNER") && (
                <motion.div
                  key="punishment"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                >
                  <DecisionCard
                    question={T.punishQuestion(nameA)}
                    questionInBox={false}
                    buttons={[
                      { value: "Punish",   label: "SIM", bg: "#58CC02", border: "#46A302" },
                      { value: "NoPunish", label: "NÃO", bg: "#FF4B4B", border: "#CC3939" },
                    ]}
                    playerChoice={punished}
                    partnerChoice={partner?.punishment ?? null}
                    onChoose={(v) => {
                      if (v === "Punish") {
                        setCoinLostFlash(true);
                        playPunishmentSound();
                        setTimeout(() => setCoinLostFlash(false), 600);
                      }
                      void submitPunishment(v as "Punish" | "NoPunish");
                    }}
                    partnerName={partnerName}
                    disabled={isSubmitting}
                  />
                </motion.div>
              )}

              {stage === "RESULT" && !earnedCoins && !showLossPopup && (
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
                    disabled={isSubmitting}
                    className="font-nunito font-black rounded-2xl px-5 py-2.5"
                    style={{
                      backgroundColor: "#FFD900", color: "#7A5800",
                      border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: 13,
                      opacity: isSubmitting ? 0.6 : 1,
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

      {/* Alternador de idioma — discreto, para a pesquisadora */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
        <button
          onClick={() => { const next: Lang = lang === "pt" ? "no" : "pt"; setPreviewLang(next); setLangState(next); }}
          className="rounded-xl px-2.5 py-1 opacity-20 hover:opacity-70 transition-opacity"
          style={{ backgroundColor: "#A560F8" }}
        >
          <span className="font-nunito font-bold text-white" style={{ fontSize: 9 }}>
            {lang === "pt" ? "🇳🇴 Norsk" : "🇧🇷 PT"}
          </span>
        </button>
      </div>

      {/* Aviso de perda de moedas */}
      <AnimatePresence>
        {showLossPopup && lossMessages.length > 0 && (
          <motion.div
            key="coin-loss-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center px-5"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          >
            <motion.div
              initial={{ scale: 0.82, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="rounded-3xl overflow-hidden shadow-2xl"
              style={{ maxWidth: 320, width: "100%", backgroundColor: "white" }}
            >
              <div
                className="flex items-center justify-center gap-2 px-6 py-4"
                style={{ backgroundColor: punishmentApplied ? "#FF4B4B" : "#AFA99A" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="white" opacity="0.25" />
                  <path d="M12 7v5M12 16h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="font-nunito font-black text-white" style={{ fontSize: 14 }}>
                  {punishmentApplied ? "Punição aplicada" : "Ninguém puniu"}
                </span>
              </div>
              <div className="flex flex-col gap-2 px-5 py-4">
                {lossMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-2.5 rounded-2xl px-4 py-2.5"
                    style={{ backgroundColor: "#FFF0F0", border: "1.5px solid #FFCDD2" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#FF4B4B" opacity="0.15" />
                      <path d="M12 7v5" stroke="#CC0000" strokeWidth="2.5" strokeLinecap="round" />
                      <circle cx="12" cy="16.5" r="1.2" fill="#CC0000" />
                    </svg>
                    <span className="font-nunito font-bold" style={{ fontSize: 13, color: "#CC0000" }}>
                      {msg}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
