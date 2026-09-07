import { ResearcherSessions } from "../components/researcher-sessions";
import { Button } from "../components/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { ExperimentsTable } from "../components/experiments-table";
import { EmptyState } from "../components/empty-state";
import { SearchFilterBar } from "../components/search-filter-bar";
import { useState } from "react";
import { useExperimentContext } from "../context/experiment-context";

export function DashboardPage() {
  const navigate = useNavigate();
  const { experiments, deleteExperiment } = useExperimentContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleCreateExperiment = () => {
    navigate("/researcher/experiments/new");
  };

  const handleOpenExperiment = (id: string) => {
    navigate(`/researcher/experiments/${id}`);
  };

  const handleDeleteExperiment = (id: string) => {
    deleteExperiment(id);
  };

  // Filter experiments based on search and status
  const filteredExperiments = experiments.filter((experiment) => {
    const matchesSearch =
      experiment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      experiment.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || experiment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <ResearcherSessions />
        <p className="text-sm text-slate-500 mb-4">Experimentos abaixo: dados locais de demonstração.</p>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Experimentos</h1>
              <p className="text-sm text-slate-500 mt-1">
                Gerencie e monitore seus experimentos de pesquisa
              </p>
            </div>
            <Button onClick={handleCreateExperiment} className="w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Criar Experimento
            </Button>
          </div>

          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>

        {filteredExperiments.length === 0 ? (
          searchQuery || statusFilter !== "all" ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">Nenhum experimento corresponde aos seus critérios de busca</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <EmptyState onCreateExperiment={handleCreateExperiment} />
          )
        ) : (
          <>
            <div className="text-sm text-slate-500 mb-4">
              {filteredExperiments.length}{" "}
              {filteredExperiments.length === 1 ? "experimento" : "experimentos"}
            </div>
            <ExperimentsTable
              experiments={filteredExperiments}
              onOpen={handleOpenExperiment}
              onDelete={handleDeleteExperiment}
            />
          </>
        )}
      </div>
    </main>
  );
}