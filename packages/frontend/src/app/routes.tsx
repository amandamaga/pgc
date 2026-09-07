import { createBrowserRouter } from "react-router";
import { ResearcherSessionPanelPage } from "./pages/researcher-session-panel";
import { ParticipantAccessPage } from "./pages/game/participant-access";
import { DashboardLayout } from "./layouts/dashboard-layout";
import { GameLayout } from "./layouts/game-layout";
import { RoleSelectionPage } from "./pages/role-selection";
import { LoginPage } from "./pages/login";
import { RegisterPage } from "./pages/register";
import { DashboardPage } from "./pages/dashboard";
import { CreateExperimentPage } from "./pages/create-experiment";
import { ExperimentDetailsPage } from "./pages/experiment-details";
import { SessionsPage } from "./pages/sessions";
import { SessionMonitorPage } from "./pages/session-monitor";
import { GameWaitingPage } from "./pages/game/waiting";
import { GameIntroPage } from "./pages/game/intro";
import { ExperimentFlowVertical } from "./pages/game/experiment-flow-vertical";
import { GameEndPage } from "./pages/game/end";

export const router = createBrowserRouter([
  { path: "/researcher/sessions/:sessionId/monitor", Component: DashboardLayout, children: [{ index: true, Component: ResearcherSessionPanelPage }] },
  { path: "/participant", Component: ParticipantAccessPage },
  // ── Role Selection (landing page) ──────────────────────────────────────────
  {
    path: "/",
    Component: RoleSelectionPage,
  },
  // ── Dashboard routes (autenticadas) ────────────────────────────────────────
  {
    path: "/researcher",
    Component: DashboardLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: "experiments/new",
        Component: CreateExperimentPage,
      },
      {
        path: "experiments/:id",
        Component: ExperimentDetailsPage,
      },
      {
        path: "experiments/:id/sessions",
        Component: SessionsPage,
      },
      {
        path: "experiments/:id/sessions/:sessionId/monitor",
        Component: SessionMonitorPage,
      },
    ],
  },
  // ── Auth routes (públicas) ─────────────────────────────────────────────────
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  // ── Game routes (participantes) ────────────────────────────────────────────
  {
    path: "/session/:sessionId/participant/:participantId",
    Component: GameLayout,
    children: [
      {
        index: true,
        Component: GameIntroPage,
      },
      {
        path: "waiting",
        Component: GameWaitingPage,
      },
      {
        path: "flow-vertical",
        Component: ExperimentFlowVertical,
      },
      {
        path: "end",
        Component: GameEndPage,
      },
      {
        path: "*",
        Component: GameIntroPage,
      },
    ],
  },
  // ── Game preview route (pesquisadores testarem) ────────────────────────────
  {
    path: "/game-preview",
    Component: GameLayout,
    children: [
      {
        index: true,
        Component: GameIntroPage,
      },
      {
        path: "intro",
        Component: GameIntroPage,
      },
      {
        path: "waiting",
        Component: GameWaitingPage,
      },
      {
        path: "flow-vertical",
        Component: ExperimentFlowVertical,
      },
      {
        path: "end",
        Component: GameEndPage,
      },
      {
        path: "*",
        Component: GameIntroPage,
      },
    ],
  },
]);
