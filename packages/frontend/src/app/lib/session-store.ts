import type { Lang } from "./game-i18n";

export type SessionLanguageCode = "pt-BR" | "no-NO";

export interface SessionRecord {
  id: string;
  language: SessionLanguageCode;
}

const KEY = (id: string) => `session:${id}`;

export function langCodeToLang(code: SessionLanguageCode): Lang {
  return code === "no-NO" ? "no" : "pt";
}

export function langToCode(lang: Lang): SessionLanguageCode {
  return lang === "no" ? "no-NO" : "pt-BR";
}

export function saveSession(rec: SessionRecord): void {
  sessionStorage.setItem(KEY(rec.id), JSON.stringify(rec));
}

export function getSession(id: string): SessionRecord | null {
  const raw = sessionStorage.getItem(KEY(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export function getSessionLanguage(id: string | undefined): Lang | null {
  if (!id) return null;
  const rec = getSession(id);
  return rec ? langCodeToLang(rec.language) : null;
}
