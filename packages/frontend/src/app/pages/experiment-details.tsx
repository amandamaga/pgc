import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Calendar, Layers, Monitor, Download, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/button";
import { cn } from "../lib/utils";
import { useExperimentContext } from "../context/experiment-context";

// ── CSV export ─────────────────────────────────────────────────────────────────
const TRIAL_HEADERS = [
  "Sessão", "Tentativa", "Condição", "Par", "Moedas A", "Moedas B",
  "Julgamento P1", "Julgamento P2", "Puniu P1", "Puniu P2",
  "Concordaram", "Culturante", "Moedas Cofrinho",
];

function generateMockRows(sessionName: string, count = 64) {
  return Array.from({ length: count }, (_, i) => [
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

function exportExperimentCSV(experimentName: string, sessionNames: string[]) {
  const allRows = sessionNames.flatMap((name) => generateMockRows(name));
  const csvContent = [TRIAL_HEADERS, ...allRows].map((r) => r.join(";")).join("\n");
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${experimentName.replace(/\s+/g, "_")}_dados.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active: "bg-green-50 text-green-700 border-green-200",
    Draft: "bg-slate-100 text-slate-600 border-slate-200",
    Finished: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return map[status] ?? map.Draft;
}

function statusLabel(status: string) {
  return { Active: "Ativo", Draft: "Rascunho", Finished: "Concluído" }[status] ?? status;
}

function sessionStatusBadge(status: string) {
  const map: Record<string, string> = {
    Completed: "bg-green-50 text-green-700 border-green-200",
    Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    Running: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[status] ?? map.Scheduled;
}

function sessionStatusLabel(status: string) {
  return { Completed: "Concluída", Scheduled: "Agendada", Running: "Em Execução" }[status] ?? status;
}

function formatDateTime(dt: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Component ──────────────────────────────────────────────────────────────────
export function ExperimentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getExperimentById, getSessionsByExperiment } = useExperimentContext();
  const [exported, setExported] = useState(false);

  const experiment = getExperimentById(id!);
  const sessions = getSessionsByExperiment(id!);
  const completedSessions = sessions.filter((s) => s.status === "Completed");

  if (!experiment) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Experimento não encontrado.</p>
          <Button onClick={() => navigate("/researcher")}>Voltar ao Dashboard</Button>
        </div>
      </main>
    );
  }

  const handleExport = () => {
    const names = completedSessions.length > 0 ? completedSessions.map((s) => s.name) : ["Sessão Demo"];
    exportExperimentCSV(experiment.name, names);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <main className="flex-1 bg-slate-50">
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Back */}
          <button
            onClick={() => navigate("/researcher")}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para experimentos
          </button>

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2 leading-snug">
                {experiment.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                  statusBadge(experiment.status)
                )}>
                  {statusLabel(experiment.status)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">
                  {experiment.language === "no-NO" ? "Norsk" : "Português (BR)"}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 flex-shrink-0" onClick={handleExport}>
              {exported ? (
                <><CheckCircle2 className="h-4 w-4 text-green-600" /> Exportado!</>
              ) : (
                <><FileSpreadsheet className="h-4 w-4" /> Exportar dados CSV</>
              )}
            </Button>
          </div>

          {/* Metadata */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Configuração</h2>
            {experiment.description && (
              <p className="text-sm text-slate-700 leading-relaxed">{experiment.description}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Sequência</p>
                <p className="text-sm font-semibold text-slate-900 font-mono">{experiment.conditionSequence}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Tentativas</p>
                <p className="text-sm font-semibold text-slate-900">64</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Condições</p>
                <p className="text-sm font-semibold text-slate-900">4 × 16</p>
              </div>
              <div className="flex items-start gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Criado em</p>
                  <p className="text-sm font-medium text-slate-900">{experiment.createdAt}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Sessões</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sessions.length} sessão{sessions.length !== 1 ? "ões" : ""} configurada{sessions.length !== 1 ? "s" : ""}
                  {completedSessions.length > 0 && ` · ${completedSessions.length} concluída${completedSessions.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => navigate(`/researcher/experiments/${id}/sessions`)}>
                <Layers className="h-3.5 w-3.5" />
                Gerenciar Sessões
              </Button>
            </div>

            {sessions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-500 mb-3">Nenhuma sessão criada ainda.</p>
                <Button variant="outline" size="sm" onClick={() => navigate(`/researcher/experiments/${id}/sessions`)}>
                  Criar primeira sessão
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900 truncate">{session.name}</span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0",
                          sessionStatusBadge(session.status)
                        )}>
                          {sessionStatusLabel(session.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(session.scheduledDateTime)} · {session.participant1.code} &amp; {session.participant2.code}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 ml-4 flex-shrink-0"
                      onClick={() => navigate(`/researcher/experiments/${id}/sessions/${session.id}/monitor`)}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Monitor
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export info */}
          {completedSessions.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800">
                  <span className="font-medium">{completedSessions.length} sessão{completedSessions.length !== 1 ? "ões" : ""} concluída{completedSessions.length !== 1 ? "s" : ""}.</span>{" "}
                  Use "Exportar dados CSV" para baixar todos os registros de tentativas.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0 border-green-300 text-green-800 hover:bg-green-100" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
