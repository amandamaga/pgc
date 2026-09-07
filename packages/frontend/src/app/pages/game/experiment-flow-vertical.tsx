import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { getLang, translations, setPreviewLang, type Lang } from "../../lib/game-i18n";
import { GameButton } from "../../components/game/game-button";
import { PiggyBankCounter } from "../../components/game/piggy-bank-counter";
import { motion, AnimatePresence } from "motion/react";
import { useGameSounds } from "../../hooks/use-game-sounds";

const characterPairs: { names: Record<Lang, [string, string]> }[] = [
  { names: { pt: ["Lucas", "Miguel"],     no: ["Erik", "Lars"] } },
  { names: { pt: ["Rafael", "Daniel"],    no: ["Henrik", "Magnus"] } },
  { names: { pt: ["Pedro", "Sofia"],      no: ["Anders", "Astrid"] } },
  { names: { pt: ["João", "Felipe"],      no: ["Olav", "Jonas"] } },
  { names: { pt: ["Ana", "Beatriz"],      no: ["Ingrid", "Linnea"] } },
  { names: { pt: ["Julia", "Mariana"],    no: ["Maja", "Sofie"] } },
  { names: { pt: ["Isabella", "Cecília"], no: ["Emma", "Nora"] } },
  { names: { pt: ["Laura", "Amanda"],     no: ["Frida", "Tuva"] } },
];

const PARTNER_NAMES: Record<Lang, string> = { pt: "Maria", no: "Mari" };

const mockRounds = [
  { id: 1, distributorSide: "A" as const, coinA: 24, coinB: 8,  pairIndex: 0 },
  { id: 2, distributorSide: "B" as const, coinA: 12, coinB: 12, pairIndex: 1 },
  { id: 3, distributorSide: "A" as const, coinA: 8,  coinB: 4,  pairIndex: 2 },
  { id: 4, distributorSide: "B" as const, coinA: 4,  coinB: 8,  pairIndex: 3 },
];

const TOTAL_TRIALS = 4;
const SIDEBAR_W = 56;

type GameStep = "distribute" | "distributing" | "justice" | "punishment" | "trial-result";
type TrialResultType = "culturant" | "neutral";

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
function SidebarCoins({ count, label, flash = false, align = "left" }: {
  count: number; label: string; flash?: boolean; align?: "left" | "right";
}) {
  const dots = Math.min(count, 20);
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 8px)", gap: 3, marginBottom: 3 }}>
        {Array.from({ length: dots }, (_, i) => <CoinDot key={i} size={8} />)}
      </div>
      <span className="font-nunito font-black" style={{ fontSize: 18, color: "#58CC02", lineHeight: 1 }}>
        {count}
      </span>
      <span className="font-nunito font-bold uppercase" style={{ fontSize: 7, color: "#8A7A52", letterSpacing: 1 }}>
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
      <span className="font-nunito font-black text-white" style={{ fontSize: size >= 50 ? 11 : 9, lineHeight: 1 }}>
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

// ── Feedback bubble ───────────────────────────────────────────────────────────
function FeedbackBubble({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
      style={{ backgroundColor: "#FFF0F0", border: "1.5px solid #FF4B4B" }}
    >
      <span style={{ fontSize: 11 }}>❌</span>
      <span className="font-nunito font-bold" style={{ fontSize: 11, color: "#CC0000" }}>
        {message}
      </span>
    </motion.div>
  );
}

// ── Decision card ─────────────────────────────────────────────────────────────
type BtnDef = { value: string; label: string; bg: string; border: string };

function DecisionCard({
  question, questionInBox = true, buttons, playerChoice, partnerChoice,
  onChoose, partnerName, topButton,
}: {
  question: string;
  questionInBox?: boolean;
  buttons: [BtnDef, BtnDef];
  playerChoice: string | null;
  partnerChoice: string | null;
  onChoose: (value: string) => void;
  partnerName: string;
  topButton?: React.ReactNode;
}) {
  const playerAnswered = playerChoice !== null;
  const partnerAnswered = partnerChoice !== null;

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
              onClick={() => !playerAnswered && onChoose(btn.value)}
              disabled={playerAnswered}
              className="font-nunito font-black uppercase text-white flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: btn.bg,
                border: `2px solid ${btn.border}`,
                borderBottom: `4px solid ${btn.border}`,
                borderRadius: 12,
                padding: "11px 8px",
                fontSize: 14,
                opacity,
                cursor: playerAnswered ? "default" : "pointer",
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

// ── Main component ─────────────────────────────────────────────────────────────
export function ExperimentFlowVertical() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();
  const [lang, setLangState] = useState<Lang>(() => getLang(sessionId));
  const T = translations[lang];
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<GameStep>("distribute");
  const [distributingPhase, setDistributingPhase] = useState<"before" | "after">("before");
  const [coins, setCoins] = useState(10);
  const [partnerCoins, setPartnerCoins] = useState(10);
  const [piggyBank, setPiggyBank] = useState(0);

  const [judgment, setJudgment] = useState<"just" | "unjust" | null>(null);
  const [partnerJudgment, setPartnerJudgment] = useState<"just" | "unjust" | null>(null);
  const [wantsToPunish, setWantsToPunish] = useState<boolean | null>(null);
  const [partnerWantsToPunish, setPartnerWantsToPunish] = useState<boolean | null>(null);
  const [trialResultType, setTrialResultType] = useState<TrialResultType>("neutral");
  const [coinLostFlash, setCoinLostFlash] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [punishBubbles, setPunishBubbles] = useState<string[]>([]);
  const [distributorBubble, setDistributorBubble] = useState<string | null>(null);
  const [coinLossPopup, setCoinLossPopup] = useState<string[]>([]);

  const { playCulturantSound, playPunishmentSound } = useGameSounds();

  const currentTrial = parseInt(searchParams.get("round") || "1");
  const sequence = searchParams.get("sequence") || "ABAC";
  const stimulusIndex = (currentTrial - 1) % mockRounds.length;
  const currentStimulus = mockRounds[stimulusIndex];
  const rawPair = characterPairs[currentStimulus.pairIndex];
  const [nameA, nameB] = rawPair.names[lang];
  const partnerName = PARTNER_NAMES[lang];
  const distributorIsA = currentStimulus.distributorSide === "A";
  const distributorName = distributorIsA ? nameA : nameB;
  const total = currentStimulus.coinA + currentStimulus.coinB;
  const isEqualDist = currentStimulus.coinA === currentStimulus.coinB;
  const currentCondition = sequence[currentTrial - 1] as "A" | "B" | "C" | undefined;

  const basePath = sessionId && participantId
    ? `/session/${sessionId}/participant/${participantId}`
    : `/game-preview`;

  useEffect(() => {
    if (step === "distributing" && distributingPhase === "after") {
      const t = setTimeout(() => setStep("justice"), 1200);
      return () => clearTimeout(t);
    }
  }, [step, distributingPhase]);

  useEffect(() => {
    if (step === "trial-result" && trialResultType === "culturant") {
      const t = setTimeout(() => playCulturantSound(), 400);
      return () => clearTimeout(t);
    }
  }, [step, trialResultType, playCulturantSound]);

  const earnedCC = (punish: boolean): boolean => {
    if (!currentCondition) return false;
    if (currentCondition === "A") return true;
    if (currentCondition === "B") return (punish && isEqualDist) || (!punish && !isEqualDist);
    if (currentCondition === "C") return (punish && !isEqualDist) || (!punish && isEqualDist);
    return false;
  };

  const goNext = () => {
    setJudgment(null);
    setPartnerJudgment(null);
    setWantsToPunish(null);
    setPartnerWantsToPunish(null);
    setPunishBubbles([]);
    setDistributorBubble(null);
    setCoinLossPopup([]);
    setDistributingPhase("before");
    if (currentTrial >= TOTAL_TRIALS) {
      navigate(`${basePath}/end?coins=${coins}&piggyBank=${piggyBank}`);
      return;
    }
    setStep("distribute");
    navigate(`${basePath}/flow-vertical?round=${currentTrial + 1}&sequence=${sequence}`, { replace: true });
  };

  const handleJudgment = (choice: "just" | "unjust") => {
    setJudgment(choice);
    setTimeout(() => {
      setPartnerJudgment(choice);
      setTimeout(() => setStep("punishment"), 1500);
    }, 1800);
  };

  const handlePunishment = (punish: boolean) => {
    setWantsToPunish(punish);
    if (punish) {
      setCoinLostFlash(true);
      playPunishmentSound();
      setTimeout(() => setCoinLostFlash(false), 600);
      setCoins((p) => p - 1);
      setPunishBubbles(["Você perdeu 1 moeda"]);
    }
    setTimeout(() => {
      setPartnerWantsToPunish(punish);
      if (punish) {
        const partnerMsg = `${partnerName} perdeu 1 moeda`;
        const distributorMsg = `${distributorName} perdeu 3 moedas`;
        setPunishBubbles((prev) => [...prev, partnerMsg]);
        setDistributorBubble(distributorMsg);
        setPartnerCoins((p) => p - 1);
        setCoinLossPopup(["Você perdeu 1 moeda", partnerMsg, distributorMsg]);
      }
      setTimeout(() => {
        setCoinLossPopup([]);
        if (earnedCC(punish)) {
          setPiggyBank((p) => p + 3);
          setTrialResultType("culturant");
          setStep("trial-result");
        } else {
          goNext();
        }
      }, 1800);
    }, 1800);
  };

  const handleRepeatStory = () => {
    setJudgment(null);
    setPartnerJudgment(null);
    setDistributingPhase("before");
    setStep("distributing");
  };

  let displayCoinA = currentStimulus.coinA;
  let displayCoinB = currentStimulus.coinB;
  if (step === "distribute") {
    displayCoinA = 0; displayCoinB = 0;
  } else if (step === "distributing" && distributingPhase === "before") {
    displayCoinA = distributorIsA ? total : 0;
    displayCoinB = distributorIsA ? 0 : total;
  }

  // ── Tela 10: CC fullscreen early return ────────────────────────────────────
  if (step === "trial-result" && trialResultType === "culturant") {
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
          Vocês ganharam moedas! +3
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex justify-center gap-3"
        >
          {[0, 1, 2].map((i) => (
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
            Cofrinho da dupla: {piggyBank}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}
          style={{ width: "100%", maxWidth: 280 }}
        >
          <button
            onClick={goNext}
            className="w-full font-nunito font-black rounded-2xl py-3"
            style={{
              backgroundColor: "#FFD900", color: "#7A5800",
              border: "2px solid #CE9200", borderBottom: "4px solid #CE9200", fontSize: 14,
            }}
          >
            {currentTrial >= TOTAL_TRIALS ? "Ver resultado" : "Ver a próxima história"}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col relative" style={{ backgroundColor: "#F5F2EB" }}>

      <PiggyBankCounter count={piggyBank} label={T.together} />

      <div className="flex-1 flex min-h-0">

        <SidebarCoins count={coins} label="VOCÊ" flash={coinLostFlash} align="left" />

        <div className="flex-1 flex flex-col min-h-0 px-3 pt-3 pb-2 gap-2">

          {/* Character block — hidden in Tela 0 */}
          {step !== "distribute" && (
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
                    visibility: step === "distributing" && distributingPhase === "before" ? "visible" : "hidden",
                  }}
                >
                  Moedas Totais Distribuídas
                </p>
                <CharacterBlock
                  nameA={nameA}
                  nameB={nameB}
                  coinA={displayCoinA}
                  coinB={displayCoinB}
                  distributorIsA={distributorIsA}
                  circleSize={44}
                  bubble={distributorBubble}
                />
              </motion.div>
            </div>
          )}

          {/* Action area */}
          <div className="flex-1 flex flex-col min-h-0">
            <AnimatePresence mode="wait">

              {step === "distribute" && (
                <motion.div
                  key="distribute"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <GameButton variant="primary" size="lg" onClick={() => setStep("distributing")} className="shadow-lg px-8">
                    <span className="flex items-center gap-2 text-lg">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M8 5l8 7-8 7V5z" fill="currentColor" />
                      </svg>
                      {T.seeStory}
                    </span>
                  </GameButton>
                </motion.div>
              )}

              {step === "distributing" && distributingPhase === "before" && (
                <motion.div
                  key="hora-dividir"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center pt-1"
                >
                  <button
                    onClick={() => setDistributingPhase("after")}
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

              {step === "distributing" && distributingPhase === "after" && (
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

              {step === "justice" && (
                <DecisionCard
                  key="justice"
                  question={T.justiceQuestion}
                  questionInBox
                  buttons={[
                    { value: "just",   label: T.just,   bg: "#1CB0F6", border: "#1899D6" },
                    { value: "unjust", label: T.unjust, bg: "#0069A8", border: "#005080" },
                  ]}
                  playerChoice={judgment}
                  partnerChoice={partnerJudgment}
                  onChoose={(v) => handleJudgment(v as "just" | "unjust")}
                  partnerName={partnerName}
                  topButton={
                    <div className="flex justify-center">
                      <button
                        onClick={handleRepeatStory}
                        className="font-nunito font-black rounded-2xl px-4 py-1.5"
                        style={{
                          backgroundColor: "#FFD900", color: "#7A5800",
                          border: "2px solid #CE9200", borderBottom: "3px solid #CE9200", fontSize: 12,
                        }}
                      >
                        Repetir história
                      </button>
                    </div>
                  }
                />
              )}

              {step === "punishment" && (
                <motion.div
                  key="punishment"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                >
                  <DecisionCard
                    question={T.punishQuestion(distributorName)}
                    questionInBox={false}
                    buttons={[
                      { value: "true",  label: "SIM", bg: "#58CC02", border: "#46A302" },
                      { value: "false", label: "NÃO", bg: "#FF4B4B", border: "#CC3939" },
                    ]}
                    playerChoice={wantsToPunish === null ? null : String(wantsToPunish)}
                    partnerChoice={partnerWantsToPunish === null ? null : String(partnerWantsToPunish)}
                    onChoose={(v) => handlePunishment(v === "true")}
                    partnerName={partnerName}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

        <SidebarCoins count={partnerCoins} label={partnerName.toUpperCase()} align="right" />

      </div>

      {/* Debug buttons */}
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
        <button onClick={() => setPartnerDisconnected(true)}
          className="rounded-xl px-2.5 py-1 opacity-20 hover:opacity-70 transition-opacity"
          style={{ backgroundColor: "#FF4B4B" }}>
          <span className="font-nunito font-bold text-white" style={{ fontSize: 9 }}>Desconexão</span>
        </button>
        <button onClick={() => setSessionPaused(true)}
          className="rounded-xl px-2.5 py-1 opacity-20 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: "#3C3C3C" }}>
          <span className="font-nunito font-bold text-white" style={{ fontSize: 9 }}>Pausar</span>
        </button>
      </div>

      {/* Coin Loss Popup */}
      <AnimatePresence>
        {coinLossPopup.length > 0 && (
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
              {/* Header */}
              <div
                className="flex items-center justify-center gap-2 px-6 py-4"
                style={{ backgroundColor: "#FF4B4B" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="white" opacity="0.25" />
                  <path d="M12 7v5M12 16h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span className="font-nunito font-black text-white" style={{ fontSize: 14 }}>
                  Punição aplicada
                </span>
              </div>
              {/* Messages */}
              <div className="flex flex-col gap-2 px-5 py-4">
                {coinLossPopup.map((msg, i) => (
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

      {/* Pause / Disconnect overlay */}
      <AnimatePresence>
        {(sessionPaused || partnerDisconnected) && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ backgroundColor: "rgba(15,15,15,0.82)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="bg-white rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center gap-4"
              style={{ maxWidth: 340, width: "90%" }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: partnerDisconnected ? "#FFF0F0" : "#FFF8E0" }}>
                {partnerDisconnected ? (
                  <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="18" fill="#FF4B4B" opacity="0.15" />
                    <circle cx="20" cy="20" r="7" stroke="#FF4B4B" strokeWidth="2.5" fill="none" />
                    <path d="M8 8 L32 32" stroke="#FF4B4B" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
                    <rect x="7" y="5" width="8" height="26" rx="4" fill="#FFD900" />
                    <rect x="21" y="5" width="8" height="26" rx="4" fill="#FFD900" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="font-nunito font-black text-xl mb-1" style={{ color: "#3C3C3C" }}>
                  {partnerDisconnected ? "Participante desconectado" : "Sessão pausada"}
                </h2>
                <p className="font-nunito font-bold text-sm" style={{ color: "#8B8B8B" }}>
                  {partnerDisconnected
                    ? "A conexão com o outro participante foi perdida."
                    : "A pesquisadora pausou a sessão. O jogo continuará em breve."}
                </p>
              </div>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: partnerDisconnected ? "#FF4B4B" : "#FFD900" }}
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
              <button
                onClick={() => { setSessionPaused(false); setPartnerDisconnected(false); }}
                className="font-nunito font-bold text-sm px-5 py-2 rounded-2xl border-2"
                style={{ borderColor: "#E5E5E5", color: "#8B8B8B" }}
              >
                Simular reconexão
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
