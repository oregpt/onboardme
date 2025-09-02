import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Guide } from "@shared/schema";
import { Users, TrendingUp, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/components/AppLayout";
import { useMemo } from "react";

export default function UserProgress() {
  const { selectedProjectId } = useProjectContext();
  
  const { data: allGuides, isLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  // Fetch per-guide metrics data
  const { data: guideMetrics = [], isLoading: metricsLoading } = useQuery<any[]>({
    queryKey: ["/api/metrics/guides"],
    staleTime: 0,
    cacheTime: 0,
  });

  // Filter guides by selected project
  const guides = useMemo(() => {
    if (!allGuides) return [];
    if (!selectedProjectId) return allGuides;
    return allGuides.filter(guide => guide.projectId === selectedProjectId);
  }, [allGuides, selectedProjectId]);

  // Filter metrics by selected project
  const filteredMetrics = useMemo(() => {
    if (!guideMetrics || !selectedProjectId) return guideMetrics;
    const guideIds = guides.map(g => g.id);
    return guideMetrics.filter(metric => guideIds.includes(metric.guideId));
  }, [guideMetrics, guides, selectedProjectId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Metrics</h2>
              <p className="text-sm text-muted-foreground mt-1">
                View analytics and performance metrics for each guide
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          {/* Per-Guide Metrics Cards */}
          <div className="space-y-6">
            {metricsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredMetrics.length > 0 ? (
              filteredMetrics.map((metric) => (
                <Card key={metric.guideId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{metric.guideName}</CardTitle>
                        {metric.guideDescription && (
                          <p className="text-sm text-muted-foreground mt-1">{metric.guideDescription}</p>
                        )}
                      </div>
                      <Badge variant="outline">{metric.totalSteps} steps</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Users className="h-4 w-4 text-muted-foreground mr-1" />
                          <span className="text-sm font-medium">Total Users</span>
                        </div>
                        <div className="text-2xl font-bold">{metric.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Active users</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground mr-1" />
                          <span className="text-sm font-medium">Avg Completion</span>
                        </div>
                        <div className="text-2xl font-bold">{metric.avgCompletion}%</div>
                        <p className="text-xs text-muted-foreground">Average progress</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground mr-1" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                        <div className="text-2xl font-bold">{metric.totalCompleted}</div>
                        <p className="text-xs text-muted-foreground">Fully completed</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-sm font-medium">Completion Rate</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {metric.totalUsers > 0 ? Math.round((metric.totalCompleted / metric.totalUsers) * 100) : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Users who finished</p>
                      </div>
                    </div>
                    
                    {metric.totalUsers > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Progress</span>
                          <span className="text-sm text-muted-foreground">{metric.avgCompletion}%</span>
                        </div>
                        <Progress value={metric.avgCompletion} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16">
                <h3 className="text-lg font-medium text-foreground mb-2">No metrics data available</h3>
                <p className="text-muted-foreground">
                  Metrics will appear here once users start engaging with your guides
                </p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}