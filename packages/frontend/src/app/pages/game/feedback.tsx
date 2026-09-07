import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { GameButton } from "../../components/game/game-button";
import { CoinCounter } from "../../components/game/coin-counter";
import { PiggyBankCounter } from "../../components/game/piggy-bank-counter";
import { useGameSounds } from "../../hooks/use-game-sounds";
import { TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function GameFeedbackPage() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();
  const [searchParams] = useSearchParams();
  const { playSound } = useGameSounds();
  
  const round = parseInt(searchParams.get("round") || "1");
  const judgment = searchParams.get("judgment") || "just";
  const punish = searchParams.get("punish") === "true";
  const coins = parseInt(searchParams.get("coins") || "10");
  const piggyBank = parseInt(searchParams.get("piggyBank") || "0");
  const totalRounds = parseInt(searchParams.get("totalRounds") || "64");
  
  // Simular culturante (25% de chance - em produção, isso viria do backend)
  const [hasCulturant] = useState(() => Math.random() < 0.25);
  const newPiggyBank = hasCulturant ? piggyBank + 2 : piggyBank;
  
  const [displayCoins, setDisplayCoins] = useState(coins);
  const [displayPiggyBank, setDisplayPiggyBank] = useState(piggyBank);
  const [canContinue, setCanContinue] = useState(false);
  const [showCulturant, setShowCulturant] = useState(false);
  const [showLossPopup, setShowLossPopup] = useState(punish);

  // Tocar som ao carregar a página
  useEffect(() => {
    if (punish) {
      playSound('punish');
    }
    // Não toca som ao não punir - silêncio também é feedback
  }, [punish, playSound]);

  // Animar mudança de moedas (se houve punição)
  useEffect(() => {
    if (punish) {
      const timer = setTimeout(() => {
        setDisplayCoins(coins);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [punish, coins]);

  // Auto-fechar popup de perda de moedas após 2.5s
  useEffect(() => {
    if (punish) {
      const timer = setTimeout(() => setShowLossPopup(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [punish]);

  // Mostrar culturante com delay após feedback principal
  useEffect(() => {
    if (hasCulturant) {
      const timer = setTimeout(() => {
        setShowCulturant(true);
        playSound('culturant');
        // Animar incremento do cofrinho
        setTimeout(() => {
          setDisplayPiggyBank(newPiggyBank);
        }, 300);
      }, 2000); // 2 segundos após feedback principal
      return () => clearTimeout(timer);
    }
  }, [hasCulturant, newPiggyBank, playSound]);

  // Delay antes de permitir continuar
  useEffect(() => {
    const totalDelay = hasCulturant ? 4000 : 1500; // Mais tempo se houver culturante
    const timer = setTimeout(() => {
      setCanContinue(true);
    }, totalDelay);
    return () => clearTimeout(timer);
  }, [hasCulturant]);

  const handleContinue = () => {
    if (!canContinue) return;

    if (round >= totalRounds) {
      // Ir para tela de fim
      navigate(`/session/${sessionId}/participant/${participantId}/end?coins=${coins}&piggyBank=${newPiggyBank}`);
    } else {
      // Próxima rodada
      const nextRound = round + 1;
      navigate(
        `/session/${sessionId}/participant/${participantId}/game?round=${nextRound}&coins=${coins}&piggyBank=${newPiggyBank}`
      );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 pb-6 relative">
      {/* Coin Loss Popup */}
      <AnimatePresence>
        {showLossPopup && (
          <motion.div
            key="loss-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-5"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
            onClick={() => setShowLossPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.82, y: 28, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="rounded-3xl overflow-hidden shadow-2xl"
              style={{ maxWidth: 320, width: "100%", backgroundColor: "white" }}
              onClick={(e) => e.stopPropagation()}
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
              <div className="flex flex-col gap-2 px-5 py-5">
                {[
                  { label: "Você perdeu", amount: "1 moeda" },
                  { label: "O distribuidor perdeu", amount: "3 moedas" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: "#FFF0F0", border: "1.5px solid #FFCDD2" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#FF4B4B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-nunito font-medium" style={{ fontSize: 14, color: "#991B1B" }}>
                      {item.label} <span className="font-black">{item.amount}</span>
                    </span>
                  </motion.div>
                ))}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="font-nunito text-xs text-center pt-1"
                  style={{ color: "#9CA3AF" }}
                >
                  Toque para fechar
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-md w-full mx-auto">
        {/* Counters Display - Ambos visíveis */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <CoinCounter count={displayCoins} />
          <PiggyBankCounter count={displayPiggyBank} />
        </div>

        {/* Feedback Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl mb-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: punish 
                  ? "rgba(255, 90, 95, 0.1)" 
                  : "rgba(79, 141, 247, 0.1)" 
              }}
            >
              {punish ? (
                <TrendingDown 
                  className="w-10 h-10" 
                  style={{ color: "var(--game-danger)" }}
                  strokeWidth={2.5}
                />
              ) : (
                <Minus 
                  className="w-10 h-10" 
                  style={{ color: "var(--game-primary)" }}
                  strokeWidth={2.5}
                />
              )}
            </div>
          </div>

          {/* Result Message */}
          <h2 
            className="font-nunito font-bold text-2xl text-center mb-4"
            style={{ color: "var(--game-text-primary)" }}
          >
            {punish ? "Você puniu o distribuidor" : "Você decidiu não punir"}
          </h2>

          {!punish ? (
            <div 
              className="rounded-2xl p-4"
              style={{ backgroundColor: "rgba(79, 141, 247, 0.1)" }}
            >
              <p 
                className="font-nunito text-base text-center"
                style={{ color: "var(--game-text-primary)" }}
              >
                Suas moedas permanecem as mesmas.
              </p>
            </div>
          )}
        </div>

        {/* Culturant Feedback Card */}
        {showCulturant && (
          <div 
            className="bg-white rounded-3xl p-8 shadow-xl mb-6 border-4 animate-pulse"
            style={{ 
              borderColor: "#FFD700",
              animation: "pulse 1s ease-in-out 2"
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="text-6xl">🤝</div>
            </div>

            {/* Title */}
            <h2 
              className="font-nunito font-bold text-2xl text-center mb-3"
              style={{ color: "var(--game-success)" }}
            >
              Vocês concordaram!
            </h2>

            {/* Message */}
            <p 
              className="font-nunito text-base text-center mb-4"
              style={{ color: "var(--game-text-primary)" }}
            >
              A dupla ganhou moedas!
            </p>

            {/* Piggy Bank Display */}
            <div 
              className="rounded-2xl p-5 border-2"
              style={{ 
                backgroundColor: "#FFF9E6",
                borderColor: "#FFD700"
              }}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl">🤝</div>
                <div className="flex flex-col items-center">
                  <p 
                    className="font-nunito text-sm font-medium mb-1"
                    style={{ color: "#8B7000" }}
                  >
                    Cofrinho da dupla
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🪙</span>
                    <span 
                      className="font-nunito font-bold text-3xl"
                      style={{ color: "#8B7000" }}
                    >
                      {displayPiggyBank}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <GameButton 
          onClick={handleContinue}
          className="w-full"
          disabled={!canContinue}
        >
          {round >= totalRounds ? "Ver Resultado Final" : "Próxima Rodada"}
        </GameButton>
      </div>
    </div>
  );
}