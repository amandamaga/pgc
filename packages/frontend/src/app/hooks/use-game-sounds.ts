import { useCallback } from "react";
import perdeuSrc from "../../imports/Perdeu.mp3";
import ganhouSrc from "../../imports/Ganhou.mp3";

export function useGameSounds() {
  const playSound = useCallback((type: "punish" | "culturant") => {
    const src = type === "punish" ? perdeuSrc : ganhouSrc;
    const audio = new Audio(src);
    audio.volume = 0.7;
    audio.play().catch(() => {});
  }, []);

  const playPunishmentSound = useCallback(() => playSound("punish"), [playSound]);
  const playCulturantSound = useCallback(() => playSound("culturant"), [playSound]);

  return { playSound, playPunishmentSound, playCulturantSound };
}
