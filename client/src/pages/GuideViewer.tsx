import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressTracker } from "@/components/ProgressTracker";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Guide, FlowBox, Step, UserProgress } from "@shared/schema";
import { CheckCircle, Circle, ArrowLeft, BookOpen, User, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";

export default function GuideViewer() {
  const [, params] = useRoute("/guide/:slug");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const slug = params?.slug;

  // Fetch guide by slug
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: ["/api/guides/slug", slug],
    enabled: !!slug,
  });

  // Fetch flow boxes
  const { data: flowBoxes, isLoading: flowBoxesLoading } = useQuery<FlowBox[]>({
    queryKey: ["/api/guides", guide?.id, "flowboxes"],
    enabled: !!guide?.id,
  });

  // Fetch steps for each flow box
  const { data: allSteps } = useQuery<Step[]>({
    queryKey: ["/api/guides", guide?.id, "steps"],
    enabled: !!guide?.id,
  });

  // Fetch user progress if authenticated
  const { data: userProgress } = useQuery<UserProgress>({
    queryKey: ["/api/guides", guide?.id, "progress"],
    enabled: !!guide?.id && isAuthenticated,
  });

  const markStepCompleteMutation = useMutation({
    mutationFn: async (stepId: number) => {
      await apiRequest("POST", `/api/guides/${guide?.id}/progress/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guide?.id, "progress"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  const markFlowBoxCompleteMutation = useMutation({
    mutationFn: async (flowBoxId: number) => {
      await apiRequest("POST", `/api/guides/${guide?.id}/progress/flowboxes/${flowBoxId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guide?.id, "progress"] });
    },
  });

  if (guideLoading || flowBoxesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Guide Not Found</h1>
            <p className="text-muted-foreground">
              The guide you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSteps = allSteps?.length || 0;
  const completedSteps = (userProgress?.completedSteps as number[])?.length || 0;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const groupedSteps = allSteps?.reduce((acc, step) => {
    if (!acc[step.flowBoxId]) {
      acc[step.flowBoxId] = [];
    }
    acc[step.flowBoxId].push(step);
    return acc;
  }, {} as Record<number, Step[]>) || {};

  const handleStepComplete = (stepId: number) => {
    if (isAuthenticated) {
      markStepCompleteMutation.mutate(stepId);
    } else {
      toast({
        title: "Sign in required",
        description: "Please sign in to track your progress",
        variant: "default",
      });
    }
  };

  const handleFlowComplete = (flowBoxId: number) => {
    if (isAuthenticated) {
      markFlowBoxCompleteMutation.mutate(flowBoxId);
      toast({
        title: "Flow marked complete",
        description: "All steps in this flow have been marked as complete",
        variant: "default",
      });
    } else {
      toast({
        title: "Sign in required",
        description: "Please sign in to track your progress",
        variant: "default",
      });
    }
  };

  const downloadAttachment = (attachment: any) => {
    try {
      // Convert base64 data to blob
      const byteCharacters = atob(attachment.data.split(',')[1] || attachment.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: attachment.type || 'application/octet-stream' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name || 'attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${attachment.name}`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the attachment",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{guide.title}</h1>
                <p className="text-sm text-muted-foreground">{guide.description}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {user?.firstName || user?.email}
                </span>
              </div>
            ) : (
              <Button 
                size="sm" 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Guide Overview */}
            {guide.globalInformation && (
              <Card>
                <CardHeader>
                  <CardTitle>Guide Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {guide.globalInformation}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Flow Boxes */}
            <div className="space-y-6">
              {flowBoxes?.map((flowBox, index) => {
                const boxSteps = groupedSteps[flowBox.id] || [];
                const completedBoxSteps = boxSteps.filter(step => 
                  (userProgress?.completedSteps as number[])?.includes(step.id)
                ).length;
                const isBoxCompleted = (userProgress?.completedFlowBoxes as number[])?.includes(flowBox.id);

                return (
                  <Card key={flowBox.id} className="flow-node">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            isBoxCompleted 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-secondary text-secondary-foreground"
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{flowBox.title}</CardTitle>
                            {flowBox.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {flowBox.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {completedBoxSteps}/{boxSteps.length} steps
                          </Badge>
                          {!isBoxCompleted && isAuthenticated && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFlowComplete(flowBox.id)}
                              disabled={markFlowBoxCompleteMutation.isPending}
                              data-testid={`button-complete-flow-${flowBox.id}`}
                            >
                              {markFlowBoxCompleteMutation.isPending ? "Marking..." : "Mark Flow Complete"}
                            </Button>
                          )}
                          {isBoxCompleted && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {boxSteps.map((step) => {
                          const isStepCompleted = (userProgress?.completedSteps as number[])?.includes(step.id);
                          
                          return (
                            <div 
                              key={step.id}
                              className="flex items-start space-x-3 p-4 border border-border rounded-lg"
                              data-testid={`step-${step.id}`}
                            >
                              <button
                                onClick={() => handleStepComplete(step.id)}
                                className="mt-1"
                                disabled={!isAuthenticated}
                                data-testid={`button-complete-step-${step.id}`}
                              >
                                {isStepCompleted ? (
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                ) : (
                                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                                )}
                              </button>
                              
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{step.title}</h4>
                                {step.content && (
                                  <div className="mt-2 prose prose-sm max-w-none">
                                    <ReactMarkdown>
                                      {step.content}
                                    </ReactMarkdown>
                                  </div>
                                )}
                                
                                {step.attachments && (step.attachments as any[]).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {(step.attachments as any[]).map((attachment, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadAttachment(attachment)}
                                        className="h-6 px-2 text-xs flex items-center gap-1"
                                        data-testid={`button-download-attachment-${idx}`}
                                      >
                                        <Download className="w-3 h-3" />
                                        {attachment.name || attachment.type}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Progress Sidebar */}
          <div className="space-y-6">
            {isAuthenticated && (
              <ProgressTracker
                flowBoxes={flowBoxes || []}
                steps={groupedSteps}
                userProgress={userProgress}
                onStepComplete={handleStepComplete}
              />
            )}

            {/* Guide Info */}
            <Card>
              <CardHeader>
                <CardTitle>Guide Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-foreground">Total Steps:</span>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="total-steps">
                    {totalSteps}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Flow Boxes:</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {flowBoxes?.length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Created:</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {guide.createdAt ? new Date(guide.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
