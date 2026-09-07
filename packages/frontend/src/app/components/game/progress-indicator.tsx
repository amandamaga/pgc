interface ProgressIndicatorProps {
  currentTrial: number;   // 1–64
  totalTrials: number;    // 64
  trialsPerRound: number; // 16
}

export function ProgressIndicator({
  currentTrial,
  totalTrials,
  trialsPerRound,
}: ProgressIndicatorProps) {
  const totalRounds = Math.round(totalTrials / trialsPerRound); // 4
  const currentRound = Math.ceil(currentTrial / trialsPerRound);
  const trialInRound = ((currentTrial - 1) % trialsPerRound) + 1;

  return (
    <div className="flex items-center gap-3 w-full">

      {/* Barra de progresso contínua com separadores de rodada */}
      <div className="relative flex-1 h-[10px] rounded-full overflow-hidden" style={{ backgroundColor: "#EBEBEB" }}>
        {/* Fill preenchido */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${(currentTrial / totalTrials) * 100}%`,
            backgroundColor: "#58CC02",
          }}
        />

        {/* Separadores verticais de rodada */}
        {Array.from({ length: totalRounds - 1 }, (_, i) => {
          const pct = ((i + 1) / totalRounds) * 100;
          const isBeforeCurrentPos = (currentTrial / totalTrials) * 100 > pct;
          return (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                left: `${pct}%`,
                width: 2,
                backgroundColor: isBeforeCurrentPos ? "#46A302" : "#D4D4D4",
                transform: "translateX(-50%)",
              }}
            />
          );
        })}
      </div>

      {/* Label compacto */}
      <span
        className="font-nunito font-black flex-shrink-0"
        style={{ fontSize: 14, color: "#AFAFAF", whiteSpace: "nowrap" }}
      >
        Rodada {currentRound} · {trialInRound}/{trialsPerRound}
      </span>

    </div>
  );
}
