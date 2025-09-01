import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  name: string;
  description?: string;
  userRole: string;
}

interface ProjectSidebarProps {
  currentProjectId?: number;
}

export function ProjectSidebar({ currentProjectId }: ProjectSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [, setLocation] = useLocation();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const handleProjectClick = (projectId: number) => {
    setLocation(`/project/${projectId}`);
  };

  const getProjectInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 text-white';
      case 'creator':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        "h-full bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-full bg-gray-800 border-r border-gray-600 flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-600 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-white font-semibold text-lg">Projects</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Projects List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {projects.map((project) => (
            <Button
              key={project.id}
              variant="ghost"
              className={cn(
                "w-full justify-start h-auto p-3 text-left transition-colors",
                currentProjectId === project.id
                  ? "bg-gray-600 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700",
                isCollapsed && "justify-center p-2"
              )}
              onClick={() => handleProjectClick(project.id)}
              data-testid={`button-project-${project.id}`}
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-slate-600 text-white text-sm">
                    {getProjectInitials(project.name)}
                  </AvatarFallback>
                </Avatar>
                
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate flex-1">
                        {project.name}
                      </span>
                      <Badge 
                        className={cn("text-xs px-1.5 py-0.5", getRoleBadgeColor(project.userRole))}
                      >
                        {project.userRole}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-400 truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-2 border-t border-gray-600">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700",
            isCollapsed && "justify-center"
          )}
          onClick={() => setLocation("/admin")}
          data-testid="button-admin-panel"
        >
          <Settings size={16} className={cn(!isCollapsed && "mr-2")} />
          {!isCollapsed && "Admin Panel"}
        </Button>
      </div>
    </div>
  );
}