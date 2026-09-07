import { ResearcherSessions } from "../components/researcher-sessions";
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Plus, Trash2, Play, Monitor } from "lucide-react";
import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  useExperimentContext,
  type Participant,
} from "../context/experiment-context";
import type { SessionLanguageCode } from "../lib/session-store";

export function SessionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { participants, getSessionsByExperiment, createSession, deleteSession, updateSessionStatus, addParticipant } =
    useExperimentContext();

  const sessions = getSessionsByExperiment(id!);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  const [sessionFormData, setSessionFormData] = useState<{
    name: string;
    scheduledDateTime: string;
    participant1Id: string;
    participant2Id: string;
    language: SessionLanguageCode | "";
  }>({ name: "", scheduledDateTime: "", participant1Id: "", participant2Id: "", language: "" });

  const [isCreatingParticipant1, setIsCreatingParticipant1] = useState(false);
  const [isCreatingParticipant2, setIsCreatingParticipant2] = useState(false);
  const [newParticipant1, setNewParticipant1] = useState({ code: "", age: "", sex: "", school: "" });
  const [newParticipant2, setNewParticipant2] = useState({ code: "", age: "", sex: "", school: "" });

  const handleCreateNewParticipant = (num: 1 | 2) => {
    const data = num === 1 ? newParticipant1 : newParticipant2;
    const newP = addParticipant({ code: data.code, age: Number(data.age), sex: data.sex, school: data.school });
    if (num === 1) {
      setSessionFormData((f) => ({ ...f, participant1Id: newP.id }));
      setIsCreatingParticipant1(false);
      setNewParticipant1({ code: "", age: "", sex: "", school: "" });
    } else {
      setSessionFormData((f) => ({ ...f, participant2Id: newP.id }));
      setIsCreatingParticipant2(false);
      setNewParticipant2({ code: "", age: "", sex: "", school: "" });
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const p1 = participants.find((p) => p.id === sessionFormData.participant1Id);
    const p2 = participants.find((p) => p.id === sessionFormData.participant2Id);
    if (!p1 || !p2) { alert("Por favor, selecione ou crie os dois participantes"); return; }
    if (p1.id === p2.id) { alert("Os participantes devem ser diferentes"); return; }
    if (!sessionFormData.language) { alert("Por favor, selecione o idioma da sessão"); return; }
    createSession({
      experimentId: id!,
      name: sessionFormData.name,
      participant1: p1,
      participant2: p2,
      scheduledDateTime: sessionFormData.scheduledDateTime,
      status: "Scheduled",
      language: sessionFormData.language as SessionLanguageCode,
    });
    setSessionFormData({ name: "", scheduledDateTime: "", participant1Id: "", participant2Id: "", language: "" });
    setIsSessionModalOpen(false);
  };

  const statusBadgeClass = (s: string) => ({
    Completed: "bg-green-50 text-green-700 border-green-200",
    Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    Running: "bg-amber-50 text-amber-700 border-amber-200",
  }[s] ?? "bg-blue-50 text-blue-700 border-blue-200");

  const statusLabel = (s: string) =>
    ({ Completed: "Concluída", Scheduled: "Agendada", Running: "Em Execução" }[s] ?? s);

  const formatDT = (dt: string) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const selectedP1 = participants.find((p) => p.id === sessionFormData.participant1Id);
  const selectedP2 = participants.find((p) => p.id === sessionFormData.participant2Id);

  return (
    <main className="flex-1 flex flex-col bg-white">
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">

          <button
            onClick={() => navigate(`/researcher/experiments/${id}`)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o experimento
          </button>

          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">Sessões</h1>
            <p className="text-sm text-slate-600">
              Consulte as sessões salvas no servidor. A criação será habilitada após a integração com o backend.
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Button size="sm" className="gap-2" disabled title="A criação no servidor será integrada na próxima etapa">
              <Plus className="h-4 w-4" />
              Nova Sessão
            </Button>
          </div>

          <ResearcherSessions />

          {sessions.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => navigate(`/researcher/experiments/${id}`)}>
                Voltar para Visão Geral do Experimento
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      <Dialog open={isSessionModalOpen} onOpenChange={setIsSessionModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Sessão</DialogTitle>
            <DialogDescription>
              Selecione ou cadastre uma dupla de participantes que executarão as 64 tentativas juntos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSession}>
            <div className="space-y-6 py-4">

              <div>
                <label htmlFor="sessionName" className="block text-sm font-medium text-slate-900 mb-2">
                  Nome da Sessão <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="sessionName"
                  value={sessionFormData.name}
                  onChange={(e) => setSessionFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="ex: Sessão Matinal - Dupla 1"
                  required
                />
              </div>

              <div>
                <label htmlFor="scheduledDateTime" className="block text-sm font-medium text-slate-900 mb-2">
                  Data e Horário <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="scheduledDateTime"
                  value={sessionFormData.scheduledDateTime}
                  onChange={(e) => setSessionFormData((f) => ({ ...f, scheduledDateTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Idioma da Sessão <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Fixo para toda a sessão. Toda a interface e os dados coletados serão etiquetados com este idioma.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { code: "pt-BR" as const, label: "Português", sub: "pt-BR" },
                    { code: "no-NO" as const, label: "Norsk", sub: "no-NO" },
                  ]).map((opt) => {
                    const selected = sessionFormData.language === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setSessionFormData((f) => ({ ...f, language: opt.code }))}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-md border text-sm transition-colors text-left",
                          selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"
                        )}
                        aria-pressed={selected}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className={cn("text-xs", selected ? "text-slate-300" : "text-slate-500")}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ParticipantSelector
                label="Participante 1"
                colorClass="blue"
                selectedId={sessionFormData.participant1Id}
                participants={participants}
                onSelect={(pid) => setSessionFormData((f) => ({ ...f, participant1Id: pid }))}
                isCreating={isCreatingParticipant1}
                newData={newParticipant1}
                onNewDataChange={setNewParticipant1}
                onStartCreating={() => setIsCreatingParticipant1(true)}
                onCancelCreating={() => { setIsCreatingParticipant1(false); setNewParticipant1({ code: "", age: "", sex: "", school: "" }); }}
                onConfirmCreate={() => handleCreateNewParticipant(1)}
                selectedParticipant={selectedP1}
              />

              <ParticipantSelector
                label="Participante 2"
                colorClass="purple"
                selectedId={sessionFormData.participant2Id}
                participants={participants}
                onSelect={(pid) => setSessionFormData((f) => ({ ...f, participant2Id: pid }))}
                isCreating={isCreatingParticipant2}
                newData={newParticipant2}
                onNewDataChange={setNewParticipant2}
                onStartCreating={() => setIsCreatingParticipant2(true)}
                onCancelCreating={() => { setIsCreatingParticipant2(false); setNewParticipant2({ code: "", age: "", sex: "", school: "" }); }}
                onConfirmCreate={() => handleCreateNewParticipant(2)}
                selectedParticipant={selectedP2}
              />

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSessionModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar Sessão</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// ── Participant selector ───────────────────────────────────────────────────────
interface PSProps {
  label: string;
  colorClass: "blue" | "purple";
  selectedId: string;
  participants: Participant[];
  onSelect: (id: string) => void;
  isCreating: boolean;
  newData: { code: string; age: string; sex: string; school: string };
  onNewDataChange: (d: { code: string; age: string; sex: string; school: string }) => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
  onConfirmCreate: () => void;
  selectedParticipant: Participant | undefined;
}

function ParticipantSelector({ label, colorClass, selectedId, participants, onSelect, isCreating, newData, onNewDataChange, onStartCreating, onCancelCreating, onConfirmCreate, selectedParticipant }: PSProps) {
  const bg = colorClass === "blue" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200";
  return (
    <div className={cn("p-4 rounded-lg border", bg)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        {!isCreating && (
          <Button type="button" size="sm" variant="ghost" className="text-xs gap-1" onClick={onStartCreating}>
            <Plus className="h-3 w-3" />
            Criar Novo
          </Button>
        )}
      </div>
      {isCreating ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Código <span className="text-red-500">*</span></label>
              <input type="text" value={newData.code} onChange={(e) => onNewDataChange({ ...newData, code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" placeholder="ex: P006" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Idade <span className="text-red-500">*</span></label>
              <input type="number" value={newData.age} onChange={(e) => onNewDataChange({ ...newData, age: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" placeholder="ex: 8" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sexo <span className="text-red-500">*</span></label>
              <select value={newData.sex} onChange={(e) => onNewDataChange({ ...newData, sex: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" required>
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Escola</label>
              <input type="text" value={newData.school} onChange={(e) => onNewDataChange({ ...newData, school: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" placeholder="opcional" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={onConfirmCreate} disabled={!newData.code || !newData.age || !newData.sex}>Cadastrar</Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancelCreating}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Selecionar Participante <span className="text-red-500">*</span></label>
          <select value={selectedId} onChange={(e) => onSelect(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" required>
            <option value="">Selecione um participante...</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.sex}, {p.age} anos</option>
            ))}
          </select>
          {selectedParticipant && <p className="text-xs text-slate-600 mt-1">{selectedParticipant.school}</p>}
        </div>
      )}
    </div>
  );
}
