import { Check } from "lucide-react";
import { cn } from "../lib/utils";

interface Step {
  id: string;
  name: string;
  href: string;
}

interface ExperimentProgressProps {
  currentStep: number;
  experimentId: string;
}

const steps: Step[] = [
  { id: "participants", name: "Participantes", href: "/participants" },
  { id: "sessions", name: "Sessões", href: "/sessions" },
];

export function ExperimentProgress({ currentStep, experimentId }: ExperimentProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              <span
                className={cn(
                  "transition-colors",
                  isCurrent && "text-slate-900 font-medium",
                  isCompleted && "text-slate-600"
                )}
              >
                {step.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}