import { Link } from "react-router";
import { FlaskConical } from "lucide-react";

// O cadastro não é aberto: contas de pesquisadora são criadas pela equipe,
// pelo script `researcher:provision` do backend. Esta página existe para quem
// chegar aqui por link antigo não ficar preenchendo um formulário que não cria nada.
export function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-slate-900 mb-4">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Acesso restrito</h1>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
          <p className="text-slate-700">
            As contas de pesquisadora são criadas pela equipe responsável pelo estudo.
            Não há cadastro automático neste sistema.
          </p>
          <p className="text-sm text-slate-500">
            Se você participa da pesquisa e ainda não tem acesso, peça suas credenciais
            à responsável pelo estudo.
          </p>
          <Link
            to="/login"
            className="block text-center rounded-lg bg-slate-900 text-white py-2 font-medium hover:bg-slate-800"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
