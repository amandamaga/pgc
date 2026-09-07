import { useState } from "react";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { Button } from "../components/button";
import { EmptyState } from "../components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

export interface Participant {
  id: string;
  code: string;
  age: number;
  sex: string;
  school: string;
  createdAt: string;
}

// Mock data - global participant registry
const mockParticipants: Participant[] = [
  { 
    id: "1", 
    code: "P001", 
    age: 24, 
    sex: "Feminino", 
    school: "Departamento de Psicologia",
    createdAt: "2026-03-01"
  },
  { 
    id: "2", 
    code: "P002", 
    age: 22, 
    sex: "Masculino", 
    school: "Laboratório de Neurociência",
    createdAt: "2026-03-01"
  },
  { 
    id: "3", 
    code: "P003", 
    age: 26, 
    sex: "Feminino", 
    school: "Ciências Comportamentais",
    createdAt: "2026-03-02"
  },
  { 
    id: "4", 
    code: "P004", 
    age: 23, 
    sex: "Masculino", 
    school: "Ciência Cognitiva",
    createdAt: "2026-03-02"
  },
  { 
    id: "5", 
    code: "P005", 
    age: 25, 
    sex: "Feminino", 
    school: "Departamento de Psicologia",
    createdAt: "2026-03-03"
  },
];

export function ParticipantsGlobalPage() {
  const [participants, setParticipants] = useState(mockParticipants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    age: "",
    sex: "",
    school: "",
  });

  const filteredParticipants = participants.filter(
    (p) =>
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sex.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    const newParticipant: Participant = {
      id: String(participants.length + 1),
      code: formData.code,
      age: Number(formData.age),
      sex: formData.sex,
      school: formData.school,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setParticipants([...participants, newParticipant]);
    setFormData({ code: "", age: "", sex: "", school: "" });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este participante?")) {
      setParticipants(participants.filter((p) => p.id !== id));
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-white">
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
              Participantes
            </h1>
            <p className="text-sm text-slate-600">
              Gerencie o cadastro global de participantes do sistema. Participantes cadastrados podem ser reutilizados em diferentes sessões.
            </p>
          </div>

          {/* Actions bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, escola ou sexo..."
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              />
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Participante
            </Button>
          </div>

          {/* Content card */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Participantes Cadastrados ({participants.length})
              </h2>
            </div>

            {filteredParticipants.length === 0 ? (
              <EmptyState
                title={searchQuery ? "Nenhum participante encontrado" : "Nenhum participante cadastrado"}
                description={searchQuery ? "Tente buscar com outros termos." : "Cadastre participantes para usar em suas sessões experimentais."}
                actionLabel="Cadastrar participante"
                onAction={() => setIsModalOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Idade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Sexo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Escola/Departamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Cadastrado em
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredParticipants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                          {participant.code}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {participant.age} anos
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">{participant.sex}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{participant.school}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(participant.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(participant.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Participant Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Participante</DialogTitle>
            <DialogDescription>
              Preencha os dados do participante. Ele ficará disponível para ser usado em qualquer sessão.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateParticipant}>
            <div className="space-y-4 py-4">
              {/* Code */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-900 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: P001"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              {/* Age */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-slate-900 mb-2">
                  Idade <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Ex: 24"
                  required
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              {/* Sex */}
              <div>
                <label htmlFor="sex" className="block text-sm font-medium text-slate-900 mb-2">
                  Sexo <span className="text-red-500">*</span>
                </label>
                <select
                  id="sex"
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              {/* School */}
              <div>
                <label htmlFor="school" className="block text-sm font-medium text-slate-900 mb-2">
                  Escola/Departamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="school"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  placeholder="Ex: Departamento de Psicologia"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Cadastrar Participante
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}