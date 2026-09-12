import { useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { ParticipantAccessLinks } from "../components/participant-access";
import { useSessionDetail } from "./session-detail";
import { addSessionParticipant, startSession, ResearcherApiError } from "../lib/researcher-api";

const SLOTS = ["P1", "P2"] as const;

export function SessionParticipantsPage() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams();
  // Nome, status e recarga vivem no layout da sessao — esta aba so cuida da dupla.
  const { details, loading, reload } = useSessionDetail();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [localRevision, setLocalRevision] = useState(0);
  const [drafts, setDrafts] = useState({
    P1: { displayName: "", participantCode: "" },
    P2: { displayName: "", participantCode: "" },
  });
  const busy = useRef(false);

  function refresh() {
    setLocalRevision((value) => value + 1);
    reload();
  }

  function reportError(err: unknown) {
    if (err instanceof ResearcherApiError && err.status === 401) {
      navigate("/login", { replace: true });
    } else {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o participante.");
    }
  }

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
      refresh();
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
      refresh();
    } catch (err) {
      reportError(err);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const bothRegistered = SLOTS.every((slot) =>
    details?.participants.some((p) => p.slot === slot),
  );

  return (
    <div className="space-y-6">
      {notice && (
        <p role="status" className="text-sm font-medium">
          {notice}
        </p>
      )}

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" disabled={saving || loading} onClick={refresh}>
              Recarregar participantes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {SLOTS.map((slot) => {
          const participant = details?.participants.find((p) => p.slot === slot);
          return (
            <Card key={slot}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {slot}
                  {participant && (
                    <span className="text-muted-foreground font-normal">
                      · {participant.displayName}
                    </span>
                  )}
                  <Badge variant={participant ? "secondary" : "outline"}>
                    {participant ? "Cadastrado" : "Pendente"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {loading && !details ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : participant ? (
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
                      <Label htmlFor={`${slot}-participantCode`}>Código do participante</Label>
                      <Input
                        id={`${slot}-participantCode`}
                        name="participantCode"
                        required
                        disabled={saving}
                        value={drafts[slot].participantCode}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [slot]: { ...current[slot], participantCode: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={saving}>
                      {saving ? "Salvando..." : `Cadastrar ${slot}`}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {details?.status === "WAITING" && (
        <div>
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

      {details && <ParticipantAccessLinks key={localRevision} sessionId={sessionId} />}
    </div>
  );
}
