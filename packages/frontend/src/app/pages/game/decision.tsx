import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { GameButton } from "../../components/game/game-button";
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

export function DecisionPage() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();
  const [searchParams] = useSearchParams();
  
  const currentRound = parseInt(searchParams.get("round") || "1");
  const coins = parseInt(searchParams.get("coins") || "10");
  const totalRounds = mockRounds.length;
  
  const currentStimulus = mockRounds[currentRound - 1];

  // Reaction timer - inicia quando os botões aparecem
  const [reactionStartTime] = useState(Date.now());

  const handleDecision = (punish: boolean) => {
    const reactionTime = Date.now() - reactionStartTime;
    
    // Em produção, aqui criaria o Trial record com:
    // - Session ID
    // - Pair ID
    // - Stimulus Card ID
    // - Round Number
    // - Decision (punish/not punish)
    // - Reaction Time
    // - Timestamp
    
    console.log("Trial Data:", {
      sessionId,
      participantId,
      roundNumber: currentRound,
      stimulusCardId: currentStimulus.id,
      decision: punish ? "punish" : "not_punish",
      reactionTime: `${reactionTime}ms`,
      timestamp: new Date().toISOString(),
    });

    // Navegar para a tela de feedback
    navigate(
      `/session/${sessionId}/participant/${participantId}/feedback?round=${currentRound}&punish=${punish}&coins=${coins}&reactionTime=${reactionTime}`
    );
  };

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

      {/* Decision Question */}
      <div className="text-center mb-4">
        <h2 
          className="font-nunito font-bold text-xl"
          style={{ color: "var(--game-text-primary)" }}
        >
          Você quer punir o distribuidor?
        </h2>
      </div>

      {/* Decision Buttons */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
        <GameButton
          variant="danger"
          onClick={() => handleDecision(true)}
        >
          Punir
        </GameButton>
        <GameButton
          variant="primary"
          onClick={() => handleDecision(false)}
        >
          Não Punir
        </GameButton>
      </div>

      {/* Helper Text */}
      <p 
        className="text-center mt-4 font-nunito text-sm"
        style={{ color: "var(--game-text-secondary)" }}
      >
        Punir custa 1 moeda e o distribuidor perde 3 moedas
      </p>
    </div>
  );
}
