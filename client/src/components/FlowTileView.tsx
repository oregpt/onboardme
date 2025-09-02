import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ArrowRight, Clock, BookOpen } from "lucide-react";
import type { FlowBox, Step, UserProgress } from "@shared/schema";

interface FlowTileViewProps {
  flowBoxes: FlowBox[];
  groupedSteps: Record<number, Step[]>;
  userProgress?: UserProgress;
  onFlowClick: (flowBoxId: number) => void;
}

export default function FlowTileView({ 
  flowBoxes, 
  groupedSteps, 
  userProgress, 
  onFlowClick 
}: FlowTileViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Guide Overview</h2>
        <p className="text-muted-foreground">
          Choose a flow to get started. You can view detailed steps or get a quick overview.
        </p>
      </div>

      {/* Flow Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flowBoxes.map((flowBox, index) => {
          const boxSteps = groupedSteps[flowBox.id] || [];
          const completedBoxSteps = boxSteps.filter(step => 
            (userProgress?.completedSteps as number[])?.includes(step.id)
          ).length;
          const isBoxCompleted = (userProgress?.completedFlowBoxes as number[])?.includes(flowBox.id);
          const progressPercentage = boxSteps.length > 0 ? (completedBoxSteps / boxSteps.length) * 100 : 0;

          return (
            <Card 
              key={flowBox.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50 group"
              onClick={() => onFlowClick(flowBox.id)}
              data-testid={`flow-tile-${flowBox.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isBoxCompleted 
                        ? "bg-primary text-primary-foreground" 
                        : progressPercentage > 0
                        ? "bg-orange-200 text-orange-800"
                        : "bg-gray-300 text-gray-600"
                    }`}>
                      {isBoxCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {flowBox.title}
                      </CardTitle>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Description */}
                {flowBox.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {flowBox.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">Progress</span>
                    <span className="font-medium text-black">
                      {completedBoxSteps}/{boxSteps.length} steps
                    </span>
                  </div>
                  <Progress 
                    value={progressPercentage} 
                    className="h-2 bg-gray-100 [&>div]:bg-primary"
                  />
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Step Count */}
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {boxSteps.length} steps
                      </span>
                    </div>

                    {/* Time Estimate (placeholder for now) */}
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        ~{Math.max(5, boxSteps.length * 2)}m
                      </span>
                    </div>
                  </div>

                  {/* Completion Status */}
                  <Badge 
                    variant={isBoxCompleted ? "default" : progressPercentage > 0 ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {isBoxCompleted ? "Complete" : progressPercentage > 0 ? "In Progress" : "Not Started"}
                  </Badge>
                </div>

                {/* Critical Steps Indicator */}
                {boxSteps.some(step => step.isCritical) && (
                  <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-red-700">
                      Contains {boxSteps.filter(step => step.isCritical).length} critical step(s)
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {flowBoxes.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Flows</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {Object.values(groupedSteps).reduce((total, steps) => total + steps.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Steps</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {(userProgress?.completedFlowBoxes as number[])?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Completed Flows</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}