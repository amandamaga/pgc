import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
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

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const dateLabel = (value: string | null) => (value ? dateFormat.format(new Date(value)) : "—");

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

  const metrics = panel
    ? ([
        ["Tentativa atual", panel.progress.activeAttemptNumber ?? "—"],
        ["Tentativas criadas", panel.progress.totalAttempts],
        ["Finalizadas", panel.progress.finalizedAttempts],
        ["Confirmadas pela dupla", panel.progress.acknowledgedAttempts],
      ] as const)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          Atualizar painel
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{error}</span>
            {panel && <span>Os dados abaixo são da última atualização bem-sucedida.</span>}
            <Button variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!panel && loading && (
        <div className="space-y-6">
          <span className="sr-only" role="status">Carregando painel</span>
          <Skeleton className="h-36 w-full" />
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
      )}

      {panel && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progresso da sessão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {metrics.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-sm">{label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-sm">
                Finalizadas: resultado resolvido. Confirmadas: os dois participantes já
                confirmaram o resultado.
              </p>
              <p className="text-muted-foreground text-sm">
                Início: {dateLabel(panel.session.startedAt)} · Encerramento:{" "}
                {dateLabel(panel.session.completedAt)}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            {(["P1", "P2"] as const).map((slot) => {
              const participant = panel.participants.find((item) => item.slot === slot);
              return (
                <Card key={slot}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {slot}
                      {participant ? ` · ${participant.displayName}` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {participant ? (
                      <>
                        <p className="text-muted-foreground">
                          Código: {participant.participantCode}
                        </p>
                        <Badge variant="secondary">
                          {stageLabels[participant.stage] ?? "Estado desconhecido"}
                        </Badge>
                        <p className="text-muted-foreground">
                          Primeiro acesso:{" "}
                          {participant.joinedAt ? dateLabel(participant.joinedAt) : "Ainda não acessou"}
                        </p>
                        <p className="text-muted-foreground">
                          Último acesso: {dateLabel(participant.lastSeenAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Participante não cadastrado.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exportar dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Os arquivos são gerados pelo servidor a partir das tentativas registradas.
                Exportar antes do encerramento traz apenas o que já foi resolvido.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={exporting !== null}
                  onClick={() => { void handleExport("raw"); }}
                >
                  {exporting === "raw" ? "Baixando..." : "Baixar CSV completo"}
                </Button>
                <Button
                  variant="outline"
                  disabled={exporting !== null}
                  onClick={() => { void handleExport("model"); }}
                >
                  {exporting === "model" ? "Baixando..." : "Baixar CSV para modelagem"}
                </Button>
              </div>
              {exportError && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{exportError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-xs">
            Última atualização: {dateLabel(updatedAt)}.{" "}
            {panel.session.status === "COMPLETED"
              ? "Sessão encerrada."
              : "Atualização automática a cada 2 segundos."}
          </p>
        </>
      )}
    </div>
  );
}
