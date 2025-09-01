import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, Settings, Plus } from "lucide-react";
import { useLocation } from "wouter";

interface Project {
  id: number;
  name: string;
  description?: string;
  userRole: string;
}

interface Guide {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  slug: string;
}

interface ProjectMember {
  id: number;
  userId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export default function ProjectDashboard() {
  const { projectId } = useParams() as { projectId: string };
  const [, setLocation] = useLocation();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: guides = [] } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: [`/api/projects/${projectId}/members`],
  });

  const currentProject = projects.find(p => p.id === parseInt(projectId));
  const projectGuides = guides.filter(g => g.projectId === parseInt(projectId));

  if (!currentProject) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Project Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const canManage = currentProject.userRole === 'admin' || currentProject.userRole === 'creator';

  return (
    <div className="h-full overflow-auto">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Project Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {currentProject.name}
            </h1>
            {currentProject.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {currentProject.description}
              </p>
            )}
            <div className="mt-2">
              <Badge variant="secondary">
                Your Role: {currentProject.userRole}
              </Badge>
            </div>
          </div>
          {canManage && (
            <Button
              onClick={() => setLocation(`/admin/${projectId}`)}
              variant="outline"
              data-testid="button-manage-project"
            >
              <Settings className="mr-2 h-4 w-4" />
              Manage Project
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Guides</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectGuides.length}</div>
              <p className="text-xs text-muted-foreground">
                Available onboarding guides
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">
                People with access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Access</CardTitle>
              <Badge variant="outline" className="ml-auto">
                {currentProject.userRole}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {canManage ? 'Full management access' : 'Read-only access'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guides Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Onboarding Guides</CardTitle>
              <CardDescription>
                Available guides in this project
              </CardDescription>
            </div>
            {canManage && (
              <Button 
                onClick={() => setLocation("/editor")}
                data-testid="button-create-guide"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Guide
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {projectGuides.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No guides yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This project doesn't have any onboarding guides yet.
                </p>
                {canManage && (
                  <Button 
                    onClick={() => setLocation("/editor")}
                    data-testid="button-create-first-guide"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Guide
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectGuides.map((guide) => (
                  <Card 
                    key={guide.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setLocation(`/guide/${guide.slug}`)}
                    data-testid={`card-guide-${guide.id}`}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      {guide.description && (
                        <CardDescription>{guide.description}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members Section */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              People who have access to this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-4">
                <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-600 dark:text-gray-400">
                  No team members found
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    data-testid={`member-${member.userId}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.firstName?.[0] || member.email?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.firstName && member.lastName 
                            ? `${member.firstName} ${member.lastName}` 
                            : member.email || `User ${member.userId}`}
                        </p>
                        {member.email && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}