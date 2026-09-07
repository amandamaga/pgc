import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { GameButton } from "../../components/game/game-button";
import { CoinCounter } from "../../components/game/coin-counter";
import { PiggyBankCounter } from "../../components/game/piggy-bank-counter";
import { ProgressIndicator } from "../../components/game/progress-indicator";
import { AlertCircle } from "lucide-react";

// Mock data - em produção, isso viria de uma API
const mockRounds = [
  {
    id: 1,
    distributorSide: "A",
    coinA: 5,
    coinB: 5,
    condition: "A",
  },
  {
    id: 2,
    distributorSide: "B",
    coinA: 3,
    coinB: 7,
    condition: "A",
  },
  {
    id: 3,
    distributorSide: "A",
    coinA: 8,
    coinB: 2,
    condition: "B",
  },
];

export function GameRoundPage() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();
  const [searchParams] = useSearchParams();
  
  const currentRound = parseInt(searchParams.get("round") || "1");
  const coins = parseInt(searchParams.get("coins") || "10");
  const piggyBank = parseInt(searchParams.get("piggyBank") || "0");
  const totalRounds = 64; // Fixed 64 trials
  
  const [step, setStep] = useState<"judgment" | "punishment">("judgment");
  const [judgment, setJudgment] = useState<"just" | "unjust" | null>(null);
  const [judgmentTime, setJudgmentTime] = useState<number>(0);
  const [punishmentTime, setPunishmentTime] = useState<number>(0);
  
  // Get current stimulus (in production, this would come from API)
  const stimulusIndex = (currentRound - 1) % mockRounds.length;
  const currentStimulus = mockRounds[stimulusIndex];

  // Track time for each decision
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      if (step === "judgment" && judgment !== null) {
        setJudgmentTime(Date.now() - startTime);
      }
    };
  }, [step, judgment]);

  const handleJudgment = (choice: "just" | "unjust") => {
    const decisionTime = Date.now() - judgmentTime;
    setJudgment(choice);
    setJudgmentTime(decisionTime);
    setStep("punishment");
  };

  const handlePunishment = (punish: boolean) => {
    const startTime = Date.now();
    setPunishmentTime(startTime);
    
    // Navigate to feedback page
    const newCoins = punish ? coins - 1 : coins;
    navigate(
      `/session/${sessionId}/participant/${participantId}/feedback?round=${currentRound}&judgment=${judgment}&punish=${punish}&coins=${newCoins}&piggyBank=${piggyBank}&totalRounds=${totalRounds}`
    );
  };

  const isLastRound = currentRound === totalRounds;

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 pb-6">
      {/* Top Section */}
      <div className="space-y-3 mb-6">
        {/* Progress Bar */}
        <ProgressIndicator current={currentRound} total={totalRounds} />
        
        {/* Counters */}
        <div className="grid grid-cols-2 gap-3">
          <CoinCounter count={coins} />
          <PiggyBankCounter count={piggyBank} />
        </div>
      </div>

      {/* Last Round Alert */}
      {isLastRound && (
        <div 
          className="mb-4 p-3 rounded-2xl flex items-center justify-center gap-2"
          style={{ backgroundColor: "#FFF9E6" }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: "#8B7000" }} />
          <span 
            className="font-nunito font-bold text-base"
            style={{ color: "#8B7000" }}
          >
            Última rodada!
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Step 1: Judgment */}
          {step === "judgment" && (
            <div className="space-y-6">
              {/* Stimulus Card */}
              <div className="bg-white rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-around mb-6">
                  {/* Character A */}
                  <div className="text-center">
                    <div className="relative">
                      <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center text-3xl mb-2 mx-auto border-4 border-white shadow-lg"
                        style={{ backgroundColor: "var(--game-primary)" }}
                      >
                        👤
                      </div>
                      {currentStimulus.distributorSide === "A" && (
                        <div 
                          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md"
                          style={{ backgroundColor: "var(--game-coin)" }}
                        >
                          Distribuidor
                        </div>
                      )}
                    </div>
                    <p 
                      className="font-nunito font-bold text-sm mt-3 mb-2"
                      style={{ color: "var(--game-text-secondary)" }}
                    >
                      Personagem A
                    </p>
                    <div 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: "#FFF9E6" }}
                    >
                      <span className="text-xl">🪙</span>
                      <span 
                        className="font-nunito font-bold text-lg"
                        style={{ color: "#8B7000" }}
                      >
                        {currentStimulus.coinA}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div 
                    className="w-px h-24"
                    style={{ backgroundColor: "var(--game-text-secondary)", opacity: 0.2 }}
                  />

                  {/* Character B */}
                  <div className="text-center">
                    <div className="relative">
                      <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center text-3xl mb-2 mx-auto border-4 border-white shadow-lg"
                        style={{ backgroundColor: "var(--game-success)" }}
                      >
                        👤
                      </div>
                      {currentStimulus.distributorSide === "B" && (
                        <div 
                          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md"
                          style={{ backgroundColor: "var(--game-coin)" }}
                        >
                          Distribuidor
                        </div>
                      )}
                    </div>
                    <p 
                      className="font-nunito font-bold text-sm mt-3 mb-2"
                      style={{ color: "var(--game-text-secondary)" }}
                    >
                      Personagem B
                    </p>
                    <div 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: "#FFF9E6" }}
                    >
                      <span className="text-xl">🪙</span>
                      <span 
                        className="font-nunito font-bold text-lg"
                        style={{ color: "#8B7000" }}
                      >
                        {currentStimulus.coinB}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="text-center p-4 rounded-2xl"
                  style={{ backgroundColor: "var(--game-bg)" }}
                >
                  <p 
                    className="font-nunito text-base leading-relaxed"
                    style={{ color: "var(--game-text-primary)" }}
                  >
                    O Personagem {currentStimulus.distributorSide} distribuiu as moedas. 
                    Personagem A recebeu {currentStimulus.coinA} moedas e Personagem B recebeu {currentStimulus.coinB} moedas.
                  </p>
                </div>
              </div>

              {/* Question */}
              <div className="text-center">
                <h2 
                  className="font-nunito font-bold text-xl"
                  style={{ color: "var(--game-text-primary)" }}
                >
                  Essa distribuição é justa ou injusta?
                </h2>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <GameButton
                  variant="success"
                  onClick={() => handleJudgment("just")}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">🙂</span>
                    <span>Justa</span>
                  </div>
                </GameButton>
                <GameButton
                  variant="danger"
                  onClick={() => handleJudgment("unjust")}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">😟</span>
                    <span>Injusta</span>
                  </div>
                </GameButton>
              </div>
            </div>
          )}

          {/* Step 2: Punishment */}
          {step === "punishment" && (
            <div className="space-y-6">
              {/* Previous Answer Feedback */}
              <div 
                className="rounded-2xl p-4 text-center"
                style={{ backgroundColor: "var(--game-bg)" }}
              >
                <p 
                  className="font-nunito text-base"
                  style={{ color: "var(--game-text-primary)" }}
                >
                  Você disse que a distribuição foi <strong>{judgment === "just" ? "justa" : "injusta"}</strong>.
                </p>
              </div>

              {/* Question */}
              <div className="text-center">
                <h2 
                  className="font-nunito font-bold text-xl mb-2"
                  style={{ color: "var(--game-text-primary)" }}
                >
                  Você quer punir quem fez a distribuição?
                </h2>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <GameButton
                  variant="danger"
                  onClick={() => handlePunishment(true)}
                >
                  <div className="flex flex-col items-center">
                    <span>Punir</span>
                    <span className="text-xs opacity-90 mt-1">-1 moeda</span>
                  </div>
                </GameButton>
                <GameButton
                  variant="primary"
                  onClick={() => handlePunishment(false)}
                >
                  Não Punir
                </GameButton>
              </div>

              {/* Helper Text - Visual e Destacado */}
              <div 
                className="rounded-2xl p-4 border-2"
                style={{ 
                  backgroundColor: "#FFF1F0",
                  borderColor: "var(--game-danger)"
                }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">❌</span>
                    <p 
                      className="font-nunito font-bold text-base"
                      style={{ color: "#8B1A1A" }}
                    >
                      Se você punir:
                    </p>
                  </div>
                  <div 
                    className="rounded-xl p-3 space-y-2"
                    style={{ backgroundColor: "rgba(255, 90, 95, 0.15)" }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-nunito font-bold text-lg" style={{ color: "#8B1A1A" }}>
                        Você perde
                      </span>
                      <span className="text-2xl">🪙</span>
                      <span className="font-nunito font-bold text-2xl" style={{ color: "#8B1A1A" }}>
                        1
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-nunito font-bold text-lg" style={{ color: "#8B1A1A" }}>
                        O outro perde
                      </span>
                      <span className="text-2xl">🪙🪙🪙</span>
                      <span className="font-nunito font-bold text-2xl" style={{ color: "#8B1A1A" }}>
                        3
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}