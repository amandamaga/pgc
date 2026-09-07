import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { FlaskConical } from "lucide-react";
import { Button } from "../components/button";

export function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert("As senhas não correspondem");
      return;
    }
    
    // Mock registration - in real app, this would create account
    console.log("Creating account:", formData);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-slate-900 mb-4">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Criar Conta</h1>
          <p className="text-sm text-slate-500 mt-1">
            Junte-se ao Hub de Pesquisa para gerenciar seus experimentos
          </p>
        </div>

        {/* Register form */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Dr. João Silva"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="pesquisador@universidade.br"
                required
              />
            </div>

            {/* Institution */}
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-slate-900 mb-2">
                Instituição
              </label>
              <input
                type="text"
                id="institution"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Nome da Universidade"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-2">
                Senha
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">Mínimo de 8 caracteres</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-900 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                required
              />
              <label htmlFor="terms" className="text-sm text-slate-600">
                Eu concordo com os{" "}
                <button type="button" className="text-slate-900 hover:underline">
                  Termos de Serviço
                </button>{" "}
                e a{" "}
                <button type="button" className="text-slate-900 hover:underline">
                  Política de Privacidade
                </button>
              </label>
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full">
              Criar Conta
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-slate-900 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}