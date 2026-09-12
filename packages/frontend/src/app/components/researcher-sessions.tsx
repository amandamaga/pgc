import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { CreateSessionDialog } from "./create-session-dialog";
import { listSessions, ResearcherApiError, type ResearcherSession } from "../lib/researcher-api";

const statuses = {
  WAITING: { label: "Aguardando início", variant: "outline" },
  IN_PROGRESS: { label: "Em execução", variant: "default" },
  COMPLETED: { label: "Concluída", variant: "secondary" },
} as const;

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function ResearcherSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ResearcherSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((value) => value + 1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
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

  const firstLoad = loading && sessions.length === 0;

  return (
    <section aria-labelledby="sessoes-titulo" aria-busy={loading}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="sessoes-titulo" className="text-2xl font-semibold tracking-tight">
            Sessões
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie e monitore as sessões dos participantes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={loading} onClick={refresh}>
            Atualizar
          </Button>
          <CreateSessionDialog onCreated={refresh} />
        </div>
      </div>

      <Card>
        <CardContent className="py-6">
          {error ? (
            <div role="alert" className="text-sm">
              <p className="text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={refresh}>
                Tentar novamente
              </Button>
            </div>
          ) : !firstLoad && sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium">Nenhuma sessão cadastrada</p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                Crie a primeira sessão para gerar os links de acesso dos participantes.
              </p>
              <div className="mt-4 flex justify-center">
                <CreateSessionDialog onCreated={refresh} />
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sessão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Sequência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firstLoad
                  ? [0, 1, 2].map((row) => (
                      <TableRow key={row}>
                        <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                        <TableCell><Skeleton className="ml-auto h-8 w-56" /></TableCell>
                      </TableRow>
                    ))
                  : sessions.map((session) => {
                      const status = statuses[session.status];
                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium">{session.name}</TableCell>
                          <TableCell>
                            <Badge variant={status?.variant ?? "outline"}>
                              {status?.label ?? session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{dateFormat.format(new Date(session.createdAt))}</TableCell>
                          <TableCell>{session.sequenceVariant}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/researcher/sessions/${encodeURIComponent(session.id)}/participants`,
                                  )
                                }
                              >
                                Participantes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/researcher/sessions/${encodeURIComponent(session.id)}/monitor`,
                                  )
                                }
                              >
                                Monitorar sessão
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
