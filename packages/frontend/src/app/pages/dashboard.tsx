import { ResearcherSessions } from "../components/researcher-sessions";

export function DashboardPage() {
  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">Sessões</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie e monitore as sessões dos participantes
          </p>
        </div>
        <ResearcherSessions />
      </div>
    </main>
  );
}
