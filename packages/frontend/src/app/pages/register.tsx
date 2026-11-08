import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

// Mesmo mínimo do backend (auth.service.ts). O backend confere de novo e é a regra que vale.
const PASSWORD_MIN_LENGTH = 8;

type RegistrationStatus = "loading" | "open" | "closed";

function apiBaseUrl(): string | null {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "");
  return base || null;
}

// O cadastro só abre quando o servidor confirma (REGISTRATION_OPEN=true no backend).
// Servidor fora do ar ou resposta estranha = tratamos como fechado.
export function RegisterPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RegistrationStatus>("loading");
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      setStatus("closed");
      return;
    }
    const controller = new AbortController();
    fetch(`${baseUrl}/auth/registration`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setStatus(body?.open === true ? "open" : "closed"))
      .catch(() => {
        if (!controller.signal.aborted) setStatus("closed");
      });
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < PASSWORD_MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
      return;
    }
    if (formData.password !== formData.confirm) {
      setError("As senhas não conferem.");
      return;
    }

    const baseUrl = apiBaseUrl();
    if (!baseUrl) {
      setError("Erro ao conectar com o servidor.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 403) {
        // O cadastro foi fechado enquanto a página estava aberta.
        setStatus("closed");
        return;
      }
      if (!response.ok || !data?.token) {
        throw new Error(typeof data?.error === "string" ? data.error : "Não foi possível criar a conta.");
      }

      localStorage.setItem("researcherToken", data.token);
      localStorage.setItem("researcher", JSON.stringify(data.researcher));
      navigate("/researcher");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="bg-primary mb-4 inline-flex size-12 items-center justify-center rounded-lg">
            <FlaskConical className="text-primary-foreground size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {status === "closed" ? "Cadastro fechado" : "Criar conta"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {status === "closed"
              ? "Hub de Pesquisa"
              : "Crie sua conta de pesquisadora para gerenciar seus experimentos"}
          </p>
        </div>

        {status === "loading" && (
          <Card>
            <CardContent className="py-6">
              <p className="text-muted-foreground text-center text-sm" role="status">
                Carregando...
              </p>
            </CardContent>
          </Card>
        )}

        {status === "closed" && (
          <Card>
            <CardContent className="space-y-4 py-6">
              <p className="text-sm">
                No momento, as contas de pesquisadora são criadas pela equipe responsável pelo estudo.
              </p>
              <p className="text-muted-foreground text-sm">
                Se você participa da pesquisa e ainda não tem acesso, peça suas credenciais à
                responsável pelo estudo.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">Ir para o login</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "open" && (
          <Card>
            <CardContent className="py-6">
              <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={120}
                    disabled={loading}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    disabled={loading}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="pesquisador@universidade.br"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    disabled={loading}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    aria-describedby="password-hint"
                  />
                  <p id="password-hint" className="text-muted-foreground text-xs">
                    Mínimo de {PASSWORD_MIN_LENGTH} caracteres.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm">Repetir senha</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={formData.confirm}
                    onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {status !== "closed" && (
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Já tem conta?{" "}
            <Link to="/login" className="text-foreground font-medium underline underline-offset-4">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
