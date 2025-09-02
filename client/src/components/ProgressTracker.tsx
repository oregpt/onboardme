import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlowBox, Step, UserProgress } from "@shared/schema";
import { CheckCircle, Circle } from "lucide-react";

interface ProgressTrackerProps {
  flowBoxes: FlowBox[];
  steps: Record<number, Step[]>;
  userProgress?: UserProgress | null;
  onStepComplete: (stepId: number) => void;
  onFlowBoxComplete: (flowBoxId: number) => void;
  onStepClick?: (stepId: number, flowBoxId: number) => void;
  onFlowBoxClick?: (flowBoxId: number) => void;
}

export function ProgressTracker({ flowBoxes, steps, userProgress, onStepComplete, onFlowBoxComplete, onStepClick, onFlowBoxClick }: ProgressTrackerProps) {
  const totalSteps = Object.values(steps).flat().length;
  const completedSteps = (userProgress?.completedSteps as number[])?.length || 0;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const completedStepIds = (userProgress?.completedSteps as number[]) || [];
  const completedFlowBoxIds = (userProgress?.completedFlowBoxes as number[]) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Progress</span>
          <Badge variant="outline" data-testid="progress-badge">
            {completedSteps}/{totalSteps}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium" data-testid="progress-percentage">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        <div className="space-y-3">
          {flowBoxes.map((flowBox) => {
            const boxSteps = steps[flowBox.id] || [];
            const completedBoxSteps = boxSteps.filter(step => 
              completedStepIds.includes(step.id)
            ).length;
            const isFlowBoxCompleted = completedFlowBoxIds.includes(flowBox.id);

            return (
              <div key={flowBox.id} className="border rounded-lg p-3" data-testid={`flowbox-progress-${flowBox.id}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => onFlowBoxComplete(flowBox.id)}
                    className="flex-shrink-0 transition-colors duration-200"
                    data-testid={`button-progress-flowbox-${flowBox.id}`}
                    title="Mark flow box as complete/incomplete"
                  >
                    {isFlowBoxCompleted ? (
                      <CheckCircle className="h-5 w-5 text-primary hover:text-primary/80" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>
                  <button 
                    className="flex-1 text-left hover:bg-accent/50 rounded px-2 py-1 transition-colors duration-200"
                    onClick={() => onFlowBoxClick?.(flowBox.id)}
                    title="Navigate to this flow box"
                  >
                    <h4 className="font-medium text-sm">{flowBox.title}</h4>
                  </button>
                  <Badge variant="outline" className="text-xs">
                    {completedBoxSteps}/{boxSteps.length}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {boxSteps.map((step) => {
                    const isStepCompleted = completedStepIds.includes(step.id);
                    
                    return (
                      <div 
                        key={step.id} 
                        className="flex items-center space-x-2 ml-7"
                        data-testid={`step-progress-${step.id}`}
                      >
                        <button
                          onClick={() => onStepComplete(step.id)}
                          className="flex-shrink-0"
                          data-testid={`button-progress-step-${step.id}`}
                          title="Mark step as complete/incomplete"
                        >
                          {isStepCompleted ? (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <button
                          className="text-xs flex-1 text-left hover:bg-accent/50 rounded px-2 py-1 transition-colors duration-200"
                          onClick={() => onStepClick?.(step.id, flowBox.id)}
                          title="Navigate to this step"
                        >
                          <span className={isStepCompleted ? "line-through text-muted-foreground" : "text-foreground"}>
                            {step.title}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {totalSteps === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No steps available yet. Create some flow boxes and steps to track progress.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
