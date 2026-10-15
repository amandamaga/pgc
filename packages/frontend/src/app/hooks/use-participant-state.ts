import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, createParticipantClient, HEARTBEAT_INTERVAL_MS, WAITING_STAGES, type ParticipantState, type Stage } from "../lib/participant-api";

/**
 * Situação de um marco de tempo (story-shown / next-story-available) para a
 * tentativa atual:
 *   idle    → ainda não enviado;
 *   pending → POST em andamento;
 *   done    → o servidor confirmou o registro;
 *   failed  → falhou; só um "Tentar de novo" da criança libera nova tentativa.
 */
export type MarkerStatus = "idle" | "pending" | "done" | "failed";
type MarkerKind = "storyShown" | "nextStoryAvailable";

const markerKey = (kind: MarkerKind, attemptId: string) => `${kind}:${attemptId}`;

export function useParticipantState(token: string) {
  const client = useMemo(() => createParticipantClient(token), [token]);
  const [state, setState] = useState<ParticipantState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

  // Marcos de tempo: canal separado do `run`, para não disputar o `busy` com o
  // polling nem com os POSTs de decisão. Cada marco é enviado no máximo uma vez
  // por tentativa: a chave entra em `markerSent` antes do POST sair, então um
  // re-render no meio do caminho não duplica o envio.
  const [markers, setMarkers] = useState<Record<string, MarkerStatus>>({});
  const markerSent = useRef(new Set<string>());
  const markerFailed = useRef(new Set<string>());
  const markerControllers = useRef(new Set<AbortController>());

  const run = useCallback(async (action?: (signal: AbortSignal) => Promise<ParticipantState>) => {
    if (busy.current) return;
    busy.current = true;
    const current = new AbortController();
    controller.current = current;
    setError(null);
    if (action) setSubmitting(true);
    try {
      let next: ParticipantState;
      try { next = await (action ? action(current.signal) : client.getMe(current.signal)); }
      catch (err) {
        // One refresh on conflict, never a recursive retry or automatic POST replay.
        if (action && err instanceof ApiError && err.status === 409) next = await client.getMe(current.signal);
        else throw err;
      }
      if (!current.signal.aborted) setState(next);
    } catch (err) {
      if (!current.signal.aborted) setError(err instanceof Error ? err.message : "Erro de conexão.");
    } finally {
      if (controller.current === current) {
        busy.current = false;
        if (!current.signal.aborted) { setLoading(false); setSubmitting(false); }
      }
    }
  }, [client]);

  const mark = useCallback(async (kind: MarkerKind, attemptId: string, requiredStage: Stage) => {
    const key = markerKey(kind, attemptId);
    if (markerSent.current.has(key)) return;
    markerSent.current.add(key);
    setMarkers((m) => ({ ...m, [key]: "pending" }));

    const current = new AbortController();
    markerControllers.current.add(current);
    try {
      if (kind === "storyShown") await client.postStoryShown(attemptId, current.signal);
      else await client.postNextStoryAvailable(attemptId, current.signal);
      if (!current.signal.aborted) setMarkers((m) => ({ ...m, [key]: "done" }));
    } catch (err) {
      if (current.signal.aborted) return;
      // Fica em `markerSent`: nada reenvia sozinho. Só o refresh manual libera.
      markerFailed.current.add(key);
      setMarkers((m) => ({ ...m, [key]: "failed" }));
      if (err instanceof ApiError && err.status === 409) {
        // Mesma regra dos demais POSTs: conflito → um GET de atualização,
        // nunca replay automático do POST.
        try {
          const next = await client.getMe(current.signal);
          if (current.signal.aborted) return;
          setState(next);
          // Continua na mesma tela que dependia do marco: sem ele a criança não
          // pode seguir, então mostra o erro com "Tentar de novo".
          if (next.currentAttempt?.id === attemptId && next.stage === requiredStage) setError(err.message);
        } catch (refreshErr) {
          if (!current.signal.aborted) setError(refreshErr instanceof Error ? refreshErr.message : "Erro de conexão.");
        }
      } else {
        setError(err instanceof Error ? err.message : "Erro de conexão.");
      }
    } finally {
      markerControllers.current.delete(current);
    }
  }, [client]);

  useEffect(() => {
    busy.current = false;
    setState(null);
    setLoading(true);
    markerSent.current.clear();
    markerFailed.current.clear();
    setMarkers({});
    void run();
    const markerAborts = markerControllers.current;
    return () => {
      controller.current?.abort();
      markerAborts.forEach((c) => c.abort());
      markerAborts.clear();
    };
  }, [run]);

  useEffect(() => {
    if (!state || error || !WAITING_STAGES.includes(state.stage)) return;
    const timer = setTimeout(() => { void run(); }, 1200);
    return () => clearTimeout(timer);
  }, [state, error, run]);

  // Heartbeat de presença em TODAS as telas. O polling acima só roda nas telas
  // de espera; sem isto, durante o próprio turno (julgando, punindo, lendo o
  // resultado) o lastSeenAt envelhecia e o parceiro via falso "desconectado".
  // Canal próprio: não usa `busy`, não mexe em `state` nem em `error` — uma
  // falha aqui não deve aparecer para a criança (o próximo envio tenta de novo).
  const sessionOver = state?.stage === "COMPLETED";
  useEffect(() => {
    if (sessionOver) return;
    let current: AbortController | null = null;
    const beat = () => {
      current?.abort();
      current = new AbortController();
      client.postHeartbeat(current.signal).catch(() => { /* silencioso */ });
    };
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    // Navegadores atrasam timers em aba escondida; ao voltar, avisa na hora.
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      current?.abort();
    };
  }, [client, sessionOver]);

  // "Tentar de novo" é uma ação da criança: libera os marcos que falharam para
  // que a tela possa enviá-los outra vez quando voltar ao ponto certo.
  const refresh = () => {
    if (markerFailed.current.size > 0) {
      const failed = [...markerFailed.current];
      failed.forEach((key) => markerSent.current.delete(key));
      markerFailed.current.clear();
      setMarkers((m) => {
        const next = { ...m };
        failed.forEach((key) => { delete next[key]; });
        return next;
      });
    }
    return run();
  };

  const id = state?.currentAttempt?.id;
  const storyShownStatus: MarkerStatus = id ? markers[markerKey("storyShown", id)] ?? "idle" : "idle";
  const nextStoryAvailableStatus: MarkerStatus = id ? markers[markerKey("nextStoryAvailable", id)] ?? "idle" : "idle";
  return {
    state, error, isLoading, isSubmitting,
    storyShownStatus, nextStoryAvailableStatus,
    refresh,
    markStoryShown: () => id && state?.stage === "JUDGMENT" ? mark("storyShown", id, "JUDGMENT") : undefined,
    markNextStoryAvailable: () => id && state?.stage === "RESULT" ? mark("nextStoryAvailable", id, "RESULT") : undefined,
    // Julgamento só depois de storyShownAt salvo (storyShownAt <= judgmentAt).
    submitJudgment: (judgment: "Just" | "Unjust") => id && state?.stage === "JUDGMENT" && storyShownStatus === "done" ? run((signal) => client.postJudgment(id, judgment, signal)) : undefined,
    submitPunishment: (punishment: "Punish" | "NoPunish") => id && state?.stage === "PUNISHMENT" ? run((signal) => client.postPunishment(id, punishment, signal)) : undefined,
    // Avanço só depois de nextStoryAvailableAt salvo (nextStoryAvailableAt <= resultAcknowledgedAt).
    acknowledgeResult: () => id && state?.stage === "RESULT" && nextStoryAvailableStatus === "done" ? run((signal) => client.postAcknowledge(id, signal)) : undefined,
  };
}
