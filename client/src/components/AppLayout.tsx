import { ReactNode, createContext, useContext, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ProjectSelector } from "./ProjectSelector";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      <div className="h-screen flex bg-background">
        {/* Mobile Menu Button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-background/80 backdrop-blur-sm"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar onMobileClose={() => setIsMobileMenuOpen(false)} />
        </div>

        {/* Main Content */}
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