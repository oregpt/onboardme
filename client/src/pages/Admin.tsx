import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, ArrowLeft, Database, Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";

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
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("user");

  // Fetch all projects for admin view
  const { data: allProjects, isLoading: allProjectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  // Fetch project members for expanded project
  const { data: members, isLoading: membersLoading } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", expandedProject, "members"],
    enabled: !!expandedProject && isAuthenticated,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description: string }) => {
      return await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreateProject(false);
      setNewProjectName("");
      setNewProjectDescription("");
      toast({
        title: "Project Created",
        description: "New project has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: number; updates: Partial<Project> }) => {
      const response = await apiRequest("PUT", `/api/projects/${projectId}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

  const addMemberMutation = useMutation({
    mutationFn: async ({ projectId, memberData }: { projectId: number; memberData: { email: string; role: string } }) => {
      return await apiRequest("POST", `/api/projects/${projectId}/members`, memberData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", expandedProject, "members"] });
      setShowAddMember(null);
      setNewMemberEmail("");
      setNewMemberRole("user");
      toast({
        title: "Member Added",
        description: "New member has been added to the project.",
      });
    },
    onError: () => {
      toast({
        title: "Add Failed",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConversationHistoryToggle = (projectId: number, enabled: boolean) => {
    const project = allProjects?.find(p => p.id === projectId);
    if (!project) return;
    
    const updatedSettings = {
      ...project.settings,
      conversationHistoryEnabled: enabled,
    };
    
    updateProjectMutation.mutate({
      projectId,
      updates: { settings: updatedSettings },
    });
  };

  const toggleProjectExpanded = (projectId: number) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
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
              Project Management
            </h1>
            <p className="text-muted-foreground">
              Manage your projects, settings, and team members
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Create Project Button */}
          <div className="flex justify-end">
            <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-project">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                      data-testid="input-project-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Enter project description"
                      data-testid="textarea-project-description"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateProject(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createProjectMutation.mutate({ name: newProjectName, description: newProjectDescription })}
                      disabled={!newProjectName || createProjectMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Projects List */}
          {allProjectsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : allProjects && allProjects.length > 0 ? (
            <div className="space-y-4">
              {allProjects.map((project) => (
                <Card key={project.id} className="overflow-hidden" data-testid={`project-${project.id}`}>
                  {/* Project Header */}
                  <CardHeader className="cursor-pointer" onClick={() => toggleProjectExpanded(project.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedProject === project.id ? 
                          <ChevronDown className="w-5 h-5 text-muted-foreground" /> : 
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        }
                        <div>
                          <h3 className="font-medium text-lg" data-testid={`project-name-${project.id}`}>
                            {project.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {project.description || 'No description'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.isActive ? 'default' : 'secondary'}>
                          {project.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={project.userRole === 'admin' ? 'default' : project.userRole === 'creator' ? 'secondary' : 'outline'}>
                          {project.userRole.charAt(0).toUpperCase() + project.userRole.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Project Content */}
                  {expandedProject === project.id && (
                    <CardContent className="border-t space-y-6">
                      {/* Project Settings */}
                      <div>
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Project Settings
                        </h4>
                        <div className="space-y-4 pl-6">
                          <div className="flex items-center justify-between" data-testid="setting-conversation-history">
                            <div className="space-y-1">
                              <h3 className="font-medium">Conversation History Storage</h3>
                              <p className="text-sm text-muted-foreground">
                                Store AI chat conversations for training and analysis purposes
                              </p>
                            </div>
                            <Switch
                              checked={project.settings.conversationHistoryEnabled}
                              onCheckedChange={(enabled) => handleConversationHistoryToggle(project.id, enabled)}
                              disabled={project.userRole !== 'admin' || updateProjectMutation.isPending}
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

                          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Project ID</label>
                              <p className="font-mono text-sm" data-testid="text-project-id">{project.id}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Slug</label>
                              <p className="font-mono text-sm" data-testid="text-project-slug">{project.slug}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Owner</label>
                              <p className="text-sm" data-testid="text-project-owner">{project.ownerId}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Project Members */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Project Members
                          </h4>
                          {project.userRole === 'admin' && (
                            <Dialog open={showAddMember === project.id} onOpenChange={(open) => setShowAddMember(open ? project.id : null)}>
                              <DialogTrigger asChild>
                                <Button size="sm" data-testid="button-add-member">
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Member
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Project Member</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label htmlFor="member-email">Email Address</Label>
                                    <Input
                                      id="member-email"
                                      type="email"
                                      value={newMemberEmail}
                                      onChange={(e) => setNewMemberEmail(e.target.value)}
                                      placeholder="Enter user's email"
                                      data-testid="input-member-email"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="member-role">Access Level</Label>
                                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                                      <SelectTrigger data-testid="select-member-role">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">User - View only access</SelectItem>
                                        <SelectItem value="creator">Creator - Can create and edit content</SelectItem>
                                        <SelectItem value="admin">Admin - Full project access</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setShowAddMember(null)}
                                      data-testid="button-cancel-add-member"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => addMemberMutation.mutate({ 
                                        projectId: project.id, 
                                        memberData: { email: newMemberEmail, role: newMemberRole }
                                      })}
                                      disabled={!newMemberEmail || addMemberMutation.isPending}
                                      data-testid="button-submit-add-member"
                                    >
                                      Add Member
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                        
                        <div className="pl-6">
                          {membersLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                              <p className="text-sm text-muted-foreground">Loading members...</p>
                            </div>
                          ) : members && members.length > 0 ? (
                            <div className="space-y-3">
                              {members.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between p-3 border border-border rounded-lg"
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
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={member.role === 'admin' ? 'default' : member.role === 'creator' ? 'secondary' : 'outline'}
                                      data-testid={`member-role-${member.userId}`}
                                    >
                                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                    </Badge>
                                    {project.userRole === 'admin' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          // TODO: Add remove member functionality
                                        }}
                                        data-testid={`button-remove-member-${member.userId}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4" data-testid="no-members">
                              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">No members found</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="no-projects">
              <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-6">Create your first project to get started</p>
              <Button onClick={() => setShowCreateProject(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}