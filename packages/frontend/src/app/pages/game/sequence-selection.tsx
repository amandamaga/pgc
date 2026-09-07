import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";

type Letter = "A" | "B" | "C";
type PillDef = { letter: Letter; prime: boolean };

const COLORS: Record<Letter, { bg: string; border: string; text: string; light: string }> = {
  A: { bg: "#2563EB", border: "#1D4ED8", text: "#FFFFFF", light: "#EFF6FF" },
  B: { bg: "#DC2626", border: "#B91C1C", text: "#FFFFFF", light: "#FEF2F2" },
  C: { bg: "#16A34A", border: "#15803D", text: "#FFFFFF", light: "#F0FDF4" },
};

const sequences: { id: string; experiment: string; group: string; pills: PillDef[]; description: string }[] = [
  {
    id: "ABAC",
    experiment: "Experimento 1",
    group: "Grupo 1",
    description: "Condição A como linha de base",
    pills: [
      { letter: "A", prime: false },
      { letter: "B", prime: false },
      { letter: "A", prime: true },
      { letter: "C", prime: false },
    ],
  },
  {
    id: "ACAB",
    experiment: "Experimento 1",
    group: "Grupo 2",
    description: "Condição A como linha de base",
    pills: [
      { letter: "A", prime: false },
      { letter: "C", prime: false },
      { letter: "A", prime: true },
      { letter: "B", prime: false },
    ],
  },
  {
    id: "BCBC",
    experiment: "Experimento 2",
    group: "Grupo 1",
    description: "Alternância B e C",
    pills: [
      { letter: "B", prime: false },
      { letter: "C", prime: false },
      { letter: "B", prime: true },
      { letter: "C", prime: true },
    ],
  },
  {
    id: "CBCB",
    experiment: "Experimento 2",
    group: "Grupo 2",
    description: "Alternância C e B",
    pills: [
      { letter: "C", prime: false },
      { letter: "B", prime: false },
      { letter: "C", prime: true },
      { letter: "B", prime: true },
    ],
  },
];

const CONDITION_LEGEND = [
  { letter: "A" as Letter, label: "Qualquer consenso → +3 CC" },
  { letter: "B" as Letter, label: "Punir igual ou não punir desigual → +3 CC" },
  { letter: "C" as Letter, label: "Punir desigual ou não punir igual → +3 CC" },
];

function SequencePill({ letter, prime }: PillDef) {
  const c = COLORS[letter];
  const label = prime ? `${letter}'` : letter;
  return prime ? (
    <span
      className="inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold select-none tabular-nums"
      style={{ border: `1.5px dashed ${c.bg}`, color: c.bg, backgroundColor: c.light, minWidth: 28 }}
    >
      {label}
    </span>
  ) : (
    <span
      className="inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold select-none tabular-nums"
      style={{ backgroundColor: c.bg, border: `1.5px solid ${c.border}`, color: c.text, minWidth: 28 }}
    >
      {label}
    </span>
  );
}

export function SequenceSelectionPage() {
  const navigate = useNavigate();
  const { sessionId, participantId } = useParams();

  const basePath =
    sessionId && participantId
      ? `/session/${sessionId}/participant/${participantId}`
      : `/game-preview`;

  const handleSelect = (id: string) => {
    sessionStorage.setItem("gameSequence", id);
    if (sessionId && participantId) {
      navigate(`${basePath}/flow-vertical?round=1&sequence=${id}`);
    } else {
      navigate(`/game-preview/intro`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Configuração</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Delineamento</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Escolha a sequência experimental</h1>
        <p className="text-sm text-slate-500 mt-0.5">Selecione o delineamento para esta sessão. A ordem das condições determinará as regras de culturante.</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Card grid */}
          <div className="grid grid-cols-2 gap-4">
            {sequences.map((seq, i) => (
              <motion.button
                key={seq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.22, ease: "easeOut" }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSelect(seq.id)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-150 cursor-pointer"
              >
                {/* Experiment + group */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {seq.experiment}
                  </span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
                    {seq.group}
                  </span>
                </div>

                {/* Sequence ID */}
                <div>
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">{seq.id}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{seq.description}</p>
                </div>

                {/* Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
                  {seq.pills.map((pill, j) => (
                    <SequencePill key={j} {...pill} />
                  ))}
                  <span className="text-xs text-slate-300 ml-1">
                    {seq.pills.map(p => p.prime ? `${p.letter}'` : p.letter).join(" → ")}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legenda das condições</p>
            <div className="space-y-2">
              {CONDITION_LEGEND.map(({ letter, label }) => {
                const c = COLORS[letter];
                return (
                  <div key={letter} className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: c.bg, color: c.text, minWidth: 28 }}
                    >
                      {letter}
                    </span>
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
