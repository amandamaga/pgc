import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "./button";
import { ParticipantAccessLinks } from "./participant-access";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { addSessionParticipant, getSession, startSession, ResearcherApiError, type SessionDetails } from "../lib/researcher-api";

export function SessionParticipantsDialog({ sessionId, sessionName, onStarted }: { sessionId: string; sessionName: string; onStarted: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [drafts, setDrafts] = useState({
    P1: { displayName: "", participantCode: "" },
    P2: { displayName: "", participantCode: "" },
  });
  const busy = useRef(false);

  function reportError(err: unknown) {
    if (err instanceof ResearcherApiError && err.status === 401) {
      navigate("/login", { replace: true });
    } else {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os participantes.");
    }
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setDetails(null);
    setError("");
    getSession(sessionId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setDetails(data);
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      if (err instanceof ResearcherApiError && err.status === 401) navigate("/login", { replace: true });
      else setError(err instanceof Error ? err.message : "Não foi possível carregar os participantes.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [open, sessionId, revision, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>, slot: "P1" | "P2") {
    event.preventDefault();
    if (busy.current || !details || details.participants.some((p) => p.slot === slot)) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const displayName = String(data.get("displayName") ?? "").trim();
    const participantCode = String(data.get("participantCode") ?? "").trim();
    if (!displayName || !participantCode) {
      setError("Preencha o nome e o código do participante.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await addSessionParticipant(sessionId, { slot, displayName, participantCode });
      setDrafts((current) => ({ ...current, [slot]: { displayName: "", participantCode: "" } }));
      setNotice(`${slot} cadastrado com sucesso.`);
      // Recarrega o estado persistido, inclusive após cadastro parcial da dupla.
      setDetails(null);
      setRevision((value) => value + 1);
    } catch (err) {
      reportError(err);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (busy.current) return;
      setOpen(value);
      setNotice("");
    }}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="mt-3">Participantes</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Participantes da sessão</DialogTitle>
          <DialogDescription>{sessionName}</DialogDescription>
        </DialogHeader>
        {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
        {error && <div role="alert" className="text-sm text-red-700"><p>{error}</p><Button variant="outline" size="sm" className="mt-2" disabled={saving || loading} onClick={() => setRevision((value) => value + 1)}>Recarregar participantes</Button></div>}
        {loading && <p role="status" className="text-sm text-slate-500">Carregando participantes...</p>}
        {details && (["P1", "P2"] as const).map((slot) => {
          const participant = details.participants.find((p) => p.slot === slot);
          return <section key={slot} className="rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold mb-3">{slot}</h3>
            {participant ? <div className="text-sm text-slate-700"><p>{participant.displayName}</p><p>Código: {participant.participantCode}</p><p className="text-green-700 mt-2">Cadastrado</p></div>
              : details.status !== "WAITING" ? <p className="text-sm text-slate-500">Nenhum participante cadastrado.</p>
              : <form onSubmit={(event) => submit(event, slot)} className="space-y-3" aria-busy={saving}>
                <label className="block text-sm font-medium text-slate-700">Nome de exibição
                  <input name="displayName" required disabled={saving} value={drafts[slot].displayName} onChange={(event) => setDrafts((current) => ({ ...current, [slot]: { ...current[slot], displayName: event.target.value } }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Código do participante
                  <input name="participantCode" required disabled={saving} value={drafts[slot].participantCode} onChange={(event) => setDrafts((current) => ({ ...current, [slot]: { ...current[slot], participantCode: event.target.value } }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                </label>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Salvando..." : `Cadastrar ${slot}`}</Button>
              </form>}
          </section>;
        })}
        {details?.status === "WAITING" && <Button disabled={saving || !["P1", "P2"].every((slot) => details.participants.some((p) => p.slot === slot))} onClick={async () => {
          if (busy.current) return;
          busy.current = true;
          setSaving(true);
          setError("");
          try {
            await startSession(sessionId);
            onStarted();
            setNotice("Sessão iniciada. Os participantes receberão a história automaticamente.");
            setDetails(null);
            setRevision((value) => value + 1);
          } catch (err) { reportError(err); }
          finally { busy.current = false; setSaving(false); }
        }}>{saving ? "Aguarde..." : "Iniciar sessão"}</Button>}
        {details?.status === "IN_PROGRESS" && <p role="status">Sessão em andamento.</p>}
        {open && details && <ParticipantAccessLinks key={revision} sessionId={sessionId} />}
      </DialogContent>
    </Dialog>
  );
}
