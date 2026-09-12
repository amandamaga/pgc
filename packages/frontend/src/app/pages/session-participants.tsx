import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { ParticipantAccessLinks } from "../components/participant-access";
import {
  addSessionParticipant,
  getSession,
  startSession,
  ResearcherApiError,
  type SessionDetails,
} from "../lib/researcher-api";

const statuses = {
  WAITING: { label: "Aguardando início", variant: "outline" },
  IN_PROGRESS: { label: "Em execução", variant: "default" },
  COMPLETED: { label: "Concluída", variant: "secondary" },
} as const;

const SLOTS = ["P1", "P2"] as const;

export function SessionParticipantsPage() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [openSlot, setOpenSlot] = useState("");
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
    const controller = new AbortController();
    setLoading(true);
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
  }, [sessionId, revision, navigate]);

  // Abre sozinho o slot que ainda falta cadastrar, e colapsa tudo quando a
  // dupla esta completa — o caminho comum nao custa nenhum clique.
  useEffect(() => {
    if (!details) return;
    const pending = SLOTS.find((slot) => !details.participants.some((p) => p.slot === slot));
    setOpenSlot(details.status === "WAITING" ? (pending ?? "") : "");
  }, [details]);

  async function submit(event: FormEvent<HTMLFormElement>, slot: "P1" | "P2") {
    event.preventDefault();
    if (busy.current || !details || details.participants.some((p) => p.slot === slot)) return;
    const data = new FormData(event.currentTarget);
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
      setRevision((value) => value + 1);
    } catch (err) {
      reportError(err);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function start() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await startSession(sessionId);
      setNotice("Sessão iniciada. Os participantes receberão a história automaticamente.");
      setRevision((value) => value + 1);
    } catch (err) {
      reportError(err);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const status = details ? statuses[details.status] : undefined;
  const bothRegistered = SLOTS.every((slot) =>
    details?.participants.some((p) => p.slot === slot),
  );

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
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
          <h1 className="text-2xl font-semibold tracking-tight">Participantes da sessão</h1>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
            {loading && !details ? (
              <Skeleton className="h-5 w-56" />
            ) : (
              <>
                <span>{details?.name}</span>
                {status && <Badge variant={status.variant}>{status.label}</Badge>}
              </>
            )}
          </div>
        </div>

        {notice && (
          <p role="status" className="mb-4 text-sm font-medium">
            {notice}
          </p>
        )}

        {error && (
          <div role="alert" className="mb-4 text-sm">
            <p className="text-destructive mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={saving || loading}
              onClick={() => setRevision((value) => value + 1)}
            >
              Recarregar participantes
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="py-2">
            {loading && !details ? (
              <div className="space-y-4 py-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                value={openSlot}
                onValueChange={setOpenSlot}
              >
                {SLOTS.map((slot) => {
                  const participant = details?.participants.find((p) => p.slot === slot);
                  return (
                    <AccordionItem key={slot} value={slot}>
                      <AccordionTrigger>
                        <span className="flex flex-1 flex-wrap items-center gap-2">
                          <span className="font-medium">{slot}</span>
                          <span className="text-muted-foreground font-normal">
                            {participant ? participant.displayName : "Não cadastrado"}
                          </span>
                        </span>
                        <Badge variant={participant ? "secondary" : "outline"}>
                          {participant ? "Cadastrado" : "Pendente"}
                        </Badge>
                      </AccordionTrigger>
                      <AccordionContent>
                        {participant ? (
                          <p className="text-muted-foreground">
                            Código: {participant.participantCode}
                          </p>
                        ) : details?.status !== "WAITING" ? (
                          <p className="text-muted-foreground">Nenhum participante cadastrado.</p>
                        ) : (
                          <form
                            onSubmit={(event) => submit(event, slot)}
                            className="space-y-4"
                            aria-busy={saving}
                          >
                            <div className="grid gap-2">
                              <Label htmlFor={`${slot}-displayName`}>Nome de exibição</Label>
                              <Input
                                id={`${slot}-displayName`}
                                name="displayName"
                                required
                                disabled={saving}
                                value={drafts[slot].displayName}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [slot]: { ...current[slot], displayName: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`${slot}-participantCode`}>
                                Código do participante
                              </Label>
                              <Input
                                id={`${slot}-participantCode`}
                                name="participantCode"
                                required
                                disabled={saving}
                                value={drafts[slot].participantCode}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [slot]: {
                                      ...current[slot],
                                      participantCode: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={saving}>
                              {saving ? "Salvando..." : `Cadastrar ${slot}`}
                            </Button>
                          </form>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {details?.status === "WAITING" && (
          <div className="mt-6">
            <Button disabled={saving || !bothRegistered} onClick={start}>
              {saving ? "Aguarde..." : "Iniciar sessão"}
            </Button>
            {!bothRegistered && (
              <p className="text-muted-foreground mt-2 text-sm">
                Cadastre P1 e P2 para poder iniciar.
              </p>
            )}
          </div>
        )}

        {details?.status === "IN_PROGRESS" && (
          <p role="status" className="mt-6 text-sm font-medium">
            Sessão em andamento.
          </p>
        )}

        {details && (
          <div className="mt-8">
            <ParticipantAccessLinks key={revision} sessionId={sessionId} />
          </div>
        )}
      </div>
    </main>
  );
}
