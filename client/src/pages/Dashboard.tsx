import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import type { Guide } from "@shared/schema";
import { Plus, MoreHorizontal, Eye, Edit, Trash2, BookOpen, Users, BarChart, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectContext } from "@/components/AppLayout";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { selectedProjectId } = useProjectContext();
  const { isWhiteLabel } = useWhiteLabel();

  const { data: allGuides, isLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  // Get user projects and role for permission checks
  const { data: projects } = useQuery<Array<{id: number, userRole: string}>>({
    queryKey: ["/api/projects"], 
    enabled: isAuthenticated 
  });

  // For now, use the first project's role (can be enhanced for multi-project context)
  const userRole = projects?.[0]?.userRole || 'user';

  // Filter guides by selected project
  const guides = useMemo(() => {
    if (!allGuides) return [];
    if (!selectedProjectId) return allGuides;
    return allGuides.filter(guide => guide.projectId === selectedProjectId);
  }, [allGuides, selectedProjectId]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/guides/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Guide deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete guide",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this guide?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-muted-foreground mt-1">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              {(userRole === 'admin' || user?.isPlatformAdmin) && (
                <Link href="/admin/1">
                  <Button variant="outline" data-testid="button-admin">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              {!isWhiteLabel && (userRole === 'admin' || userRole === 'creator' || user?.isPlatformAdmin) && (
                <Link href="/editor">
                  <Button data-testid="button-create-guide">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Guide
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Guides</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-guides">
                  {guides?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active integration guides
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-active-users">0</div>
                <p className="text-xs text-muted-foreground">
                  Users in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-completion-rate">--</div>
                <p className="text-xs text-muted-foreground">
                  Average completion rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Guides List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Guides</CardTitle>
                  <CardDescription>
                    Manage your onboarding guides and track their performance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : guides && guides.length > 0 ? (
                <div className="space-y-4">
                  {guides.map((guide) => (
                    <div
                      key={guide.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`guide-item-${guide.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-foreground">{guide.title}</h3>
                          <Badge variant={guide.isActive ? "default" : "secondary"}>
                            {guide.isActive ? "Active" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {guide.description || "No description provided"}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>Slug: /{guide.slug}</span>
                          <span>Created: {guide.createdAt ? new Date(guide.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Link href={`/guide/${guide.slug}`}>
                          <Button variant="outline" size="sm" data-testid={`button-view-${guide.id}`}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-menu-${guide.id}`}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/editor/${guide.id}`}>
                              <DropdownMenuItem data-testid={`button-edit-${guide.id}`}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                              onClick={() => handleDelete(guide.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${guide.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {isWhiteLabel ? "No guides available" : "No guides yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {isWhiteLabel 
                      ? "There are no guides available for this project at the moment."
                      : "Create your first onboarding guide to get started"
                    }
                  </p>
                  {!isWhiteLabel && (
                    <Link href="/editor">
                      <Button data-testid="button-create-first-guide">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Guide
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
