import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FlowBox, Step } from "@shared/schema";
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  MoreHorizontal, 
  CheckCircle, 
  Circle,
  Edit,
  Trash2,
  PlusCircle,
  AlignJustify,
  Maximize
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FlowEditorProps {
  guideId: number;
  flowBoxes: FlowBox[];
  selectedPersona: string;
  onStepSelect: (step: Step | null) => void;
}

export function FlowEditor({ guideId, flowBoxes, selectedPersona, onStepSelect }: FlowEditorProps) {
  const { toast } = useToast();
  const [editingBox, setEditingBox] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // Fetch steps for each flow box
  const { data: allSteps } = useQuery<Step[]>({
    queryKey: ["/api/guides", guideId, "steps"],
    enabled: !!guideId,
  });

  const createFlowBoxMutation = useMutation({
    mutationFn: async () => {
      const position = Math.max(0, ...flowBoxes.map(fb => fb.position)) + 1;
      return await apiRequest("POST", `/api/guides/${guideId}/flowboxes`, {
        title: `Flow Box ${position}`,
        description: "New flow box",
        position,
        isVisible: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guideId, "flowboxes"] });
      toast({
        title: "Success",
        description: "Flow box created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create flow box",
        variant: "destructive",
      });
    },
  });

  const updateFlowBoxMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<FlowBox> }) => {
      return await apiRequest("PUT", `/api/flowboxes/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guideId, "flowboxes"] });
    },
  });

  const deleteFlowBoxMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/flowboxes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guideId, "flowboxes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guideId, "steps"] });
      toast({
        title: "Success",
        description: "Flow box deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete flow box",
        variant: "destructive",
      });
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async (flowBoxId: number) => {
      const existingSteps = allSteps?.filter(s => s.flowBoxId === flowBoxId) || [];
      const position = Math.max(0, ...existingSteps.map(s => s.position)) + 1;
      return await apiRequest("POST", `/api/flowboxes/${flowBoxId}/steps`, {
        title: `Step ${position}`,
        content: "Enter step content here...",
        position,
        isVisible: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guideId, "steps"] });
      toast({
        title: "Success",
        description: "Step created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create step",
        variant: "destructive",
      });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/steps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides", guideId, "steps"] });
      toast({
        title: "Success",
        description: "Step deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete step",
        variant: "destructive",
      });
    },
  });

  const toggleBoxVisibility = (id: number, currentVisibility: boolean) => {
    updateFlowBoxMutation.mutate({
      id,
      updates: { isVisible: !currentVisibility }
    });
  };

  const handleDeleteFlowBox = (id: number) => {
    if (confirm("Are you sure you want to delete this flow box and all its steps?")) {
      deleteFlowBoxMutation.mutate(id);
    }
  };

  const handleDeleteStep = (id: number) => {
    if (confirm("Are you sure you want to delete this step?")) {
      deleteStepMutation.mutate(id);
    }
  };

  const startEditing = (flowBox: FlowBox) => {
    setEditingBox(flowBox.id);
    setEditingTitle(flowBox.title);
    setEditingDescription(flowBox.description || "");
  };

  const cancelEditing = () => {
    setEditingBox(null);
    setEditingTitle("");
    setEditingDescription("");
  };

  const saveEdit = (id: number) => {
    updateFlowBoxMutation.mutate({
      id,
      updates: { 
        title: editingTitle.trim() || "Untitled Flow Box",
        description: editingDescription.trim()
      }
    });
    cancelEditing();
  };

  // Group steps by flow box
  const stepsByFlowBox = allSteps?.reduce((acc, step) => {
    if (!acc[step.flowBoxId]) {
      acc[step.flowBoxId] = [];
    }
    acc[step.flowBoxId].push(step);
    return acc;
  }, {} as Record<number, Step[]>) || {};

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Guide Flow</h3>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => createFlowBoxMutation.mutate()}
            disabled={createFlowBoxMutation.isPending}
            data-testid="button-add-flowbox"
          >
            <PlusCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <AlignJustify className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Maximize className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {flowBoxes.map((flowBox, index) => {
          const boxSteps = stepsByFlowBox[flowBox.id] || [];
          
          return (
            <div 
              key={flowBox.id} 
              className="flow-node bg-accent border border-border rounded-lg p-6"
              data-testid={`flowbox-${flowBox.id}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="drag-handle p-1 rounded hover:bg-muted cursor-grab">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    flowBox.isVisible 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    {editingBox === flowBox.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          placeholder="Flow box title"
                          className="font-semibold"
                          data-testid={`input-flowbox-title-${flowBox.id}`}
                        />
                        <Textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          placeholder="Flow box description"
                          className="text-sm resize-none"
                          rows={2}
                          data-testid={`textarea-flowbox-description-${flowBox.id}`}
                        />
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(flowBox.id)}
                            data-testid={`button-save-flowbox-${flowBox.id}`}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            data-testid={`button-cancel-flowbox-${flowBox.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-semibold text-foreground">{flowBox.title}</h4>
                        <p className="text-sm text-muted-foreground">{flowBox.description}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{boxSteps.length} steps</Badge>
                  <div className="w-4 h-4 bg-ring rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-flowbox-menu-${flowBox.id}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEditing(flowBox)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => toggleBoxVisibility(flowBox.id, flowBox.isVisible)}
                      >
                        {flowBox.isVisible ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Show
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteFlowBox(flowBox.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Steps within Flow Box */}
              <div className="ml-11 space-y-3">
                {boxSteps.map((step, stepIndex) => (
                  <div 
                    key={step.id} 
                    className="step-item flex items-start space-x-3 group"
                    data-testid={`step-${step.id}`}
                  >
                    <div className="w-6 h-6 border-2 border-border rounded-full flex items-center justify-center mt-1">
                      <Circle className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-foreground">{step.title}</h5>
                      {step.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {step.content}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-2">
                        {step.attachments && (step.attachments as any[]).length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {(step.attachments as any[]).length} attachments
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onStepSelect(step)}
                        data-testid={`button-edit-step-${step.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteStep(step.id)}
                        data-testid={`button-delete-step-${step.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Add Step Button */}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => createStepMutation.mutate(flowBox.id)}
                  disabled={createStepMutation.isPending}
                  className="ml-9 text-muted-foreground hover:text-foreground"
                  data-testid={`button-add-step-${flowBox.id}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add Flow Box Button */}
        <div className="flex justify-center">
          <Button 
            variant="outline"
            onClick={() => createFlowBoxMutation.mutate()}
            disabled={createFlowBoxMutation.isPending}
            className="border-dashed border-2 py-8 px-8 hover:border-primary hover:bg-primary/5"
            data-testid="button-add-flowbox-bottom"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Flow Box
          </Button>
        </div>
      </div>
    </div>
  );
}
