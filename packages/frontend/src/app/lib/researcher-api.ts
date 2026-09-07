import type { Stage } from "./participant-api";

export class ResearcherApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ResearcherApiError";
  }
}

export function clearResearcherAuth() {
  localStorage.removeItem("researcherToken");
  localStorage.removeItem("researcher");
}

// Autenticação e URL base ficam concentradas aqui; JSON e arquivos compartilham a mesma camada.
async function researcherFetch(path: string, accept: string, options: RequestInit): Promise<Response> {
  const token = localStorage.getItem("researcherToken");
  if (!token) {
    clearResearcherAuth();
    throw new ResearcherApiError(401, "Entre novamente para continuar.");
  }
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "");
  if (!baseUrl) throw new Error("Configure VITE_API_BASE_URL para conectar ao servidor.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", "Bearer " + token);
  headers.set("Accept", accept);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(baseUrl + path, { ...options, headers });
  if (response.status === 401) {
    clearResearcherAuth();
    throw new ResearcherApiError(401, "Sua sessão expirou. Entre novamente.");
  }
  return response;
}

// O backend responde erro sempre em JSON ({ error }), inclusive nas rotas de CSV.
async function researcherErrorFrom(response: Response, fallbackMessage: string): Promise<ResearcherApiError> {
  const body = await response.json().catch(() => null);
  return new ResearcherApiError(response.status,
    typeof body?.error === "string" ? body.error : fallbackMessage);
}

export async function researcherRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await researcherFetch(path, "application/json", options);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ResearcherApiError(response.status,
      typeof body?.error === "string" ? body.error : "Não foi possível carregar os dados do servidor.");
  }
  if (body === null) throw new Error("O servidor retornou uma resposta JSON inválida.");
  return body as T;
}

// Contrato de listSessions em packages/backend/src/services/session.service.ts.
export interface ResearcherSession {
  id: string;
  name: string;
  sequenceVariant: "ABAC" | "ACAB" | "BCBC" | "CBCB";
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { attempts: number };
}

export async function listSessions(signal?: AbortSignal): Promise<ResearcherSession[]> {
  const sessions = await researcherRequest<ResearcherSession[]>("/sessions", { signal, cache: "no-store" });
  if (!Array.isArray(sessions)) throw new Error("O servidor retornou uma lista de sessões inválida.");
  return sessions;
}

export interface CreateSessionInput {
  name: string;
  sequenceVariant: ResearcherSession["sequenceVariant"];
}

// POST retorna a Session criada, sem o _count incluído na listagem.
export function createSession(input: CreateSessionInput) {
  return researcherRequest<Omit<ResearcherSession, "_count">>("/sessions", {
    method: "POST",
    body: JSON.stringify({ name: input.name.trim(), sequenceVariant: input.sequenceVariant }),
  });
}

export interface SessionParticipant {
  id: string;
  slot: "P1" | "P2";
  displayName: string;
  participantCode: string;
}

export interface SessionDetails extends ResearcherSession {
  participants: SessionParticipant[];
}

export interface SessionPanel {
  session: Pick<ResearcherSession, "id" | "name" | "sequenceVariant" | "status" | "startedAt" | "completedAt">;
  participants: (SessionParticipant & { joinedAt: string | null; lastSeenAt: string | null; stage: Stage })[];
  progress: { totalAttempts: number; finalizedAttempts: number; acknowledgedAttempts: number; activeAttemptNumber: number | null };
}

export function getSessionPanel(sessionId: string, signal?: AbortSignal) {
  return researcherRequest<SessionPanel>(`/sessions/${encodeURIComponent(sessionId)}/panel`, { signal, cache: "no-store" });
}

export interface ParticipantAccess {
  slot: "P1" | "P2";
  displayName: string;
  participantCode: string;
  accessToken: string;
}

export function getParticipantAccess(sessionId: string, signal?: AbortSignal) {
  return researcherRequest<ParticipantAccess[]>(`/sessions/${encodeURIComponent(sessionId)}/participant-access`, { signal, cache: "no-store" });
}

export function startSession(sessionId: string) {
  return researcherRequest<Omit<ResearcherSession, "_count">>(`/sessions/${encodeURIComponent(sessionId)}/start`, { method: "POST" });
}

export function getSession(sessionId: string, signal?: AbortSignal) {
  return researcherRequest<SessionDetails>(`/sessions/${encodeURIComponent(sessionId)}`, { signal, cache: "no-store" });
}

export async function addSessionParticipant(sessionId: string, input: Omit<SessionParticipant, "id">): Promise<void> {
  // A resposta de criação contém accessToken; não o armazenamos neste fluxo.
  await researcherRequest(`/sessions/${encodeURIComponent(sessionId)}/participants`, {
    method: "POST",
    body: JSON.stringify({ slot: input.slot, displayName: input.displayName.trim(), participantCode: input.participantCode.trim() }),
  });
}

// ---------------------------------------------------------------------------
// Exportação CSV — os arquivos são gerados inteiramente pelo backend.
// ---------------------------------------------------------------------------

export type SessionExportKind = "raw" | "model";

export interface ResearcherFile {
  blob: Blob;
  filename: string;
}

// Rotas e sufixos espelham packages/backend/src/http/session.router.ts.
const EXPORT_ROUTES: Record<SessionExportKind, { path: string; suffix: string }> = {
  raw: { path: "export.csv", suffix: ".csv" },
  model: { path: "export-model.csv", suffix: "-model.csv" },
};

// Remove diretórios e caracteres inválidos de um nome de arquivo.
function safeFilename(value: string): string {
  const base = value.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f"<>:|?*]/g, "").trim();
}

// Content-Disposition só chega ao JS se o backend expuser o header via CORS.
// Sem ele, usamos o mesmo nome que o backend geraria.
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      const decoded = safeFilename(decodeURIComponent(encoded[1].trim()));
      if (decoded) return decoded;
    } catch {
      // Header malformado: segue para o formato simples.
    }
  }
  const plain = /filename\s*=\s*"([^"]*)"|filename\s*=\s*([^;]+)/i.exec(header);
  const raw = plain?.[1] ?? plain?.[2];
  const name = raw ? safeFilename(raw) : "";
  return name || null;
}

export async function downloadSessionExport(
  sessionId: string,
  kind: SessionExportKind,
  signal?: AbortSignal,
): Promise<ResearcherFile> {
  const route = EXPORT_ROUTES[kind];
  const response = await researcherFetch(
    `/sessions/${encodeURIComponent(sessionId)}/${route.path}`,
    "text/csv",
    { signal, cache: "no-store" },
  );
  if (!response.ok) {
    throw await researcherErrorFrom(response, "Não foi possível exportar os dados da sessão.");
  }
  // Nunca salvar uma resposta de erro como se fosse CSV.
  if ((response.headers.get("Content-Type") ?? "").includes("application/json")) {
    throw await researcherErrorFrom(response, "O servidor não retornou um arquivo CSV.");
  }
  const blob = await response.blob();
  const fallback = safeFilename(`session-${sessionId}${route.suffix}`) || `session${route.suffix}`;
  return {
    blob,
    filename: filenameFromDisposition(response.headers.get("Content-Disposition")) ?? fallback,
  };
}

// Entrega o Blob ao navegador como download.
export function saveResearcherFile({ blob, filename }: ResearcherFile) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revogar imediatamente pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
