import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { createSession, ResearcherApiError, type CreateSessionInput } from "../lib/researcher-api";

export function CreateSessionDialog({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [variant, setVariant] = useState<CreateSessionInput["sequenceVariant"] | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !name.trim() || !variant) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await createSession({ name, sequenceVariant: variant });
      setOpen(false);
      setName("");
      setVariant("");
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
          <DialogDescription>Defina o nome e a sequência da nova sessão.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={saving}>
          <div>
            <label htmlFor="session-name" className="block text-sm font-medium text-slate-700 mb-1">Nome da sessão</label>
            <input id="session-name" required value={name} onChange={(event) => setName(event.target.value)} disabled={saving} className="w-full rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <div>
            <label htmlFor="session-variant" className="block text-sm font-medium text-slate-700 mb-1">Sequência</label>
            <select id="session-variant" required value={variant} onChange={(event) => setVariant(event.target.value as typeof variant)} disabled={saving} className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white">
              <option value="" disabled>Selecione a sequência</option>
              <option value="ABAC">ABAC</option>
              <option value="ACAB">ACAB</option>
              <option value="BCBC">BCBC</option>
              <option value="CBCB">CBCB</option>
            </select>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim() || !variant}>{saving ? "Criando..." : "Criar sessão"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
