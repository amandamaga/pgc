import { motion, AnimatePresence } from "motion/react";
import type { Lang, translations } from "../../lib/game-i18n";

type GameStrings = (typeof translations)[Lang];

// Tela de espera da dupla, com dados reais. Diferente do aviso de desconexão:
// aqui o parceiro ainda NÃO chegou, o que é normal e não é motivo de alarme.
export function PartnerWaiting({
  partnerName,
  partnerReady,
  t,
}: {
  partnerName: string;
  partnerReady: boolean;
  t: GameStrings;
}) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center px-6 gap-6"
      style={{ backgroundColor: "#F7F7F7" }}
    >
      <motion.div
        animate={partnerReady ? { scale: [1, 1.18, 1] } : {}}
        transition={{ duration: 0.5 }}
        className="w-28 h-28 rounded-full flex items-center justify-center border-4 shadow-lg"
        style={{
          backgroundColor: partnerReady ? "#58CC02" : "#1CB0F6",
          borderColor: "#FFFFFF",
          transition: "background-color 0.4s ease",
        }}
      >
        <AnimatePresence mode="wait">
          {partnerReady ? (
            <motion.svg key="check"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 16 }}
              width="56" height="56" viewBox="0 0 56 56" fill="none">
              <path d="M14 28 L24 38 L42 18" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          ) : (
            <motion.svg key="spin"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="18" stroke="white" strokeWidth="4" opacity="0.25" />
              <path d="M40 22a18 18 0 01-18 18" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="text-center space-y-1">
        <h1 className="font-nunito font-black text-3xl" style={{ color: "#3C3C3C" }}>
          {partnerReady ? t.allReady : t.waitingFor(partnerName)}
        </h1>
        <p className="font-nunito font-bold text-lg"
          style={{ color: partnerReady ? "#58CC02" : "#1CB0F6" }}>
          {partnerReady ? t.gameStarting : t.partnerNotReady(partnerName)}
        </p>
      </div>

      <AnimatePresence>
        {!partnerReady && (
          <motion.div key="dots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex gap-2.5">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-3 h-3 rounded-full"
                style={{ backgroundColor: "#1CB0F6" }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14 }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xs bg-white rounded-3xl border-2 border-b-[4px] px-6 py-5 shadow-sm"
        style={{ borderColor: "#E5E5E5" }}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm relative"
              style={{ backgroundColor: "#58CC02", border: "3px solid white" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="9" r="5" fill="white" />
                <ellipse cx="14" cy="21" rx="8" ry="6" fill="white" />
              </svg>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{ backgroundColor: "#58CC02", borderColor: "white" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5 L4 7.5 L8.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <p className="font-nunito font-black text-xs" style={{ color: "#3C3C3C" }}>{t.you}</p>
          </div>

          <div className="flex-1 flex items-center gap-1">
            {[0, 1, 2, 3].map((i) => (
              <motion.div key={i} className="flex-1 h-1 rounded-full"
                style={{ backgroundColor: partnerReady ? "#58CC02" : "#E5E5E5", transition: "background-color 0.4s ease" }}
                animate={!partnerReady ? { opacity: [0.3, 1, 0.3] } : {}}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              animate={{ backgroundColor: partnerReady ? "#1CB0F6" : "#CACACA" }}
              transition={{ duration: 0.4 }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm relative"
              style={{ border: "3px solid white" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="9" r="5" fill="white" />
                <ellipse cx="14" cy="21" rx="8" ry="6" fill="white" />
              </svg>
              <AnimatePresence>
                {partnerReady && (
                  <motion.div key="badge"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ backgroundColor: "#1CB0F6", borderColor: "white" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5 L4 7.5 L8.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <p className="font-nunito font-black text-xs"
              style={{ color: partnerReady ? "#3C3C3C" : "#8B8B8B" }}>
              {partnerName}
            </p>
          </div>
        </div>

        <p className="font-nunito font-bold text-sm text-center mt-4"
          style={{ color: partnerReady ? "#1CB0F6" : "#AFAFAF" }}>
          {partnerReady ? t.pairComplete : t.waitingConnection}
        </p>
      </div>
    </div>
  );
}
