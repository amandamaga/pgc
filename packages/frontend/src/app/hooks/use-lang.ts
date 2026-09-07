import { useState, useEffect } from "react";
import type { Lang } from "../lib/game-i18n";

export function useLang(sessionId?: string): Lang {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("researchLang") as Lang) || "pt";
  });

  useEffect(() => {
    const handler = () => {
      const l = localStorage.getItem("researchLang") as Lang;
      if (l) setLang(l);
    };
    window.addEventListener("langchange", handler as EventListener);
    return () => window.removeEventListener("langchange", handler as EventListener);
  }, []);

  return lang;
}
