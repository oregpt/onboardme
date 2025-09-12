import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Users, ArrowLeft, Database, Plus, Edit, Trash2, ChevronDown, ChevronRight, AlertTriangle, FileText, Bot, Globe, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MarkdownImport from "@/components/MarkdownImport";

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
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AiPromptConfig {
  prompt: string;
  updatedAt?: string;
  updatedBy?: string;
}

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState<number | null>(null);
  const [showDeleteProject, setShowDeleteProject] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("user");
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [activeTab, setActiveTab] = useState("projects");
  const [editingAiAssistant, setEditingAiAssistant] = useState(false);
  const [editingAiGenerator, setEditingAiGenerator] = useState(false);

  // AI Prompt validation schema
  const aiPromptSchema = z.object({
    prompt: z.string().min(1, "Prompt is required").max(20000, "Prompt too long")
  });

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

  // Fetch AI system prompt config (platform admins only)
  const { data: aiPromptConfig, isLoading: aiPromptLoading } = useQuery<AiPromptConfig>({
    queryKey: ["/api/admin/config/ai-system-prompt"],
    enabled: !!(isAuthenticated && user?.isPlatformAdmin),
  });

  // Fetch AI generator prompt config (platform admins only)
  const { data: aiGeneratorConfig, isLoading: aiGeneratorLoading } = useQuery<AiPromptConfig>({
    queryKey: ["/api/admin/config/ai-generator-prompt"],
    enabled: !!(isAuthenticated && user?.isPlatformAdmin),
  });

  // AI assistant prompt form
  const aiPromptForm = useForm<z.infer<typeof aiPromptSchema>>({
    resolver: zodResolver(aiPromptSchema),
    defaultValues: {
      prompt: aiPromptConfig?.prompt || "",
    },
  });

  // AI generator prompt form
  const aiGeneratorForm = useForm<z.infer<typeof aiPromptSchema>>({
    resolver: zodResolver(aiPromptSchema),
    defaultValues: {
      prompt: aiGeneratorConfig?.prompt || "",
    },
  });

  // Update default values when configs load
  useEffect(() => {
    if (aiPromptConfig?.prompt) {
      aiPromptForm.reset({ prompt: aiPromptConfig.prompt });
    }
  }, [aiPromptConfig, aiPromptForm]);

  useEffect(() => {
    if (aiGeneratorConfig?.prompt) {
      aiGeneratorForm.reset({ prompt: aiGeneratorConfig.prompt });
    }
  }, [aiGeneratorConfig, aiGeneratorForm]);

  // AI assistant prompt update mutation
  const updateAiPromptMutation = useMutation({
    mutationFn: async (data: z.infer<typeof aiPromptSchema>) => {
      const response = await apiRequest("PUT", "/api/admin/config/ai-system-prompt", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config/ai-system-prompt"] });
      setEditingAiAssistant(false);
      toast({
        title: "AI Assistant Prompt Updated",
        description: "The AI assistant prompt has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update AI assistant prompt",
        variant: "destructive",
      });
    },
  });

  // AI generator prompt update mutation
  const updateAiGeneratorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof aiPromptSchema>) => {
      const response = await apiRequest("PUT", "/api/admin/config/ai-generator-prompt", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/config/ai-generator-prompt"] });
      setEditingAiGenerator(false);
      toast({
        title: "AI Generator Prompt Updated",
        description: "The AI generator prompt has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update AI generator prompt",
        variant: "destructive",
      });
    },
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

  const deleteProjectMutation = useMutation({
    mutationFn: async ({ projectId, confirmationName }: { projectId: number; confirmationName: string }) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`, { confirmationName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects"] });
      setShowDeleteProject(null);
      setDeleteConfirmationName("");
      setExpandedProject(null); // Close any expanded project
      toast({
        title: "Project Deleted",
        description: "Project has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete project. Please try again.",
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
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
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
        </div>

        {/* Main Content */}
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-admin">
            <TabsTrigger value="projects" data-testid="tab-projects">
              <Users className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            {user?.isPlatformAdmin && (
              <TabsTrigger value="platform" data-testid="tab-platform-settings">
                <Bot className="w-4 h-4 mr-2" />
                Platform Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
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
                        <div className="flex-1">
                          {editingProject === project.id ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editProjectName}
                                onChange={(e) => setEditProjectName(e.target.value)}
                                className="font-medium text-lg"
                                data-testid={`input-edit-name-${project.id}`}
                              />
                              <Textarea
                                value={editProjectDescription}
                                onChange={(e) => setEditProjectDescription(e.target.value)}
                                className="text-sm resize-none"
                                rows={2}
                                data-testid={`textarea-edit-description-${project.id}`}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updateProjectMutation.mutate({
                                      projectId: project.id,
                                      updates: { name: editProjectName, description: editProjectDescription }
                                    });
                                    setEditingProject(null);
                                  }}
                                  disabled={!editProjectName || updateProjectMutation.isPending}
                                  data-testid={`button-save-${project.id}`}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingProject(null)}
                                  data-testid={`button-cancel-edit-${project.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-lg" data-testid={`project-name-${project.id}`}>
                                  {project.name}
                                </h3>
                                {(project.userRole === 'admin' || user?.isPlatformAdmin) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditProjectName(project.name);
                                      setEditProjectDescription(project.description || '');
                                      setEditingProject(project.id);
                                    }}
                                    className="h-6 w-6 p-0"
                                    data-testid={`button-edit-${project.id}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {project.description || 'No description'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Created {new Date(project.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.isActive ? 'default' : 'secondary'}>
                          {project.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant={project.userRole === 'admin' ? 'default' : project.userRole === 'creator' ? 'secondary' : 'outline'}>
                          {project.userRole ? project.userRole.charAt(0).toUpperCase() + project.userRole.slice(1) : 'User'}
                        </Badge>
                        {/* Delete button for platform admins only */}
                        {user?.isPlatformAdmin && (
                          <Dialog open={showDeleteProject === project.id} onOpenChange={(open) => setShowDeleteProject(open ? project.id : null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="ml-2"
                                data-testid={`button-delete-project-${project.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-destructive">
                                  <AlertTriangle className="w-5 h-5" />
                                  Delete Project
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                  <p className="text-sm font-medium text-destructive mb-2">
                                    ⚠️ DANGER: This action cannot be undone!
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    This will permanently delete the project "{project.name}" and all associated:
                                  </p>
                                  <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
                                    <li>Guides and flow boxes</li>
                                    <li>User progress data</li>
                                    <li>Project members</li>
                                    <li>Conversation history</li>
                                    <li>All related data</li>
                                  </ul>
                                </div>
                                
                                <div>
                                  <Label htmlFor="delete-confirmation">Type the project name to confirm:</Label>
                                  <Input
                                    id="delete-confirmation"
                                    value={deleteConfirmationName}
                                    onChange={(e) => setDeleteConfirmationName(e.target.value)}
                                    placeholder={project.name}
                                    className="mt-1"
                                    data-testid="input-delete-confirmation"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Type exactly: <span className="font-mono font-medium">{project.name}</span>
                                  </p>
                                </div>
                                
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowDeleteProject(null);
                                      setDeleteConfirmationName("");
                                    }}
                                    data-testid="button-cancel-delete"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteProjectMutation.mutate({ 
                                      projectId: project.id, 
                                      confirmationName: deleteConfirmationName 
                                    })}
                                    disabled={deleteConfirmationName !== project.name || deleteProjectMutation.isPending}
                                    data-testid="button-confirm-delete"
                                  >
                                    {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
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
                                  <div className="flex items-center gap-3">
                                    {member.profileImageUrl && (
                                      <img 
                                        src={member.profileImageUrl} 
                                        alt="Profile" 
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    )}
                                    <div>
                                      <p className="font-medium" data-testid={`member-email-${member.userId}`}>
                                        {member.email || `User ${member.userId}`}
                                      </p>
                                      {member.firstName || member.lastName ? (
                                        <p className="text-sm text-muted-foreground">
                                          {[member.firstName, member.lastName].filter(Boolean).join(' ')}
                                        </p>
                                      ) : null}
                                    </div>
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
                                        onClick={async () => {
                                          try {
                                            const response = await fetch(`/api/projects/${project.id}/members/${member.id}`, {
                                              method: 'DELETE',
                                            });
                                            
                                            if (response.ok) {
                                              toast({
                                                title: "Member removed",
                                                description: "Member has been successfully removed from the project.",
                                              });
                                              // Refresh the projects list
                                              queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
                                            } else {
                                              throw new Error('Failed to remove member');
                                            }
                                          } catch (error) {
                                            console.error('Error removing member:', error);
                                            toast({
                                              title: "Error",
                                              description: "Failed to remove member from project.",
                                              variant: "destructive",
                                            });
                                          }
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

          {/* Markdown Import Section */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Import Markdown Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarkdownImport />
              </CardContent>
            </Card>
          </div>
          </TabsContent>

          {/* Platform Settings Tab */}
          {user?.isPlatformAdmin && (
            <TabsContent value="platform" className="space-y-6">
              
              {/* AI Assistant Prompt Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    AI Assistant Prompt
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure the system prompt used by the AI assistant when helping users with guides.
                  </p>
                </CardHeader>
                <CardContent>
                  {aiPromptLoading ? (
                    <div className="text-center py-8" data-testid="loading-ai-assistant-prompt">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading configuration...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!editingAiAssistant ? (
                        <>
                          {/* Display current prompt */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Current Prompt</h4>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingAiAssistant(true)}
                                data-testid="button-edit-ai-assistant"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                            <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
                              <pre className="text-sm whitespace-pre-wrap font-mono" data-testid="text-current-ai-assistant-prompt">
                                {aiPromptConfig?.prompt || "No prompt configured"}
                              </pre>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {aiPromptConfig?.prompt?.length || 0} characters
                              {aiPromptConfig?.updatedAt && (
                                <span className="ml-4" data-testid="text-ai-assistant-last-updated">
                                  Last updated: {new Date(aiPromptConfig.updatedAt).toLocaleString()}
                                  {aiPromptConfig.updatedBy && ` by ${aiPromptConfig.updatedBy}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Edit mode */}
                          <Form {...aiPromptForm}>
                            <form 
                              onSubmit={aiPromptForm.handleSubmit((data) => updateAiPromptMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <FormField
                                control={aiPromptForm.control}
                                name="prompt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>AI Assistant Prompt</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Enter the AI assistant prompt here. Use {CONTEXT} placeholder to include guide-specific context."
                                        className="min-h-[300px] font-mono"
                                        disabled={updateAiPromptMutation.isPending}
                                        data-testid="input-ai-assistant-prompt"
                                      />
                                    </FormControl>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                      <span>Use {"{CONTEXT}"} placeholder to include guide context</span>
                                      <span>{field.value?.length || 0} / 20,000 characters</span>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  type="submit" 
                                  disabled={updateAiPromptMutation.isPending}
                                  data-testid="button-save-ai-assistant"
                                >
                                  {updateAiPromptMutation.isPending ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Settings className="w-4 h-4 mr-2" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingAiAssistant(false);
                                    aiPromptForm.reset({ prompt: aiPromptConfig?.prompt || "" });
                                  }}
                                  disabled={updateAiPromptMutation.isPending}
                                  data-testid="button-cancel-ai-assistant"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Generator Prompt Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    AI Generator Prompt
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure the system prompt used by the AI Generator when creating new guides.
                  </p>
                </CardHeader>
                <CardContent>
                  {aiGeneratorLoading ? (
                    <div className="text-center py-8" data-testid="loading-ai-generator-prompt">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Loading configuration...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!editingAiGenerator ? (
                        <>
                          {/* Display current prompt */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Current Prompt</h4>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEditingAiGenerator(true)}
                                data-testid="button-edit-ai-generator"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </Button>
                            </div>
                            <div className="bg-muted p-4 rounded-md max-h-[200px] overflow-y-auto">
                              <pre className="text-sm whitespace-pre-wrap font-mono" data-testid="text-current-ai-generator-prompt">
                                {aiGeneratorConfig?.prompt || "No prompt configured"}
                              </pre>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {aiGeneratorConfig?.prompt?.length || 0} characters
                              {aiGeneratorConfig?.updatedAt && (
                                <span className="ml-4" data-testid="text-ai-generator-last-updated">
                                  Last updated: {new Date(aiGeneratorConfig.updatedAt).toLocaleString()}
                                  {aiGeneratorConfig.updatedBy && ` by ${aiGeneratorConfig.updatedBy}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Edit mode */}
                          <Form {...aiGeneratorForm}>
                            <form 
                              onSubmit={aiGeneratorForm.handleSubmit((data) => updateAiGeneratorMutation.mutate(data))}
                              className="space-y-4"
                            >
                              <FormField
                                control={aiGeneratorForm.control}
                                name="prompt"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>AI Generator Prompt</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        {...field}
                                        placeholder="Enter the AI generator prompt here. Use {CONTEXT} placeholder to include guide-specific context."
                                        className="min-h-[300px] font-mono"
                                        disabled={updateAiGeneratorMutation.isPending}
                                        data-testid="input-ai-generator-prompt"
                                      />
                                    </FormControl>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                      <span>Use {"{CONTEXT}"} placeholder to include guide context</span>
                                      <span>{field.value?.length || 0} / 20,000 characters</span>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  type="submit" 
                                  disabled={updateAiGeneratorMutation.isPending}
                                  data-testid="button-save-ai-generator"
                                >
                                  {updateAiGeneratorMutation.isPending ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Settings className="w-4 h-4 mr-2" />
                                      Save
                                    </>
                                  )}
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingAiGenerator(false);
                                    aiGeneratorForm.reset({ prompt: aiGeneratorConfig?.prompt || "" });
                                  }}
                                  disabled={updateAiGeneratorMutation.isPending}
                                  data-testid="button-cancel-ai-generator"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Domain Mappings Management */}
              <CustomDomainMappings />
            </TabsContent>
          )}
          
        </Tabs>
        </div>
      </div>
    </div>
  );
}

// Custom Domain Mappings Management Component
function CustomDomainMappings() {
  const { toast } = useToast();
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [editingDomain, setEditingDomain] = useState<number | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<number | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<number | null>(null);

  // Domain mapping schema
  const domainMappingSchema = z.object({
    domain: z.string().min(1, "Domain is required").regex(/^[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]$/, "Invalid domain format"),
    pathPrefix: z.string().default("/"),
    feature: z.enum(["chat", "guides", "both"]),
    routeMode: z.enum(["single_guide", "project_guides"]),
    projectId: z.coerce.number().optional(),
    guideId: z.coerce.number().optional(),
    defaultGuideSlug: z.string().optional(),
    theme: z.object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      background: z.string().optional(),
      text: z.string().optional(),
    }).optional(),
    isActive: z.boolean().default(true),
  });

  type DomainMappingForm = z.infer<typeof domainMappingSchema>;

  interface CustomDomainMapping {
    id: number;
    domain: string;
    pathPrefix: string;
    feature: 'chat' | 'guides' | 'both';
    routeMode: 'single_guide' | 'project_guides';
    projectId: number | null;
    guideId: number | null;
    defaultGuideSlug: string | null;
    theme: any;
    isActive: boolean;
    verifiedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }

  // Fetch all domain mappings
  const { data: domainMappings, isLoading: domainMappingsLoading } = useQuery<CustomDomainMapping[]>({
    queryKey: ["/api/admin/custom-domains"],
  });

  // Fetch projects for dropdown
  const { data: allProjects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch guides for dropdown
  const { data: allGuides } = useQuery<any[]>({
    queryKey: ["/api/guides"],
  });

  // Domain form
  const domainForm = useForm<DomainMappingForm>({
    resolver: zodResolver(domainMappingSchema),
    defaultValues: {
      pathPrefix: "/",
      feature: "both",
      routeMode: "project_guides",
      isActive: true,
      theme: {
        primary: "#3b82f6",
        secondary: "#f3f4f6",
        background: "#ffffff",
        text: "#1f2937",
      }
    },
  });

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: async (data: DomainMappingForm) => {
      return await apiRequest("POST", "/api/admin/custom-domains", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-domains"] });
      toast({
        title: "Success",
        description: "Domain mapping created successfully",
      });
      setShowAddDomain(false);
      domainForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create domain mapping",
        variant: "destructive",
      });
    },
  });

  // Update domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DomainMappingForm> }) => {
      return await apiRequest("PUT", `/api/admin/custom-domains/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-domains"] });
      toast({
        title: "Success", 
        description: "Domain mapping updated successfully",
      });
      setEditingDomain(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update domain mapping",
        variant: "destructive",
      });
    },
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/custom-domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-domains"] });
      toast({
        title: "Success",
        description: "Domain mapping deleted successfully",
      });
      setDeletingDomain(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete domain mapping", 
        variant: "destructive",
      });
    },
  });

  // Verify DNS mutation
  const verifyDnsMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/admin/custom-domains/${id}/verify-dns`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-domains"] });
      toast({
        title: data.verified ? "Success" : "Warning",
        description: data.message,
        variant: data.verified ? "default" : "destructive",
      });
      setVerifyingDomain(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to verify DNS",
        variant: "destructive",
      });
      setVerifyingDomain(null);
    },
  });

  const handleEdit = (domain: CustomDomainMapping) => {
    domainForm.reset({
      domain: domain.domain,
      pathPrefix: domain.pathPrefix,
      feature: domain.feature,
      routeMode: domain.routeMode,
      projectId: domain.projectId || undefined,
      guideId: domain.guideId || undefined,
      defaultGuideSlug: domain.defaultGuideSlug || undefined,
      theme: domain.theme || {
        primary: "#3b82f6",
        secondary: "#f3f4f6", 
        background: "#ffffff",
        text: "#1f2937",
      },
      isActive: domain.isActive,
    });
    setEditingDomain(domain.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Custom Domain Mappings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage custom domains for white-label guide embedding. Configure domains to serve guides and chat functionality on client websites.
        </p>
      </CardHeader>
      <CardContent>
        {domainMappingsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading domain mappings...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add Domain Button */}
            <div className="flex justify-end">
              <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-domain">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Custom Domain Mapping</DialogTitle>
                  </DialogHeader>
                  <Form {...domainForm}>
                    <form onSubmit={domainForm.handleSubmit((data) => createDomainMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={domainForm.control}
                          name="domain"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Domain</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="help.example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={domainForm.control}
                          name="pathPrefix"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Path Prefix</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="/" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={domainForm.control}
                          name="feature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Features</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="guides">Guides Only</SelectItem>
                                    <SelectItem value="chat">Chat Only</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={domainForm.control}
                          name="routeMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Route Mode</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="single_guide">Single Guide</SelectItem>
                                    <SelectItem value="project_guides">Project Guides</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Conditional fields based on route mode */}
                      {domainForm.watch("routeMode") === "single_guide" && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={domainForm.control}
                            name="guideId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Guide ID</FormLabel>
                                <FormControl>
                                  <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select guide..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allGuides?.map((guide) => (
                                        <SelectItem key={guide.id} value={guide.id.toString()}>
                                          {guide.title}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={domainForm.control}
                            name="defaultGuideSlug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Guide Slug</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="getting-started" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {domainForm.watch("routeMode") === "project_guides" && (
                        <FormField
                          control={domainForm.control}
                          name="projectId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project</FormLabel>
                              <FormControl>
                                <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select project..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allProjects?.map((project) => (
                                      <SelectItem key={project.id} value={project.id.toString()}>
                                        {project.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Theme Configuration */}
                      <div className="space-y-2">
                        <Label>Theme Configuration</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={domainForm.control}
                            name="theme.primary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Color</FormLabel>
                                <FormControl>
                                  <Input {...field} type="color" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={domainForm.control}
                            name="theme.secondary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secondary Color</FormLabel>
                                <FormControl>
                                  <Input {...field} type="color" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <FormField
                        control={domainForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Enable this domain mapping
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddDomain(false);
                            domainForm.reset();
                          }}
                          disabled={createDomainMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createDomainMutation.isPending}>
                          {createDomainMutation.isPending ? "Creating..." : "Create Domain"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Domain Mappings List */}
            {!domainMappings || domainMappings.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Custom Domains</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first custom domain to enable white-label guide embedding.
                </p>
                <Button onClick={() => setShowAddDomain(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Domain
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {domainMappings.map((domain) => (
                  <Card key={domain.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <ExternalLink className="w-4 h-4" />
                              {domain.domain}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant={domain.isActive ? "default" : "secondary"}>
                                {domain.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant={domain.verifiedAt ? "default" : "secondary"} className={`flex items-center gap-1 ${domain.verifiedAt ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {domain.verifiedAt ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    Verified
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" />
                                    Unverified
                                  </>
                                )}
                              </Badge>
                              <Badge variant="outline">{domain.feature}</Badge>
                              <Badge variant="outline">{domain.routeMode.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {domain.pathPrefix !== "/" && `Path: ${domain.pathPrefix} • `}
                            {domain.routeMode === "single_guide" 
                              ? `Guide ID: ${domain.guideId}${domain.defaultGuideSlug ? ` (${domain.defaultGuideSlug})` : ''}`
                              : `Project ID: ${domain.projectId}`
                            }
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          {!domain.verifiedAt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVerifyingDomain(domain.id);
                                verifyDnsMutation.mutate(domain.id);
                              }}
                              disabled={verifyingDomain === domain.id}
                            >
                              {verifyingDomain === domain.id ? "Verifying..." : "Verify DNS"}
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(domain)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingDomain(domain.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {domain.theme && (
                      <CardContent className="pt-0">
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Theme:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: domain.theme.primary }}></div>
                            <span>Primary</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded border" style={{ backgroundColor: domain.theme.secondary }}></div>
                            <span>Secondary</span>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Domain Dialog */}
        <Dialog open={!!editingDomain} onOpenChange={() => setEditingDomain(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Domain Mapping</DialogTitle>
            </DialogHeader>
            <Form {...domainForm}>
              <form onSubmit={domainForm.handleSubmit((data) => {
                if (editingDomain) {
                  updateDomainMutation.mutate({ id: editingDomain, data });
                }
              })} className="space-y-4">
                {/* Same form fields as create, but pre-populated */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={domainForm.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="help.example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={domainForm.control}
                    name="pathPrefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Path Prefix</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="/" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={domainForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable this domain mapping
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDomain(null)}
                    disabled={updateDomainMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateDomainMutation.isPending}>
                    {updateDomainMutation.isPending ? "Updating..." : "Update Domain"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Domain Dialog */}
        <Dialog open={!!deletingDomain} onOpenChange={() => setDeletingDomain(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Domain Mapping</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Warning: This action cannot be undone</p>
                  <p className="text-sm text-muted-foreground">
                    This will permanently delete the domain mapping and all associated configurations.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setDeletingDomain(null)}
                  disabled={deleteDomainMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (deletingDomain) {
                      deleteDomainMutation.mutate(deletingDomain);
                    }
                  }}
                  disabled={deleteDomainMutation.isPending}
                >
                  {deleteDomainMutation.isPending ? "Deleting..." : "Delete Domain"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}