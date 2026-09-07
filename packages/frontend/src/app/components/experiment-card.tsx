import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Eye, Edit, MoreVertical, Trash2, Copy, Archive } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: "Draft" | "Active" | "Finished";
  lastModified?: string;
  participants?: number;
}

interface ExperimentCardProps {
  experiment: Experiment;
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ExperimentCard({ 
  experiment,
  onOpen,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: ExperimentCardProps) {
  const getStatusVariant = (status: Experiment["status"]) => {
    switch (status) {
      case "Draft":
        return "secondary";
      case "Active":
        return "success";
      case "Finished":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <Card className="hover:shadow-md transition-all group relative">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg mb-2 truncate">{experiment.name}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusVariant(experiment.status)}>
                {experiment.status}
              </Badge>
              {experiment.participants !== undefined && (
                <span className="text-xs text-slate-500">
                  {experiment.participants} participants
                </span>
              )}
            </div>
          </div>
          
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                className="bg-white border border-slate-200 rounded-md shadow-lg p-1 min-w-[160px] z-50"
                align="end"
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
                  onSelect={() => onDuplicate?.(experiment.id)}
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 rounded outline-none"
                  onSelect={() => onArchive?.(experiment.id)}
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-slate-200 my-1" />
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-red-50 text-red-600 rounded outline-none"
                  onSelect={() => onDelete?.(experiment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        <CardDescription className="mt-3 line-clamp-2">
          {experiment.description}
        </CardDescription>
        {experiment.lastModified && (
          <p className="text-xs text-slate-400 mt-2">
            Updated {experiment.lastModified}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={() => onOpen?.(experiment.id)}
          >
            <Eye className="w-4 h-4" />
            Open
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onEdit?.(experiment.id)}
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}