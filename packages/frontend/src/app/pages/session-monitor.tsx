import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Copy, Check, Download, FileSpreadsheet, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../components/button";
import { cn } from "../lib/utils";
import { useExperimentContext } from "../context/experiment-context";

// ── CSV export ─────────────────────────────────────────────────────────────────
const CSV_HEADERS = [
  "Sessão", "Tentativa", "Condição", "Par", "Moedas A", "Moedas B",
  "Julgamento P1", "Julgamento P2", "Puniu P1", "Puniu P2",
  "Concordaram", "Culturante", "Moedas Cofrinho",
];

function generateMockTrialRows(sessionName: string) {
  return Array.from({ length: 64 }, (_, i) => [
    sessionName,
    i + 1,
    ["A", "B", "C", "D"][Math.floor(i / 16)],
    `Par ${(i % 8) + 1}`,
    [6, 12, 8, 4, 10, 6, 2, 8, 0, 6, 10, 4, 6, 12, 8, 2][i % 16],
    [6, 0, 4, 8, 2, 6, 10, 4, 12, 6, 2, 8, 6, 0, 4, 10][i % 16],
    Math.random() > 0.5 ? "justa" : "injusta",
    Math.random() > 0.5 ? "justa" : "injusta",
    Math.random() > 0.5 ? "sim" : "não",
    Math.random() > 0.5 ? "sim" : "não",
    Math.random() > 0.5 ? "sim" : "não",
    Math.random() > 0.7 ? "sim" : "não",
    Math.floor(Math.random() * 20),
  ]);
}

function exportSessionCSV(sessionName: string) {
  const rows = generateMockTrialRows(sessionName);
  const csv = [CSV_HEADERS, ...rows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sessionName.replace(/\s+/g, "_")}_tentativas.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── QR download ────────────────────────────────────────────────────────────────
function downloadQR(svgId: string, filename: string) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 256, 256);
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function useCopyState() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

const SESSION_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  Scheduled: { label: "Agendada", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  Running: { label: "Em Execução", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  Completed: { label: "Concluída", cls: "bg-green-50 text-green-700 border-green-200" },
};

// ── Component ──────────────────────────────────────────────────────────────────
export function SessionMonitorPage() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();
  const { getSessionsByExperiment } = useExperimentContext();
  const { copied, copy } = useCopyState();
  const [csvExported, setCsvExported] = useState(false);

  const session = getSessionsByExperiment(id!).find((s) => s.id === sessionId);

  const base = window.location.origin;
  const url1 = `${base}/session/${sessionId}/participant/1`;
  const url2 = `${base}/session/${sessionId}/participant/2`;

  const handleExportCSV = () => {
    if (!session) return;
    exportSessionCSV(session.name);
    setCsvExported(true);
    setTimeout(() => setCsvExported(false), 2500);
  };

  if (!session) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Sessão não encontrada.</p>
          <Button onClick={() => navigate(`/researcher/experiments/${id}/sessions`)}>
            Voltar para Sessões
          </Button>
        </div>
      </main>
    );
  }

  const statusInfo = SESSION_STATUS_MAP[session.status] ?? SESSION_STATUS_MAP.Scheduled;

  return (
    <main className="flex-1 bg-slate-50">
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Back */}
          <button
            onClick={() => navigate(`/researcher/experiments/${id}/sessions`)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para sessões
          </button>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">{session.name}</h1>
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                statusInfo.cls
              )}>
                {statusInfo.label}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={handleExportCSV}
            >
              {csvExported ? (
                <><Check className="h-4 w-4 text-green-600" /> Exportado!</>
              ) : (
                <><FileSpreadsheet className="h-4 w-4" /> Exportar CSV</>
              )}
            </Button>
          </div>

          {/* Session info */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Detalhes da Sessão</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1">Participante 1</p>
                <p className="font-medium text-slate-900">{session.participant1.code}</p>
                <p className="text-slate-500 text-xs">{session.participant1.sex}, {session.participant1.age} anos</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Participante 2</p>
                <p className="font-medium text-slate-900">{session.participant2.code}</p>
                <p className="text-slate-500 text-xs">{session.participant2.sex}, {session.participant2.age} anos</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Idioma</p>
                <p className="font-medium text-slate-900">{session.language === "no-NO" ? "Norsk" : "Português"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Tentativas</p>
                <p className="font-medium text-slate-900">64</p>
              </div>
            </div>
          </div>

          {/* QR Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {([
              { num: 1, label: "Participante 1", code: session.participant1.code, url: url1, svgId: "qr-p1" },
              { num: 2, label: "Participante 2", code: session.participant2.code, url: url2, svgId: "qr-p2" },
            ] as const).map((p) => (
              <div key={p.num} className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">{p.label}</h3>
                  <span className="text-xs text-slate-500 font-mono">{p.code}</span>
                </div>

                {/* QR code */}
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <QRCodeSVG
                      id={p.svgId}
                      value={p.url}
                      size={180}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="M"
                    />
                  </div>
                </div>

                {/* URL + copy */}
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200 mb-3">
                  <p className="text-xs text-slate-600 font-mono flex-1 truncate">{p.url}</p>
                  <button
                    type="button"
                    onClick={() => copy(p.url, `url-${p.num}`)}
                    className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                    title="Copiar link"
                  >
                    {copied === `url-${p.num}` ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Download QR */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => downloadQR(p.svgId, `qr_participante_${p.num}_${session.name.replace(/\s+/g, "_")}.png`)}
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar QR Code
                </Button>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Como usar os QR codes</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Imprima ou exiba os QR codes nos dispositivos dos participantes</li>
              <li>Cada participante escaneia seu próprio QR code</li>
              <li>Os dispositivos são sincronizados automaticamente pela ID da sessão</li>
              <li>Após a conclusão, use "Exportar CSV" para baixar os dados coletados</li>
            </ol>
          </div>

        </div>
      </div>
    </main>
  );
}
