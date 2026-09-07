import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { GameButton } from "../../components/game/game-button";
import { motion, AnimatePresence } from "motion/react";
import { getLang, translations } from "../../lib/game-i18n";
import tutorialVideoSrc from "../../../imports/Instru__o_do_Jogo.mp4";

const mockExperimentConfig = {
  enableTutorialVideo: true,
};


export function GameIntroPage() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();

  const [step, setStep] = useState<1 | 2>(1);
  const lang = getLang(sessionId);
  const [playerName, setPlayerName] = useState("");
  const [touched, setTouched] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const T = translations[lang];
  const trimmed = playerName.trim();
  const isValid = trimmed.length >= 1;
  const showError = touched && !isValid;

  const handleNext = () => {
    if (!isValid) { setTouched(true); inputRef.current?.focus(); return; }
    sessionStorage.setItem("playerName", trimmed);
    setStep(2);
  };

  const handleStart = () => {
    if (sessionId && participantId) {
      navigate(`/session/${sessionId}/participant/${participantId}/waiting`);
    } else {
      navigate(`/game-preview/waiting`);
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: "#F7F7F7" }}>
      <div className="flex flex-col items-center justify-center min-h-full p-6">
        <div className="w-full max-w-sm">

          <AnimatePresence mode="wait">

            {/* ══ PASSO 1 — NOME ════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="screen-name"
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="flex flex-col items-center gap-6"
              >
                {/* Mascot */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-full flex items-center justify-center shadow-xl border-4"
                  style={{ backgroundColor: "#58CC02", borderColor: "#FFFFFF" }}
                >
                  <svg width="60" height="60" viewBox="0 0 56 56" fill="none">
                    <rect x="8" y="20" width="40" height="24" rx="6" fill="white" />
                    <circle cx="18" cy="32" r="3" fill="#58CC02" />
                    <circle cx="38" cy="32" r="3" fill="#58CC02" />
                    <rect x="24" y="28" width="8" height="2" rx="1" fill="#58CC02" />
                    <rect x="27" y="25" width="2" height="8" rx="1" fill="#58CC02" />
                  </svg>
                </motion.div>

                {/* Title */}
                <div className="text-center">
                  <h1 className="font-nunito font-black text-5xl mb-1" style={{ color: "#3C3C3C" }}>
                    {T.hello}
                  </h1>
                  <p className="font-nunito font-black text-2xl" style={{ color: "#8B8B8B" }}>
                    {T.whatIsYourName}
                  </p>
                </div>

                {/* Input */}
                <div className="w-full">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onBlur={() => setTouched(true)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
                      placeholder={T.namePlaceholder}
                      maxLength={24}
                      autoComplete="off"
                      autoFocus
                      className="w-full rounded-3xl border-2 border-b-[6px] px-6 py-5 font-nunito font-black text-2xl text-center outline-none transition-all duration-200 shadow-sm"
                      style={{
                        borderColor: isValid ? "#46A302" : showError ? "#EA2B2B" : "#CACACA",
                        backgroundColor: isValid ? "#58CC02" : showError ? "#FF4B4B" : "#FFFFFF",
                        color: isValid || showError ? "#FFFFFF" : "#3C3C3C",
                      }}
                    />
                    <AnimatePresence>
                      {isValid && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 320, damping: 18 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
                        >
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M3.5 9 L7.5 13 L14.5 5.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="h-7 mt-2 text-center">
                    <AnimatePresence mode="wait">
                      {showError && (
                        <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="font-nunito font-black text-base" style={{ color: "#FF4B4B" }}>
                          {T.writeYourName}
                        </motion.p>
                      )}
                      {isValid && (
                        <motion.p key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          className="font-nunito font-black text-base" style={{ color: "#46A302" }}>
                          {T.hiName(trimmed)}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="w-full">
                  <GameButton onClick={handleNext} size="xl" className="w-full" disabled={!isValid}>
                    <span className="flex items-center justify-center gap-2">
                      {T.next}
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M8 5 L15 11 L8 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </GameButton>
                </div>
              </motion.div>
            )}

            {/* ══ PASSO 2 — TUTORIAL / COMEÇAR ══════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="screen-start"
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, ease: "easeInOut" }}
                className="flex flex-col items-center gap-5"
              >
                {/* Player tag */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-24 h-24 rounded-full flex items-center justify-center border-4 shadow-lg"
                    style={{ backgroundColor: "#1CB0F6", borderColor: "#FFFFFF" }}>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <circle cx="24" cy="16" r="9" fill="white" />
                      <ellipse cx="24" cy="36" rx="14" ry="10" fill="white" />
                    </svg>
                  </div>
                  <div className="rounded-2xl border-2 border-b-[4px] px-5 py-2 shadow-sm"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#1CB0F6" }}>
                    <p className="font-nunito font-black text-2xl" style={{ color: "#1CB0F6" }}>
                      {trimmed}
                    </p>
                  </div>
                </motion.div>

                {/* Video inline */}
                <AnimatePresence>
                  {showVideo && (
                    <motion.div key="video"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="w-full overflow-hidden">
                      <div className="rounded-3xl overflow-hidden border-2 border-b-[5px] shadow-sm"
                        style={{ borderColor: "#1CB0F6" }}>
                        <div className="h-1.5" style={{ backgroundColor: "#1CB0F6" }} />
                        <div className="p-4">
                          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900">
                            <video
                              src={tutorialVideoSrc}
                              controls
                              playsInline
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="w-full space-y-3"
                >
                  <GameButton onClick={handleStart} size="xl" className="w-full">
                    {T.start}
                  </GameButton>

                  {mockExperimentConfig.enableTutorialVideo && (
                    <GameButton variant="blue" size="xl" className="w-full" onClick={() => setShowVideo((v) => !v)}>
                      <span className="flex items-center justify-center gap-2">
                        {showVideo ? (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M6 4 L16 10 L6 16 Z" fill="currentColor" />
                          </svg>
                        )}
                        {showVideo ? T.closeVideo : T.watchTutorial}
                      </span>
                    </GameButton>
                  )}

                  <button onClick={() => { setStep(1); setShowVideo(false); }}
                    className="w-full py-2 font-nunito font-bold text-base" style={{ color: "#AFAFAF" }}>
                    {T.back}
                  </button>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
