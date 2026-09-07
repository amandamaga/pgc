import { Trash2 } from "lucide-react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Experiment } from "./experiment-card";
import { cn } from "../lib/utils";

interface ExperimentsTableProps {
  experiments: Experiment[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExperimentsTable({
  experiments,
  onOpen,
  onDelete,
}: ExperimentsTableProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingExperiment = experiments.find((e) => e.id === pendingDeleteId);

  const confirmDelete = () => {
    if (pendingDeleteId) {
      onDelete(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };
  const getStatusBadge = (status: string) => {
    const styles = {
      Active: "bg-green-50 text-green-700 border-green-200",
      Ativo: "bg-green-50 text-green-700 border-green-200",
      Draft: "bg-slate-50 text-slate-600 border-slate-200",
      Rascunho: "bg-slate-50 text-slate-600 border-slate-200",
      Finished: "bg-blue-50 text-blue-700 border-blue-200",
      Finalizado: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return styles[status as keyof typeof styles] || styles.Draft;
  };

  return (
    <>
    <Dialog.Root open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6 focus:outline-none animate-in fade-in-0 zoom-in-95">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-900">
                Excluir experimento?
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{pendingExperiment?.name}</span> será removido permanentemente. Esta ação não pode ser desfeita.
              </Dialog.Description>
            </div>
            <div className="flex gap-3 w-full">
              <Dialog.Close asChild>
                <button className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                onClick={confirmDelete}
              >
                Excluir
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Descrição
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                Participantes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                Última Modificação
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {experiments.map((experiment) => (
              <tr
                key={experiment.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onOpen(experiment.id)}
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-slate-900">
                    {experiment.name}
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="text-sm text-slate-500 line-clamp-2 max-w-md">
                    {experiment.description}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                      getStatusBadge(experiment.status)
                    )}
                  >
                    {experiment.status}
                  </span>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <div className="text-sm text-slate-900">{experiment.participants}</div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <div className="text-sm text-slate-500">{experiment.lastModified}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteId(experiment.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}