import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { getParticipantAccess, ResearcherApiError, type ParticipantAccess } from "../lib/researcher-api";

export function ParticipantAccessLinks({ sessionId }: { sessionId: string }) {
  const navigate = useNavigate();
  const [access, setAccess] = useState<ParticipantAccess[] | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setAccess(null);
    setError("");
    getParticipantAccess(sessionId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setAccess(data);
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      if (err instanceof ResearcherApiError && err.status === 401) navigate("/login", { replace: true });
      else setError(err instanceof Error ? err.message : "Não foi possível carregar os acessos.");
    });
    return () => controller.abort();
  }, [sessionId, revision, navigate]);

  return (
    <section className="space-y-4 border-t pt-6" aria-label="Acesso dos participantes">
      <div>
        <h2 className="text-base font-medium">Acesso dos participantes</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Cada participante deve abrir o seu próprio link para entrar no jogo.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => setRevision((value) => value + 1)}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : access === null ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <span className="sr-only" role="status">Carregando acessos</span>
          {[0, 1].map((row) => (
            <Skeleton key={row} className="h-72 w-full" />
          ))}
        </div>
      ) : access.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Cadastre os participantes para gerar os acessos.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {access.map((participant) => {
            const url = new URL("/participant", window.location.origin);
            url.hash = new URLSearchParams({ token: participant.accessToken }).toString();
            const link = url.toString();
            const inputId = `link-${participant.slot}`;
            return (
              <Card key={participant.slot}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {participant.slot}
                    <span className="text-muted-foreground font-normal"> · {participant.displayName}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* O QR precisa de fundo claro para ser lido, inclusive no tema escuro. */}
                  <div className="flex justify-center">
                    <div className="rounded-lg bg-white p-3">
                      <QRCodeSVG
                        value={link}
                        size={160}
                        marginSize={0}
                        title={`Acesso de ${participant.slot}`}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={inputId}>Link de acesso</Label>
                    <Input
                      id={inputId}
                      readOnly
                      value={link}
                      onFocus={(event) => event.target.select()}
                      className="font-mono text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        setNotice(`Link de ${participant.slot} copiado.`);
                      } catch {
                        setNotice("Selecione e copie o link no campo acima.");
                      }
                    }}
                  >
                    Copiar link
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {notice && (
        <p role="status" className="text-muted-foreground text-sm">
          {notice}
        </p>
      )}
    </section>
  );
}
