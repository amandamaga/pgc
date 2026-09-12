import { ResearcherSessions } from "../components/researcher-sessions";

export function DashboardPage() {
  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <ResearcherSessions />
      </div>
    </main>
  );
}
