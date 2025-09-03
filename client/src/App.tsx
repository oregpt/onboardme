import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import NotFound from "@/pages/not-found";
import SimpleLanding from "@/pages/SimpleLanding";
import Dashboard from "@/pages/Dashboard";
import ProjectDashboard from "@/pages/ProjectDashboard";
import GuideEditor from "@/pages/GuideEditor";
import GuideViewer from "@/pages/GuideViewer";
import Guides from "@/pages/Guides";
import UserProgress from "@/pages/UserProgress";
import MyProgress from "@/pages/MyProgress";
import Chat from "@/pages/Chat";
import Admin from "@/pages/Admin";
import DatabaseManagement from "@/pages/DatabaseManagement";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <Route>
          {() => (
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </Route>
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={SimpleLanding} />
          <Route path="/guide/:slug" component={GuideViewer} />
          <Route component={NotFound} />
        </>
      ) : (
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/project/:projectId" component={ProjectDashboard} />
            <Route path="/guides" component={Guides} />
            <Route path="/chat" component={Chat} />
            <Route path="/my-progress" component={MyProgress} />
            <Route path="/users" component={UserProgress} />
            <Route path="/admin/:projectId" component={Admin} />
            <Route path="/admin/database" component={DatabaseManagement} />
            <Route path="/editor" component={GuideEditor} />
            <Route path="/editor/:id" component={GuideEditor} />
            <Route path="/guide/:slug" component={GuideViewer} />
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
