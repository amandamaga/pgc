import { useSearchParams, useParams, useNavigate } from "react-router";
import { GameButton } from "../../components/game/game-button";
import { motion } from "motion/react";
import { getLang, translations } from "../../lib/game-i18n";

const TOTAL_POSSIBLE_CC = 12; // 4 tentativas × 3 CC

export function GameEndPage() {
  const { sessionId, participantId } = useParams();
  const navigate = useNavigate();
  const lang = getLang(sessionId);
  const T = translations[lang];
  const [searchParams] = useSearchParams();
  const finalCoins = parseInt(searchParams.get("coins") || "10");
  const finalPiggyBank = parseInt(searchParams.get("piggyBank") || "0");

  const basePath = sessionId && participantId
    ? `/session/${sessionId}/participant/${participantId}`
    : `/game-preview`;

  return (
    <div className="h-full flex flex-col items-center justify-center overflow-y-auto px-4 py-4" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="max-w-sm w-full flex flex-col gap-4">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
          className="flex justify-center"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4"
            style={{ backgroundColor: "#FFD900", borderColor: "#FFFFFF" }}
          >
            <svg width="44" height="44" viewBox="0 0 72 72" fill="none">
              <rect x="24" y="12" width="24" height="28" rx="12" fill="#CE9200" />
              <path d="M10 18 Q10 32 24 32" stroke="#CE9200" strokeWidth="6" strokeLinecap="round" fill="none" />
              <path d="M62 18 Q62 32 48 32" stroke="#CE9200" strokeWidth="6" strokeLinecap="round" fill="none" />
              <rect x="30" y="40" width="12" height="12" fill="#CE9200" />
              <rect x="20" y="52" width="32" height="8" rx="4" fill="#CE9200" />
            </svg>
          </div>
        </motion.div>

        {/* Result Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-5 shadow-sm border-2 border-b-[5px]"
          style={{ borderColor: "#58CC02" }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-nunito font-black text-2xl text-center mb-1"
            style={{ color: "#3C3C3C" }}
          >
            Parabéns!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-nunito font-bold text-sm text-center mb-4"
            style={{ color: "#58CC02" }}
          >
            Vocês terminaram!
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <div className="rounded-2xl px-4 py-3 border-2 flex items-center justify-between"
              style={{ backgroundColor: "#F0FFF4", borderColor: "#58CC02" }}>
              <p className="font-nunito font-bold text-sm" style={{ color: "#3C3C3C" }}>Suas moedas</p>
              <span className="font-nunito font-black text-xl" style={{ color: "#58CC02" }}>{finalCoins}</span>
            </div>

            <div className="rounded-2xl px-4 py-3 border-2 flex items-center justify-between"
              style={{ backgroundColor: "#FFF8EC", borderColor: "#FF9600" }}>
              <p className="font-nunito font-bold text-sm" style={{ color: "#3C3C3C" }}>Moedas da turma</p>
              <span className="font-nunito font-black text-xl" style={{ color: "#FF9600" }}>
                {finalPiggyBank} <span className="text-sm font-bold" style={{ color: "#AFAFAF" }}>de {TOTAL_POSSIBLE_CC}</span>
              </span>
            </div>

            <div className="rounded-2xl px-4 py-3 border-2" style={{ backgroundColor: "#F7F7F7", borderColor: "#E5E5E5" }}>
              <p className="font-nunito font-bold text-xs text-center leading-relaxed" style={{ color: "#8B8B8B" }}>
                {T.thankYou}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Jogar novamente */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="space-y-2"
        >
          <GameButton onClick={() => navigate(basePath)} className="w-full">
            Jogar novamente
          </GameButton>
          <p className="text-center font-nunito font-bold text-xs" style={{ color: "#AFAFAF" }}>
            {T.canClose}
          </p>
        </motion.div>
      </div>
    </div>
  );
}