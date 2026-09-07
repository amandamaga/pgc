import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Info, Check, ArrowRight, Layers, FileText } from "lucide-react";
import { Button } from "../components/button";
import { cn } from "../lib/utils";
import { useExperimentContext } from "../context/experiment-context";

type Step = 1 | 2;

// Sequências de condições pré-definidas para o MVP
const CONDITION_SEQUENCES = [
  { value: "ABAC", label: "ABAC" },
  { value: "ACAB", label: "ACAB" },
  { value: "BCBC", label: "BCBC" },
  { value: "CBCB", label: "CBCB" },
];

export function CreateExperimentPage() {
  const navigate = useNavigate();
  const { createExperiment } = useExperimentContext();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [createdId, setCreatedId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    conditionSequence: "ABAC",
    enableTutorialVideo: false,
    tutorialVideoUrl: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp = createExperiment({
      name: formData.name,
      description: formData.description,
      conditionSequence: formData.conditionSequence,
      tutorialVideoUrl: formData.enableTutorialVideo ? formData.tutorialVideoUrl : undefined,
      status: "Draft",
      language: "pt-BR",
    });
    setCreatedId(newExp.id);
    setCurrentStep(2);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setFormData({
      ...formData,
      [target.name]: value,
    });
  };

  const handleBack = () => {
    navigate("/researcher");
  };

  // Validation
  const isFormValid = formData.name.trim().length > 0;

  // Confirmation screen
  if (currentStep === 2) {
    return (
      <main className="flex-1 flex flex-col bg-white">
        <div className="p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Success message */}
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Experimento criado com sucesso!
              </h1>
              <p className="text-sm text-slate-600 mb-8">
                Seu experimento foi configurado. Agora você pode adicionar participantes e criar sessões.
              </p>

              {/* Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-left mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo do Experimento</h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Nome</dt>
                    <dd className="text-sm text-slate-900 mt-1">{formData.name}</dd>
                  </div>
                  {formData.description && (
                    <div>
                      <dt className="text-xs font-medium text-slate-500 uppercase">Descrição</dt>
                      <dd className="text-sm text-slate-900 mt-1">{formData.description}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Sequência das Condições</dt>
                    <dd className="text-sm text-slate-900 mt-1">{formData.conditionSequence}</dd>
                  </div>
                  {formData.enableTutorialVideo && (
                    <div>
                      <dt className="text-xs font-medium text-slate-500 uppercase">Vídeo Tutorial</dt>
                      <dd className="text-sm text-slate-900 mt-1">
                        Habilitado{formData.tutorialVideoUrl ? ` - ${formData.tutorialVideoUrl}` : ""}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Total de Tentativas</dt>
                    <dd className="text-sm text-slate-900 mt-1">64 tentativas (4 condições × 16 tentativas)</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 uppercase">Próximos Passos</dt>
                    <dd className="text-sm text-slate-900 mt-1">
                      Cadastre participantes e configure as sessões experimentais
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/researcher")}
                >
                  Voltar ao Dashboard
                </Button>
                <Button onClick={() => navigate(`/researcher/experiments/${createdId}`)}>
                  Ir para Detalhes do Experimento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col bg-slate-50">
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para experimentos
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
              Criar Novo Experimento
            </h1>
            <p className="text-sm text-slate-600">
              Configure seu experimento de punição altruísta. As sessões serão configuradas posteriormente.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Information */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Informações do Experimento
              </h2>

              <div className="space-y-5">
                {/* Experiment Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Nome do Experimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="ex: Estudo de Punição Altruísta - TCC 2026"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descreva o propósito e metodologia do seu experimento..."
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Condition Sequence */}
                <div>
                  <label
                    htmlFor="conditionSequence"
                    className="block text-sm font-medium text-slate-900 mb-2"
                  >
                    Sequência das Condições <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="conditionSequence"
                    name="conditionSequence"
                    value={formData.conditionSequence}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {CONDITION_SEQUENCES.map((seq) => (
                      <option key={seq.value} value={seq.value}>
                        {seq.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Escolha a sequência que define a ordem de apresentação das 4 condições experimentais (A, B, C, D).
                  </p>
                </div>
              </div>
            </div>

            {/* Tutorial Video Section */}
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Vídeo Tutorial (Opcional)
              </h2>

              <div className="space-y-5">
                {/* Enable Tutorial Video */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="enableTutorialVideo"
                    name="enableTutorialVideo"
                    checked={formData.enableTutorialVideo}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="enableTutorialVideo"
                      className="block text-sm font-medium text-slate-900 cursor-pointer"
                    >
                      Exibir vídeo tutorial no início do experimento
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      Se habilitado, um vídeo será exibido aos participantes antes de iniciarem as tentativas.
                    </p>
                  </div>
                </div>

                {/* Video URL (only shown when enabled) */}
                {formData.enableTutorialVideo && (
                  <div>
                    <label
                      htmlFor="tutorialVideoUrl"
                      className="block text-sm font-medium text-slate-900 mb-2"
                    >
                      Link do Vídeo Tutorial
                    </label>
                    <input
                      type="url"
                      id="tutorialVideoUrl"
                      name="tutorialVideoUrl"
                      value={formData.tutorialVideoUrl}
                      onChange={handleChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Cole o link do YouTube, Vimeo ou outro serviço de vídeo. O vídeo será incorporado na interface.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Experiment Structure Visualization */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-slate-900 mb-4">
                Estrutura do Experimento
              </h3>
              
              {/* Sequence visualization */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-medium text-slate-700 uppercase">Sequência</div>
                  <div className="flex items-center gap-1">
                    {formData.conditionSequence.split('').map((condition, index) => (
                      <div key={index} className="flex items-center">
                        <div className="px-3 py-1.5 bg-blue-100 text-blue-700 font-semibold text-sm rounded">
                          {condition}
                        </div>
                        {index < formData.conditionSequence.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-slate-400 mx-1" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="ml-auto text-xs text-slate-500">
                    {formData.conditionSequence.length} blocos
                  </div>
                </div>
              </div>

              {/* Total summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900">4</div>
                  <div className="text-xs text-slate-600 mt-1">Condições</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="text-2xl font-bold text-blue-600">64</div>
                  <div className="text-xs text-slate-600 mt-1">Tentativas</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="text-2xl font-bold text-green-600">16</div>
                  <div className="text-xs text-slate-600 mt-1">Por Condição</div>
                </div>
              </div>
            </div>

            {/* Fixed Info */}
            <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 mb-1">
                  Sobre os Cartões de Estímulo
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Os <strong>64 cartões de estímulo</strong> (1 para cada tentativa, com 2 personagens cada) 
                  já estão pré-configurados pelo sistema. Você só precisa cadastrar participantes e criar sessões.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid}
                className={cn(!isFormValid && "opacity-50 cursor-not-allowed")}
              >
                Criar Experimento
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}