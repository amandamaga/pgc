export type Stage =
  | "WAITING_SESSION"
  | "JUDGMENT"
  | "WAITING_JUDGMENT_PARTNER"
  | "PUNISHMENT"
  | "WAITING_PUNISHMENT_PARTNER"
  | "RESULT"
  | "WAITING_RESULT_PARTNER"
  | "COMPLETED";

export interface CurrentAttempt {
  id: string;
  endowment: number;
  distributorDistribution: number;
  receptorDistribution: number;
  distributorCharacter: string;
  receptorCharacter: string;
}

export interface DistributorResult {
  character: string;
  finalCoins: number;
  coinsLost: number;
}

export interface TrialResult {
  ownIndividualCost: number;
  ownCoinsAfter: number;
  punishmentApplied: boolean;
  distributorResult: DistributorResult | null;
  culturalConsequence: number;
  groupCoinsAfter: number;
}

export interface ParticipantInfo {
  id: string;
  slot: "P1" | "P2";
  displayName: string;
  participantCode: string;
  joinedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  name: string;
  status: string;
}

// O nome do parceiro está sempre presente; judgment e punishment só chegam
// preenchidos depois que este participante respondeu a mesma etapa.
export interface PartnerInfo {
  slot: "P1" | "P2";
  displayName: string;
  judgment: "Just" | "Unjust" | null;
  punishment: "Punish" | "NoPunish" | null;
  hasAck: boolean;
  coinsAfter: number | null;
  // Segundos desde a última vez que o parceiro buscou o próprio estado,
  // calculado no servidor. Null se o parceiro nunca foi visto. Não é um
  // heartbeat: cresce normalmente durante o turno do parceiro (quando ele
  // não está numa etapa de espera e por isso não faz polling) — só deve ser
  // usado com uma janela de tolerância longa (60-90s) para detectar desconexão.
  secondsSinceSeen: number | null;
}

// A própria resposta desta tentativa, para a tela sobreviver a um refresh.
export interface OwnResponseInfo {
  judgment: "Just" | "Unjust" | null;
  punishment: "Punish" | "NoPunish" | null;
  hasAck: boolean;
}

export interface ParticipantState {
  participant: ParticipantInfo;
  session: SessionInfo;
  stage: Stage;
  currentAttempt: CurrentAttempt | null;
  trialResult: TrialResult | null;
  partner: PartnerInfo | null;
  own: OwnResponseInfo;
  balances: Balances;
}

// Saldos correntes — presentes em todo estágio, inclusive antes do resultado.
export interface Balances {
  ownCoins: number;
  partnerCoins: number;
  groupCoins: number;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Each client owns its token. Real access never falls back to simulation.
export function createParticipantClient(token: string) {
  async function request(path: string, signal?: AbortSignal, body?: object): Promise<ParticipantState> {
    if (!token) throw new ApiError(401, "Este link está incompleto. Peça um novo acesso à pesquisadora.");
    const base = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
    if (!base) throw new Error("A conexão não está configurada. Avise a pesquisadora.");
    const response = await fetch(base + path, {
      signal, cache: "no-store", method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) throw new ApiError(401, "Este acesso não é válido. Peça um novo link à pesquisadora.");
    if (!response.ok) throw new ApiError(response.status, "Não foi possível atualizar o jogo. Tente novamente.");
    const data = await response.json();
    if (!data?.participant || !STAGES.includes(data.stage)) throw new Error("O servidor retornou um estado inválido.");
    if (["JUDGMENT", "PUNISHMENT", "RESULT"].includes(data.stage) && !data.currentAttempt?.id) throw new Error("O servidor não informou a história atual.");
    if (data.stage === "RESULT" && !data.trialResult) throw new Error("O servidor não informou o resultado.");
    return data;
  }
  const attemptPath = (id: string) => `/participant/attempts/${encodeURIComponent(id)}`;
  return {
    getMe: (signal?: AbortSignal) => request("/participant/me", signal),
    postJudgment: (id: string, judgment: "Just" | "Unjust", signal?: AbortSignal) => request(attemptPath(id) + "/judgment", signal, { judgment }),
    postPunishment: (id: string, punishment: "Punish" | "NoPunish", signal?: AbortSignal) => request(attemptPath(id) + "/punishment", signal, { punishment }),
    postAcknowledge: (id: string, signal?: AbortSignal) => request(attemptPath(id) + "/result/acknowledge", signal, {}),
  };
}
export const WAITING_STAGES: Stage[] = ["WAITING_SESSION", "WAITING_JUDGMENT_PARTNER", "WAITING_PUNISHMENT_PARTNER", "WAITING_RESULT_PARTNER"];
const STAGES: Stage[] = [...WAITING_STAGES, "JUDGMENT", "PUNISHMENT", "RESULT", "COMPLETED"];
