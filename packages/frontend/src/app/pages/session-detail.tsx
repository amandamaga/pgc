import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { getSession, ResearcherApiError, type SessionDetails } from "../lib/researcher-api";

const statuses = {
  WAITING: { label: "Aguardando início", variant: "outline" },
  IN_PROGRESS: { label: "Em execução", variant: "default" },
  COMPLETED: { label: "Concluída", variant: "secondary" },
} as const;

export interface SessionDetailContext {
  details: SessionDetails | null;
  loading: boolean;
  reload: () => void;
}

export function useSessionDetail() {
  return useOutletContext<SessionDetailContext>();
}

export function SessionDetailPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getSession(sessionId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setDetails(data);
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      if (err instanceof ResearcherApiError && err.status === 401) navigate("/login", { replace: true });
      else setError(err instanceof Error ? err.message : "Não foi possível carregar a sessão.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [sessionId, revision, navigate]);

  // A aba vem da URL, nao de estado local: recarregar a pagina ou usar o botao
  // voltar do navegador continua caindo onde a pesquisadora estava.
  const tab = pathname.endsWith("/monitor") ? "monitor" : "participants";
  const status = details ? statuses[details.status] : undefined;

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-3 mb-4"
          onClick={() => navigate("/researcher")}
        >
          <ArrowLeft />
          Sessões
        </Button>

        <div className="mb-6">
          {loading && !details ? (
            <Skeleton className="h-8 w-64" />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">
              {details?.name ?? "Sessão"}
            </h1>
          )}
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
            {status && <Badge variant={status.variant}>{status.label}</Badge>}
            {details && <span>Sequência {details.sequenceVariant}</span>}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-destructive mb-4 text-sm">
            {error}
          </p>
        )}

        <Tabs
          value={tab}
          onValueChange={(value) =>
            navigate(`/researcher/sessions/${encodeURIComponent(sessionId)}/${value}`)
          }
        >
          <TabsList className="mb-6">
            <TabsTrigger value="participants">Participantes</TabsTrigger>
            <TabsTrigger value="monitor">Monitoramento</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <Outlet context={{ details, loading, reload }} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
