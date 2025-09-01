import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, ArrowLeft, Database } from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string;
  slug: string;
  ownerId: string;
  settings: {
    conversationHistoryEnabled: boolean;
  };
  isActive: boolean;
  userRole: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMember {
  id: number;
  projectId: number;
  userId: string;
  role: string;
  joinedAt: string;
}

export default function Admin() {
  const [, params] = useRoute("/admin/:projectId");
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");
  
  const projectId = params?.projectId ? parseInt(params.projectId) : null;

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId && isAuthenticated,
  });

  // Fetch project members
  const { data: members, isLoading: membersLoading } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", projectId, "members"],
    enabled: !!projectId && isAuthenticated,
  });

  // Update project settings mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: Partial<Project>) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Settings Updated",
        description: "Project settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update project settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConversationHistoryToggle = (enabled: boolean) => {
    if (!project) return;
    
    const updatedSettings = {
      ...project.settings,
      conversationHistoryEnabled: enabled,
    };
    
    updateProjectMutation.mutate({
      settings: updatedSettings,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to access the admin panel.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Invalid project ID.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Project not found or access denied.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is admin
  const isAdmin = project.userRole === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-admin-title">
              Admin Panel
            </h1>
            <p className="text-muted-foreground" data-testid="text-project-name">
              {project.name}
            </p>
          </div>
          <Badge variant={isAdmin ? "default" : "secondary"} data-testid={`badge-role-${project.userRole}`}>
            {project.userRole.charAt(0).toUpperCase() + project.userRole.slice(1)}
          </Badge>
        </div>

        {!isAdmin && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
            <CardContent className="pt-4">
              <p className="text-yellow-800 dark:text-yellow-200" data-testid="text-access-warning">
                You have limited access to this project. Only admins can modify settings.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="flex items-center gap-2" data-testid="tab-settings">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2" data-testid="tab-members">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  AI & Data Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between" data-testid="setting-conversation-history">
                  <div className="space-y-1">
                    <h3 className="font-medium">Conversation History Storage</h3>
                    <p className="text-sm text-muted-foreground">
                      Store AI chat conversations for training and analysis purposes
                    </p>
                  </div>
                  <Switch
                    checked={project.settings.conversationHistoryEnabled}
                    onCheckedChange={handleConversationHistoryToggle}
                    disabled={!isAdmin || updateProjectMutation.isPending}
                    data-testid="switch-conversation-history"
                  />
                </div>
                
                {project.settings.conversationHistoryEnabled && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200" data-testid="text-history-enabled">
                      ✓ Conversation history is enabled. All AI chat interactions will be stored securely for training purposes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project ID</label>
                  <p className="font-mono text-sm" data-testid="text-project-id">{project.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Slug</label>
                  <p className="font-mono text-sm" data-testid="text-project-slug">{project.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm" data-testid="text-project-created">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Members</CardTitle>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading members...</p>
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-4">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                        data-testid={`member-${member.userId}`}
                      >
                        <div>
                          <p className="font-medium" data-testid={`member-id-${member.userId}`}>
                            {member.userId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={member.role === 'admin' ? 'default' : member.role === 'creator' ? 'secondary' : 'outline'}
                          data-testid={`member-role-${member.userId}`}
                        >
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-members">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No members found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}