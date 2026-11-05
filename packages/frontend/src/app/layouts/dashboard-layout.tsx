import { clearResearcherAuth } from "../lib/researcher-api";
import { Outlet, Link, useNavigate } from "react-router";
import { FlaskConical, LogOut } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

// Nome e e-mail de quem entrou, gravados pelo login (login.tsx) a partir da
// resposta de /auth/login. Antes o cabeçalho mostrava sempre o texto de exemplo
// "Pesquisador / pesquisador@uni.br" (prometido no tutorial de 17/09).
function readResearcher(): { name: string; email: string } {
  try {
    const stored = JSON.parse(localStorage.getItem("researcher") ?? "null") as
      { name?: unknown; email?: unknown } | null;
    return {
      name: typeof stored?.name === "string" && stored.name.trim() ? stored.name.trim() : "Pesquisadora",
      email: typeof stored?.email === "string" ? stored.email : "",
    };
  } catch {
    return { name: "Pesquisadora", email: "" };
  }
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const researcher = readResearcher();

  const handleLogout = () => {
    clearResearcherAuth();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/researcher" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Hub de Pesquisa</span>
          </Link>

          {/* User Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-medium" aria-hidden>
                  {researcher.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-900" data-testid="researcher-name">{researcher.name}</p>
                  {researcher.email && <p className="text-xs text-slate-500">{researcher.email}</p>}
                </div>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50"
                align="end"
                sideOffset={8}
              >
                <DropdownMenu.Item
                  onClick={handleLogout}
                  className="flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100 text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* Main Content */}
      <Outlet />
    </div>
  );
}