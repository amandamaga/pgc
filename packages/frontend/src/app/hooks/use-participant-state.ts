import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, createParticipantClient, WAITING_STAGES, type ParticipantState } from "../lib/participant-api";

export function useParticipantState(token: string) {
  const client = useMemo(() => createParticipantClient(token), [token]);
  const [state, setState] = useState<ParticipantState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const controller = useRef<AbortController | null>(null);

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

  useEffect(() => {
    busy.current = false;
    setState(null);
    setLoading(true);
    void run();
    return () => { controller.current?.abort(); };
  }, [run]);

  useEffect(() => {
    if (!state || error || !WAITING_STAGES.includes(state.stage)) return;
    const timer = setTimeout(() => { void run(); }, 1200);
    return () => clearTimeout(timer);
  }, [state, error, run]);

  const id = state?.currentAttempt?.id;
  return {
    state, error, isLoading, isSubmitting,
    refresh: () => run(),
    submitJudgment: (judgment: "Just" | "Unjust") => id && state?.stage === "JUDGMENT" ? run((signal) => client.postJudgment(id, judgment, signal)) : undefined,
    submitPunishment: (punishment: "Punish" | "NoPunish") => id && state?.stage === "PUNISHMENT" ? run((signal) => client.postPunishment(id, punishment, signal)) : undefined,
    acknowledgeResult: () => id && state?.stage === "RESULT" ? run((signal) => client.postAcknowledge(id, signal)) : undefined,
  };
}
