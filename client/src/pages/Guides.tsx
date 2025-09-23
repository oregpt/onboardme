import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Guide } from "@shared/schema";
import { Plus, Edit, Eye, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { useMemo } from "react";

export default function Guides() {
  const { selectedProjectId } = useProjectContext();
  const { isWhiteLabel, config } = useWhiteLabel();
  
  // Only call useAuth if NOT in white-label mode
  const authResult = isWhiteLabel ? { user: null, isAuthenticated: false } : useAuth();
  const { user, isAuthenticated } = authResult;
  
  const { data: allGuides, isLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  // Get user's projects to determine role (but only if authenticated and not in white-label mode)
  const { data: projects } = useQuery<Array<{id: number, userRole: string}>>(
    { queryKey: ["/api/projects"], enabled: isAuthenticated && !isWhiteLabel }
  );

  // For now, use the first project's role (can be enhanced for multi-project context)
  const userRole = projects?.[0]?.userRole || 'user';
  
  // Check if user can create/edit guides
  // In white-label mode, users can never manage guides (read-only)
  const canManageGuides = !isWhiteLabel && (userRole === 'admin' || userRole === 'creator' || user?.isPlatformAdmin);

  // Filter guides by selected project
  const guides = useMemo(() => {
    if (!allGuides) return [];
    if (!selectedProjectId) return allGuides; // Show all if no project selected
    return allGuides.filter(guide => guide.projectId === selectedProjectId);
  }, [allGuides, selectedProjectId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Guides</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your onboarding guides and workflows
              </p>
            </div>
            {canManageGuides && (
              <Link href="/editor">
                <Button data-testid="button-create-guide">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Guide
                </Button>
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto scrollbar-thin">
              {guides?.map((guide) => (
                <Card key={guide.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      <Badge variant={guide.isActive ? "default" : "secondary"}>
                        {guide.isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    {guide.description && (
                      <p className="text-sm text-muted-foreground">
                        {guide.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {canManageGuides && (
                          <Link href={`/editor/${guide.id}`}>
                            <Button size="sm" variant="outline" data-testid={`button-edit-${guide.id}`}>
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                        )}
                        <Link href={`/guide/${guide.slug}`}>
                          <Button size="sm" variant="outline" data-testid={`button-preview-${guide.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            {canManageGuides ? 'Preview' : 'View'}
                          </Button>
                        </Link>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Users className="w-4 h-4 mr-1" />
                        <span>0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) || (
                <div className="col-span-full text-center py-16">
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {canManageGuides ? 'No guides yet' : 'No guides available'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {canManageGuides 
                      ? 'Create your first onboarding guide to get started'
                      : 'No guides have been created yet. Check back later!'
                    }
                  </p>
                  {canManageGuides && (
                    <Link href="/editor">
                      <Button data-testid="button-create-first-guide">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Guide
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
}