import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "./AppLayout";

interface Project {
  id: number;
  name: string;
  description?: string;
  userRole: string;
}

export function ProjectSelector() {
  const { selectedProjectId, setSelectedProjectId } = useProjectContext();
  
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">Project:</span>
        <Select
          value={selectedProjectId?.toString() || "all"}
          onValueChange={(value) => {
            if (value === "all") {
              setSelectedProjectId(null);
            } else {
              setSelectedProjectId(parseInt(value));
            }
          }}
        >
          <SelectTrigger className="w-64" data-testid="select-project">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                <div className="flex items-center justify-between w-full">
                  <span>{project.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {project.userRole}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedProject && (
          <div className="text-sm text-muted-foreground">
            Showing content for: <span className="font-medium">{selectedProject.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}