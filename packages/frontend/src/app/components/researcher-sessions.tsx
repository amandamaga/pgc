import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "./button";
import { CreateSessionDialog } from "./create-session-dialog";
import { SessionParticipantsDialog } from "./session-participants-dialog";
import { listSessions, ResearcherApiError, type ResearcherSession } from "../lib/researcher-api";

const statuses = {
  WAITING: { label: "Aguardando início", style: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_PROGRESS: { label: "Em execução", style: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Concluída", style: "bg-green-50 text-green-700 border-green-200" },
};

export function ResearcherSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ResearcherSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSessions([]);
    listSessions(controller.signal).then((data) => {
      if (!controller.signal.aborted) setSessions(data);
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      if (err instanceof ResearcherApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Erro ao conectar com o servidor.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [navigate, revision]);

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8" aria-label="Sessões da pesquisadora" aria-busy={loading}>
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sessões da pesquisadora</h2>
          <p className="text-sm text-slate-500">Todas as suas sessões salvas no servidor, ainda sem vínculo com experimentos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Atualizar</Button>
          <CreateSessionDialog onCreated={() => setRevision((value) => value + 1)} />
        </div>
      </div>
      {loading ? <p role="status" className="p-6 text-sm text-slate-500">Carregando sessões...</p>
        : error ? <div role="alert" className="p-6 text-sm text-red-700"><p className="mb-3">{error}</p><Button variant="outline" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button></div>
        : sessions.length === 0 ? <p className="p-6 text-sm text-slate-500">Nenhuma sessão cadastrada no servidor.</p>
        : <div className="divide-y divide-slate-200">{sessions.map((session) => {
          const status = statuses[session.status];
          return <div key={session.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className="font-medium text-slate-900">{session.name}</h3>
              <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium border " + (status?.style ?? "border-slate-200")}>{status?.label ?? session.status}</span>
            </div>
            <p className="text-sm text-slate-600">Criada em {new Date(session.createdAt).toLocaleString("pt-BR")} · Sequência {session.sequenceVariant}</p>
            <SessionParticipantsDialog sessionId={session.id} sessionName={session.name} onStarted={() => setSessions((current) => current.map((item) => item.id === session.id ? { ...item, status: "IN_PROGRESS" } : item))} />
            <Button variant="outline" size="sm" className="mt-3 ml-2" onClick={() => navigate(`/researcher/sessions/${encodeURIComponent(session.id)}/monitor`)}>Monitorar sessão</Button>
          </div>;
        })}</div>}
    </section>
  );
}
