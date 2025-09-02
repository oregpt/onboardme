import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Guide } from "@shared/schema";
import { TrendingUp, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { useLocation } from "wouter";

export default function MyProgress() {
  const { selectedProjectId } = useProjectContext();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: allGuides, isLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  // Fetch current user's detailed progress data
  const { data: userProgressData = [], isLoading: detailedLoading } = useQuery<any[]>({
    queryKey: ["/api/user-progress/detailed"],
    staleTime: 0,
    cacheTime: 0,
    enabled: isAuthenticated,
  });

  // Filter guides by selected project
  const guides = useMemo(() => {
    if (!allGuides) return [];
    if (!selectedProjectId) return allGuides;
    return allGuides.filter(guide => guide.projectId === selectedProjectId);
  }, [allGuides, selectedProjectId]);

  // Filter progress data for current user only
  const myProgressData = useMemo(() => {
    if (!userProgressData || !user) return [];
    return userProgressData.filter(userData => userData.userId === user.id);
  }, [userProgressData, user]);

  // Function to navigate to guide
  const navigateToGuide = (guideId: number) => {
    const guide = allGuides?.find(g => g.id === guideId);
    if (guide?.slug) {
      setLocation(`/guide/${guide.slug}`);
    }
  };

  // Calculate user-specific stats
  const userStats = useMemo(() => {
    if (!myProgressData.length) return { avgCompletion: 0, completedGuides: 0 };
    
    const totalProgress = myProgressData.reduce((sum, userData) => {
      return sum + userData.guides.reduce((guideSum: number, guide: any) => guideSum + guide.progress, 0);
    }, 0);
    
    const totalGuides = myProgressData.reduce((sum, userData) => sum + userData.guides.length, 0);
    const completedGuides = myProgressData.reduce((sum, userData) => {
      return sum + userData.guides.filter((guide: any) => guide.progress === 100).length;
    }, 0);
    
    return {
      avgCompletion: totalGuides > 0 ? Math.round(totalProgress / totalGuides) : 0,
      completedGuides
    };
  }, [myProgressData]);

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in to view your progress</h2>
          <p className="text-muted-foreground">You need to be authenticated to see your personal progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">My Progress</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Track your personal progress across all guides
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {/* Personal Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Avg. Completion</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.avgCompletion}%</div>
                <p className="text-xs text-muted-foreground">
                  {myProgressData.length > 0 ? 'Your average progress' : 'No progress yet'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Completed Guides</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats.completedGuides}</div>
                <p className="text-xs text-muted-foreground">
                  {userStats.completedGuides > 0 ? 'Guides completed' : 'No completed guides yet'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Progress Details */}
          <Card>
            <CardHeader>
              <CardTitle>My Progress Details</CardTitle>
            </CardHeader>
            <CardContent>
              {detailedLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : myProgressData.length > 0 ? (
                <div className="space-y-4">
                  {myProgressData.map((userData) => (
                    <div key={userData.userId} className="space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-foreground">{userData.userName}</h4>
                          <p className="text-sm text-muted-foreground">{userData.email}</p>
                        </div>
                        <Badge variant="outline">
                          {userData.guides.length} guide{userData.guides.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      {userData.guides.map((guide: any) => (
                        <div 
                          key={guide.guideId} 
                          className="bg-muted rounded-md p-3 cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => navigateToGuide(guide.guideId)}
                          data-testid={`guide-card-${guide.guideId}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm hover:text-primary transition-colors">
                              {guide.guideName}
                            </span>
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
                  <h3 className="text-lg font-medium text-foreground mb-2">No progress data yet</h3>
                  <p className="text-muted-foreground">
                    Start working on a guide to see your progress here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}