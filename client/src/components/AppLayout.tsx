import { ReactNode } from "react";
import { useLocation } from "wouter";
import { ProjectSidebar } from "./ProjectSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  
  // Extract project ID from URL if we're on a project page
  const projectMatch = location.match(/^\/project\/(\d+)/);
  const currentProjectId = projectMatch ? parseInt(projectMatch[1]) : undefined;

  // Also check admin routes
  const adminMatch = location.match(/^\/admin\/(\d+)/);
  const adminProjectId = adminMatch ? parseInt(adminMatch[1]) : undefined;

  const activeProjectId = currentProjectId || adminProjectId;

  return (
    <div className="h-screen flex bg-background">
      <ProjectSidebar currentProjectId={activeProjectId} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}