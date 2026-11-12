import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import {
  createSession,
  ResearcherApiError,
  SEQUENCE_PRESETS,
  type BlockConditions,
  type Condition,
} from "../lib/researcher-api";

// Cada bloco começa vazio: a pesquisadora escolhe (ou usa um atalho) antes de criar.
type BlockChoice = Condition | "";
const EMPTY_BLOCKS: BlockChoice[] = ["", "", "", ""];
const CONDITIONS: Condition[] = ["A", "B", "C"];

function isComplete(blocks: BlockChoice[]): blocks is BlockConditions {
  return blocks.length === 4 && blocks.every((c) => c !== "");
}

export function CreateSessionDialog({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [blocks, setBlocks] = useState<BlockChoice[]>(EMPTY_BLOCKS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const complete = isComplete(blocks);
  const anyChosen = blocks.some((c) => c !== "");
  // Prévia curta, como na lista: "ABAC"; "?" nos blocos que faltam ("AB??").
  const preview = anyChosen ? blocks.map((c) => c || "?").join("") : "—";

  function setBlock(index: number, value: BlockChoice) {
    setBlocks((current) => current.map((c, i) => (i === index ? value : c)));
  }

  function resetForm() {
    setName("");
    setBlocks(EMPTY_BLOCKS);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !name.trim() || !isComplete(blocks)) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await createSession({ name, blockConditions: blocks });
      setOpen(false);
      resetForm();
      onCreated();
    } catch (err) {
      if (err instanceof ResearcherApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Não foi possível criar a sessão.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (submitting.current) return;
      setOpen(value);
      setError("");
    }}>
      <DialogTrigger asChild><Button size="sm">Criar sessão</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar sessão</DialogTitle>
          <DialogDescription>Defina o nome e a condição de cada bloco da nova sessão.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={saving}>
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-slate-700 mb-1">Nome da sessão</label>
            <input id="session-name" required value={name} onChange={(event) => setName(event.target.value)} disabled={saving} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>

          <fieldset disabled={saving} className="space-y-3">
            <legend className="block text-sm font-medium text-slate-700 mb-1">Condição de cada bloco</legend>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Atalhos:</span>
              {Object.entries(SEQUENCE_PRESETS).map(([label, conditions]) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  aria-label={`Preencher os blocos com ${label}`}
                  onClick={() => setBlocks([...conditions])}
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {blocks.map((value, index) => (
                <div key={index} className="flex items-center gap-2">
                  <label htmlFor={`session-block-${index + 1}`} className="w-16 shrink-0 text-sm text-slate-700">
                    Bloco {index + 1}
                  </label>
                  <select
                    id={`session-block-${index + 1}`}
                    required
                    value={value}
                    onChange={(event) => setBlock(index, event.target.value as BlockChoice)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="" disabled>—</option>
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-600" aria-live="polite">
              Sequência: <span className="font-mono font-medium text-slate-900">{preview}</span>
            </p>
          </fieldset>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim() || !complete}>{saving ? "Criando..." : "Criar sessão"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
