import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { CoinCounter } from "../../components/game/coin-counter";
import { ProgressIndicator } from "../../components/game/progress-indicator";
import { StimulusCard } from "../../components/game/stimulus-card";

// Mock data - em produção, isso viria de uma API
const mockRounds = [
  {
    id: 1,
    characterAImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    characterBImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    situation: "O Personagem A distribuiu as moedas de forma igual entre ele e o Personagem B. Cada um recebeu 5 moedas.",
    distributorSide: "Esquerda",
    distributionType: "Igual",
  },
  {
    id: 2,
    characterAImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    characterBImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    situation: "O Personagem B ficou com 7 moedas e deu apenas 3 moedas para o Personagem A.",
    distributorSide: "Direita",
    distributionType: "Desigual",
  },
  {
    id: 3,
    characterAImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    characterBImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    situation: "O Personagem A pegou 8 moedas para si e deu apenas 2 moedas para o Personagem B.",
    distributorSide: "Esquerda",
    distributionType: "Vantajoso",
  },
];

const PRESENTATION_TIME = 3000; // 3 segundos de apresentação

export function StimulusPresentationPage() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();
  const [searchParams] = useSearchParams();
  
  const currentRound = parseInt(searchParams.get("round") || "1");
  const coins = parseInt(searchParams.get("coins") || "10");
  const totalRounds = mockRounds.length;
  
  const currentStimulus = mockRounds[currentRound - 1];

  const [timeLeft, setTimeLeft] = useState(PRESENTATION_TIME / 1000);

  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Navegar para a tela de decisão após o tempo de apresentação
          navigate(
            `/session/${sessionId}/participant/${participantId}/decision?round=${currentRound}&coins=${coins}`
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, sessionId, participantId, currentRound, coins]);

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 pb-6">
      {/* Top Section */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex-1 max-w-xs">
          <ProgressIndicator current={currentRound} total={totalRounds} />
        </div>
        <CoinCounter count={coins} />
      </div>

      {/* Stimulus Card */}
      <div className="flex-1 flex items-center justify-center mb-6">
        <div className="w-full max-w-md">
          <StimulusCard
            characterAImage={currentStimulus.characterAImage}
            characterBImage={currentStimulus.characterBImage}
            situation={currentStimulus.situation}
            distributorSide={currentStimulus.distributorSide}
          />
        </div>
      </div>

      {/* Timer Indicator */}
      <div className="text-center">
        <p 
          className="font-nunito text-sm"
          style={{ color: "var(--game-text-secondary)" }}
        >
          Leia atentamente a situação
        </p>
        <div className="mt-2 flex justify-center gap-1">
          {[...Array(PRESENTATION_TIME / 1000)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < timeLeft ? "var(--game-primary)" : "#E5E7EB",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
