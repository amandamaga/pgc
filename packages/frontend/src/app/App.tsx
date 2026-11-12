import { createBrowserRouter, RouterProvider, redirect } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { ResearcherSessionPanelPage } from "./pages/researcher-session-panel";
import { SessionParticipantsPage } from "./pages/session-participants";
import { SessionDetailPage } from "./pages/session-detail";
import { ParticipantAccessPage } from "./pages/game/participant-access";
import { DashboardLayout } from "./layouts/dashboard-layout";
import { LoginPage } from "./pages/login";
import { RegisterPage } from "./pages/register";
import { DashboardPage } from "./pages/dashboard";

// Rotas do sistema.
//   Pesquisadora: /login, /researcher (lista de sessões) e
//   /researcher/sessions/:id (participantes e monitoramento).
//   Criança: /participant#token=... (link individual gerado no painel).
//
// Removido em nov/2026: o jogo de demonstração antigo, simulado no próprio
// navegador e sem servidor, que respondia em /game-preview e
// /session/:sessionId/participant/:participantId. O jogo real é
// pages/game/experiment-flow-vertical.tsx, aberto por /participant.
const router = createBrowserRouter([
  { path: "/", loader: () => redirect("/login") },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/participant", Component: ParticipantAccessPage },
  { path: "/researcher", Component: DashboardLayout, children: [{ index: true, Component: DashboardPage }] },
  {
    path: "/researcher/sessions/:sessionId",
    Component: DashboardLayout,
    children: [{
      Component: SessionDetailPage,
      children: [
        { index: true, Component: SessionParticipantsPage },
        { path: "participants", Component: SessionParticipantsPage },
        { path: "monitor", Component: ResearcherSessionPanelPage },
      ],
    }],
  },
  // Endereço desconhecido (inclusive os do jogo antigo): volta para o login,
  // como a raiz, em vez da página de erro do roteador.
  { path: "*", loader: () => redirect("/login") },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* Avisos passageiros de confirmação (ex.: sessão apagada). */}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
