import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { QRCodeSVG } from "qrcode.react";
import { getParticipantAccess, ResearcherApiError, type ParticipantAccess } from "../lib/researcher-api";
import { Button } from "./button";

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

  return <section className="border-t border-slate-200 pt-4 space-y-4">
    <h3 className="font-semibold">Acesso dos participantes</h3>
    <p className="text-sm text-slate-500">Cada participante deve abrir o seu próprio link para entrar no jogo.</p>
    {error ? <div role="alert"><p className="text-sm text-red-700">{error}</p><Button variant="outline" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</Button></div>
      : access === null ? <p role="status">Carregando acessos...</p>
      : access.length === 0 ? <p>Cadastre os participantes para gerar os acessos.</p>
      : access.map((participant) => {
        const url = new URL("/participant", window.location.origin);
        url.hash = new URLSearchParams({ token: participant.accessToken }).toString();
        const link = url.toString();
        return <div key={participant.slot} className="rounded-lg border border-slate-200 p-4 space-y-3">
          <p className="font-medium">{participant.slot} · {participant.displayName}</p>
          <QRCodeSVG value={link} size={160} marginSize={4} title={`Acesso de ${participant.slot}`} />
          <label className="block text-sm">Link de acesso<input aria-label={`Link de ${participant.slot}`} readOnly value={link} onFocus={(event) => event.target.select()} className="mt-1 w-full rounded border border-slate-300 p-2" /></label>
          <Button variant="outline" size="sm" onClick={async () => {
            try { await navigator.clipboard.writeText(link); setNotice(`Link de ${participant.slot} copiado.`); }
            catch { setNotice("Selecione e copie o link no campo acima."); }
          }}>Copiar link</Button>
        </div>;
      })}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
