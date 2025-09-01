import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Step } from "@shared/schema";
import { X, Bold, Italic, Code, Link, Save } from "lucide-react";

interface StepEditorProps {
  step: Step;
  selectedPersona: string;
  onClose: () => void;
}

export function StepEditor({ step, selectedPersona, onClose }: StepEditorProps) {
  const { toast } = useToast();
  const [stepData, setStepData] = useState({
    title: step.title,
    content: step.content || "",
    description: "",
  });

  useEffect(() => {
    setStepData({
      title: step.title,
      content: step.content || "",
      description: "",
    });
  }, [step]);

  const updateStepMutation = useMutation({
    mutationFn: async (updates: Partial<Step>) => {
      return await apiRequest("PUT", `/api/steps/${step.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      toast({
        title: "Success",
        description: "Step updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update step",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateStepMutation.mutate({
      title: stepData.title,
      content: stepData.content,
    });
  };

  const insertTextAtCursor = (textarea: HTMLTextAreaElement, text: string) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = stepData.content.substring(0, start) + text + stepData.content.substring(end);
    setStepData(prev => ({ ...prev, content: newContent }));
    
    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  const handleFormatting = (format: string, event: React.MouseEvent) => {
    event.preventDefault();
    const textarea = document.getElementById("step-content") as HTMLTextAreaElement;
    
    switch (format) {
      case "bold":
        insertTextAtCursor(textarea, "**bold text**");
        break;
      case "italic":
        insertTextAtCursor(textarea, "*italic text*");
        break;
      case "code":
        insertTextAtCursor(textarea, "`code`");
        break;
      case "link":
        insertTextAtCursor(textarea, "[link text](https://example.com)");
        break;
    }
  };

  return (
    <div className="w-96 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Step Editor</h3>
          <p className="text-sm text-muted-foreground">Edit step content and attachments</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-step-editor">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Step Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="step-title" className="text-sm font-medium text-foreground mb-2 block">
              Step Title
            </Label>
            <Input
              id="step-title"
              value={stepData.title}
              onChange={(e) => setStepData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter step title..."
              data-testid="input-step-title"
            />
          </div>

          {/* Content Editor */}
          <div>
            <Label htmlFor="step-content" className="text-sm font-medium text-foreground mb-2 block">
              Content
            </Label>
            <div className="border border-input rounded-md">
              <div className="flex items-center border-b border-border px-3 py-2 bg-muted">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => handleFormatting("bold", e)}
                  data-testid="button-format-bold"
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => handleFormatting("italic", e)}
                  data-testid="button-format-italic"
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => handleFormatting("code", e)}
                  data-testid="button-format-code"
                >
                  <Code className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => handleFormatting("link", e)}
                  data-testid="button-format-link"
                >
                  <Link className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                id="step-content"
                value={stepData.content}
                onChange={(e) => setStepData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter markdown content..."
                className="border-0 focus-visible:ring-0 font-mono text-sm resize-none h-32"
                data-testid="textarea-step-content"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use markdown syntax for formatting
            </p>
          </div>

          {/* Persona Variations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Persona Variations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Content variations for different personas will be available in a future update.
              </p>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                File attachments will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button 
          onClick={handleSave}
          disabled={updateStepMutation.isPending}
          className="w-full"
          data-testid="button-save-step"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateStepMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
