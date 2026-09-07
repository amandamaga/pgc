import { Search, Filter } from "lucide-react";
import { Button } from "./button";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: SearchFilterBarProps) {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      all: "Todos os Status",
      Active: "Ativo",
      Draft: "Rascunho",
      Finished: "Finalizado",
    };
    return labels[status] || status;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar experimentos..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent"
        />
      </div>
      <Select.Root value={statusFilter} onValueChange={onStatusFilterChange}>
        <Select.Trigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="w-4 h-4" />
            {getStatusLabel(statusFilter)}
            <ChevronDown className="w-4 h-4 ml-auto" />
          </Button>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-50">
            <Select.Viewport className="p-1">
              <Select.Item
                value="all"
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
              >
                <Select.ItemText>Todos os Status</Select.ItemText>
              </Select.Item>
              <Select.Item
                value="Active"
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
              >
                <Select.ItemText>Ativo</Select.ItemText>
              </Select.Item>
              <Select.Item
                value="Draft"
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
              >
                <Select.ItemText>Rascunho</Select.ItemText>
              </Select.Item>
              <Select.Item
                value="Finished"
                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
              >
                <Select.ItemText>Finalizado</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
