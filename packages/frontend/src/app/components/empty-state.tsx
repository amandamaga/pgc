import { Button } from "./button";
import { Beaker, Sparkles } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onCreateExperiment?: () => void;
}

export function EmptyState({
  title = "Nenhum experimento ainda",
  description = "Comece criando seu primeiro experimento de pesquisa comportamental",
  actionLabel = "Criar Primeiro Experimento",
  onAction,
  onCreateExperiment,
}: EmptyStateProps) {
  const handleAction = onAction || onCreateExperiment;

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
          <Beaker className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          {description}
        </p>
        
        {handleAction && (
          <>
            <Button onClick={handleAction} className="gap-2 mb-4">
              <Sparkles className="h-4 w-4" />
              {actionLabel}
            </Button>
            
            <div className="mt-6 pt-6 border-t border-slate-200 max-w-md mx-auto">
              <p className="text-xs text-slate-500 mb-3">
                Experimentos pré-configurados incluem:
              </p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>✓ 4 condições experimentais (A, B, C, D)</li>
                <li>✓ 64 cartões de estímulo pré-carregados</li>
                <li>✓ 64 tentativas por sessão (16 por condição)</li>
                <li>✓ Sistema de duplas com sessões individuais</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}