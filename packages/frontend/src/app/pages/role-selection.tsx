import { useNavigate } from "react-router";
import { UserCircle, Gamepad2, FlaskConical, ArrowRight } from "lucide-react";
import { Button } from "../components/button";

export function RoleSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Sistema de Experimentos Comportamentais</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Page Title */}
          <div className="mb-12">
            <h1 className="text-3xl font-semibold text-slate-900 mb-2">
              Bem-vindo
            </h1>
            <p className="text-slate-600">
              Selecione o tipo de acesso para continuar
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pesquisador Card */}
            <button
              onClick={() => navigate("/login")}
              className="group text-left bg-white rounded-lg border border-slate-200 p-8 hover:border-slate-900 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 transition-colors">
                  <UserCircle className="h-6 w-6 text-slate-700 group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Pesquisador
                  </h2>
                  <p className="text-sm text-slate-500">
                    Acesso ao painel de controle
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <p className="text-sm text-slate-600">
                Gerencie experimentos, participantes e monitore sessões em tempo real através do dashboard administrativo.
              </p>
            </button>

            {/* Participante Card */}
            <button
              onClick={() => navigate("/game-preview")}
              className="group text-left bg-white rounded-lg border border-slate-200 p-8 hover:border-slate-900 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 transition-colors">
                  <Gamepad2 className="h-6 w-6 text-slate-700 group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Participante
                  </h2>
                  <p className="text-sm text-slate-500">
                    Acesso ao experimento
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <p className="text-sm text-slate-600">
                Participe do experimento de forma intuitiva através da interface interativa preparada para sua sessão.
              </p>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-xs text-slate-500 text-center">
            Sistema MVP para TCC - Experimentos de Pesquisa Comportamental
          </p>
        </div>
      </footer>
    </div>
  );
}
