import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../components/button";
import { SessionParticipantsDialog } from "../components/session-participants-dialog";
import {
  downloadSessionExport,
  getSessionPanel,
  ResearcherApiError,
  saveResearcherFile,
  type SessionExportKind,
  type SessionPanel,
} from "../lib/researcher-api";
import type { Stage } from "../lib/participant-api";

const stageLabels: Record<Stage, string> = {
  WAITING_SESSION: "Aguardando início",
  JUDGMENT: "Respondendo justo/injusto",
  WAITING_JUDGMENT_PARTNER: "Aguardando julgamento do parceiro",
  PUNISHMENT: "Respondendo punir/não punir",
  WAITING_PUNISHMENT_PARTNER: "Aguardando punição do parceiro",
  RESULT: "Visualizando resultado",
  WAITING_RESULT_PARTNER: "Aguardando confirmação do parceiro",
  COMPLETED: "Concluído",
};
const statusLabels = { WAITING: "Aguardando início", IN_PROGRESS: "Em execução", COMPLETED: "Concluída" };
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";

export function ResearcherSessionPanelPage() {
  const { sessionId } = useParams();
  // Remount on navigation to prevent showing data from the previous session.
  return <SessionPanelView key={sessionId} sessionId={sessionId ?? ""} />;
}

function SessionPanelView({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [panel, setPanel] = useState<SessionPanel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState<SessionExportKind | null>(null);
  const [exportError, setExportError] = useState("");

  async function handleExport(kind: SessionExportKind) {
    if (exporting) return;
    setExporting(kind);
    setExportError("");
    try {
      // O CSV vem pronto do backend; o frontend só entrega o arquivo.
      saveResearcherFile(await downloadSessionExport(sessionId, kind));
    } catch (err) {
      if (err instanceof ResearcherApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setExportError(err instanceof Error ? err.message : "Não foi possível exportar os dados da sessão.");
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSessionPanel(sessionId, controller.signal);
        if (controller.signal.aborted) return;
        setPanel(data);
        setUpdatedAt(new Date().toISOString());
        if (data.session.status !== "COMPLETED") timer = setTimeout(() => { void load(); }, 2000);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ResearcherApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (err instanceof ResearcherApiError && (err.status === 403 || err.status === 404)) setPanel(null);
        setError(err instanceof Error ? err.message : "Não foi possível atualizar o painel.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [sessionId, revision, navigate]);

  return <main className="flex-1 bg-slate-50 p-6 lg:p-8">
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/researcher" className="text-sm text-slate-600 hover:text-slate-900">← Voltar para sessões</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold text-slate-900">{panel?.session.name ?? "Painel da sessão"}</h1>
          {panel && <p className="text-sm text-slate-600 mt-2">{statusLabels[panel.session.status]} · Sequência {panel.session.sequenceVariant}</p>}
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Atualizar painel</Button>
      </header>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"><p>{error}</p>{panel && <p className="mt-2">Os dados abaixo são da última atualização bem-sucedida.</p>}<Button variant="outline" className="mt-3" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button></div>}
      {!panel && loading && <p role="status">Carregando painel...</p>}
      {panel && <>
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4" aria-label="Progresso da sessão">
          <h2 className="font-semibold">Progresso da sessão</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {([['Tentativa atual', panel.progress.activeAttemptNumber ?? '—'], ['Tentativas criadas', panel.progress.totalAttempts], ['Finalizadas', panel.progress.finalizedAttempts], ['Confirmadas pela dupla', panel.progress.acknowledgedAttempts]] as const).map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="text-2xl font-semibold mt-1">{value}</dd></div>)}
          </dl>
          <p className="text-sm text-slate-500">Finalizadas: resultado resolvido. Confirmadas: os dois participantes já confirmaram o resultado.</p>
          <p className="text-sm text-slate-600">Início: {dateLabel(panel.session.startedAt)} · Encerramento: {dateLabel(panel.session.completedAt)}</p>
        </section>
        <section aria-label="Estado dos participantes" className="grid sm:grid-cols-2 gap-6">
          {(["P1", "P2"] as const).map((slot) => {
            const participant = panel.participants.find((item) => item.slot === slot);
            return <div key={slot} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold">{slot}{participant ? ` · ${participant.displayName}` : ""}</h2>
              {participant ? <><p className="text-sm text-slate-600">Código: {participant.participantCode}</p><p className="rounded-md bg-blue-50 text-blue-800 p-3">{stageLabels[participant.stage] ?? "Estado desconhecido"}</p><p className="text-sm text-slate-500">Primeiro acesso: {participant.joinedAt ? dateLabel(participant.joinedAt) : "Ainda não acessou"}</p><p className="text-sm text-slate-500">Último acesso: {dateLabel(participant.lastSeenAt)}</p></> : <p className="text-slate-500">Participante não cadastrado.</p>}
            </div>;
          })}
        </section>
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4" aria-label="Exportação de dados">
          <h2 className="font-semibold">Exportar dados</h2>
          <p className="text-sm text-slate-600">Os arquivos são gerados pelo servidor a partir das tentativas registradas. Exportar antes do encerramento traz apenas o que já foi resolvido.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={exporting !== null} onClick={() => { void handleExport("raw"); }}>
              {exporting === "raw" ? "Baixando..." : "Baixar CSV completo"}
            </Button>
            <Button variant="outline" disabled={exporting !== null} onClick={() => { void handleExport("model"); }}>
              {exporting === "model" ? "Baixando..." : "Baixar CSV para modelagem"}
            </Button>
          </div>
          {exportError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{exportError}</div>}
        </section>
        <SessionParticipantsDialog sessionId={sessionId} sessionName={panel.session.name} onStarted={() => setRevision((value) => value + 1)} />
        <p className="text-xs text-slate-500">Última atualização: {dateLabel(updatedAt)}. {panel.session.status === "COMPLETED" ? "Sessão encerrada." : "Atualização automática a cada 2 segundos."}</p>
      </>}
    </div>
  </main>;
}
