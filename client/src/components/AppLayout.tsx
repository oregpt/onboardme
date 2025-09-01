import { ReactNode, createContext, useContext, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ProjectSelector } from "./ProjectSelector";

interface AppLayoutProps {
  children: ReactNode;
}

// Project context for filtering
interface ProjectContextType {
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
}

const ProjectContext = createContext<ProjectContextType>({
  selectedProjectId: null,
  setSelectedProjectId: () => {},
});

export const useProjectContext = () => useContext(ProjectContext);

export function AppLayout({ children }: AppLayoutProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      <div className="h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ProjectSelector />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}