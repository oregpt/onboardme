import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { Progress } from "@/components/ui/progress";
import type { Guide } from "@shared/schema";
import { Users, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UserProgress() {
  const { data: guides, isLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  // Mock user progress data - would come from backend in real implementation
  const userProgressData = [
    {
      userId: "user1",
      userName: "John Doe",
      email: "john@example.com",
      guides: [
        { guideId: 1, guideName: "ATXP Agent Onboarding", progress: 75, completedSteps: 6, totalSteps: 8, lastActive: "2025-01-01" }
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">User Progress</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track user progress across all guides
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" data-testid="button-export-progress">
                Export Data
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1</div>
                <p className="text-xs text-muted-foreground">+0% from last month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">75%</div>
                <p className="text-xs text-muted-foreground">+5% from last week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45m</div>
                <p className="text-xs text-muted-foreground">-10% from last week</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">+0 this week</p>
              </CardContent>
            </Card>
          </div>

          {/* User Progress Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Progress Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : userProgressData.length > 0 ? (
                <div className="space-y-4">
                  {userProgressData.map((user) => (
                    <div key={user.userId} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-foreground">{user.userName}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge variant="outline">
                          {user.guides.length} guide{user.guides.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      {user.guides.map((guide) => (
                        <div key={guide.guideId} className="bg-muted rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{guide.guideName}</span>
                            <span className="text-sm text-muted-foreground">
                              {guide.completedSteps}/{guide.totalSteps} steps
                            </span>
                          </div>
                          <Progress value={guide.progress} className="mb-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{guide.progress}% complete</span>
                            <span>Last active: {guide.lastActive}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <h3 className="text-lg font-medium text-foreground mb-2">No user progress data</h3>
                  <p className="text-muted-foreground">
                    Progress data will appear here once users start using your guides
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}