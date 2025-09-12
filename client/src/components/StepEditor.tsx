import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Step } from "@shared/schema";
import { X, Bold, Italic, Code, Link, Save, GripVertical, Upload, Paperclip } from "lucide-react";

interface StepEditorProps {
  step: Step;
  selectedPersona: string;
  onClose: () => void;
}

export function StepEditor({ step, selectedPersona, onClose }: StepEditorProps) {
  const { toast } = useToast();
  console.log("🚀 StepEditor component mounted for step:", step.id, step.title);
  
  const [stepData, setStepData] = useState({
    title: step.title,
    content: step.content || "",
    description: "",
    isCritical: step.isCritical || false,
    attachments: (step.attachments as any[]) || [],
  });
  const [editorWidth, setEditorWidth] = useState(384); // Starting at w-96 equivalent (24rem = 384px)
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStepData({
      title: step.title,
      content: step.content || "",
      description: "",
      isCritical: step.isCritical || false,
      attachments: (step.attachments as any[]) || [],
    });
  }, [step]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const rect = resizeRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      const minWidth = 320; // Minimum width
      const maxWidth = 800; // Maximum width
      
      setEditorWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: 'general' | 'faq' | 'other-help') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newAttachment = {
          id: Date.now() + Math.random(), // Simple ID generation
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target?.result as string, // Base64 data
          category, // Add category field
        };
        
        setStepData(prev => ({
          ...prev,
          attachments: [...prev.attachments, newAttachment]
        }));
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (attachmentId: number) => {
    setStepData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((att: any) => att.id !== attachmentId)
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const updateStepMutation = useMutation({
    mutationFn: async (updates: Partial<Step>) => {
      return await apiRequest("PUT", `/api/steps/${step.id}`, updates);
    },
    onSuccess: () => {
      // Invalidate specific queries to refresh the step data
      queryClient.invalidateQueries({ queryKey: ["/api/guides", step.flowBoxId] });
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
    console.log("🔥 handleSave called - Step ID:", step.id);
    console.log("🔥 Step data to save:", {
      title: stepData.title,
      content: stepData.content,
      isCritical: stepData.isCritical,
      attachments: stepData.attachments,
    });
    
    updateStepMutation.mutate({
      title: stepData.title,
      content: stepData.content,
      isCritical: stepData.isCritical,
      attachments: stepData.attachments,
    });
  };

  const applyFormatting = (textarea: HTMLTextAreaElement, beforeText: string, afterText: string, defaultText?: string) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = stepData.content.substring(start, end);
    
    // If text is selected, wrap it. If not, insert default text with markers
    const textToWrap = selectedText || defaultText || "";
    const newText = beforeText + textToWrap + afterText;
    
    const newContent = stepData.content.substring(0, start) + newText + stepData.content.substring(end);
    setStepData(prev => ({ ...prev, content: newContent }));
    
    // Set cursor position
    setTimeout(() => {
      if (selectedText) {
        // If we wrapped existing text, select the wrapped content
        textarea.selectionStart = start;
        textarea.selectionEnd = start + newText.length;
      } else {
        // If we inserted template text, select the default content for easy replacement
        const defaultTextStart = start + beforeText.length;
        const defaultTextEnd = defaultTextStart + textToWrap.length;
        textarea.selectionStart = defaultTextStart;
        textarea.selectionEnd = defaultTextEnd;
      }
      textarea.focus();
    }, 0);
  };

  const handleFormatting = (format: string, event: React.MouseEvent) => {
    event.preventDefault();
    const textarea = document.getElementById("step-content") as HTMLTextAreaElement;
    
    switch (format) {
      case "bold":
        applyFormatting(textarea, "**", "**", "bold text");
        break;
      case "italic":
        applyFormatting(textarea, "*", "*", "italic text");
        break;
      case "code":
        const hasSelection = textarea.selectionStart !== textarea.selectionEnd;
        if (hasSelection) {
          // If text is selected, wrap it in a code block
          applyFormatting(textarea, "```\n", "\n```", "");
        } else {
          // If no selection, insert a code block template
          applyFormatting(textarea, "```\n", "\n```", "// Your code here");
        }
        break;
      case "link":
        applyFormatting(textarea, "[", "](https://example.com)", "link text");
        break;
    }
  };

  return (
    <div 
      ref={resizeRef}
      className="bg-card border-l border-border flex flex-col relative"
      style={{ width: `${editorWidth}px` }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
          isResizing ? 'bg-primary' : ''
        }`}
        onMouseDown={handleResizeStart}
        style={{ marginLeft: '-2px' }}
      >
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground">
          <GripVertical className="w-3 h-3 rotate-90" />
        </div>
      </div>
      
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
              onKeyDown={(e) => {
                // Allow native browser shortcuts to work (Ctrl+Z, Ctrl+Y, etc.)
                if (e.ctrlKey || e.metaKey) {
                  e.stopPropagation();
                }
              }}
              placeholder="Enter step title..."
              data-testid="input-step-title"
            />
          </div>

          {/* Critical Flag */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="step-critical"
              checked={stepData.isCritical}
              onCheckedChange={(checked) => setStepData(prev => ({ ...prev, isCritical: !!checked }))}
              data-testid="checkbox-step-critical"
            />
            <Label htmlFor="step-critical" className="text-sm font-medium text-foreground">
              Mark as Critical Step
            </Label>
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
                onKeyDown={(e) => {
                  // Allow native browser shortcuts to work (Ctrl+Z, Ctrl+Y, etc.)
                  if (e.ctrlKey || e.metaKey) {
                    e.stopPropagation();
                  }
                }}
                placeholder="Enter markdown content..."
                className="border-0 focus-visible:ring-0 font-mono text-sm resize-none"
                style={{ height: `${Math.max(120, editorWidth / 3)}px` }}
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

          {/* General Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <span className="mr-2">📁</span>
                General Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* General Upload Button */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  id="general-upload"
                  multiple
                  onChange={(e) => handleFileSelect(e, 'general')}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('general-upload')?.click()}
                  data-testid="button-upload-general"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload General Files
                </Button>
                <span className="text-xs text-muted-foreground">
                  PDF, DOC, TXT, Images
                </span>
              </div>

              {/* General Attachment List */}
              {stepData.attachments.filter((att: any) => att.category === 'general').length > 0 && (
                <div className="space-y-2">
                  {stepData.attachments.filter((att: any) => att.category === 'general').map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 border border-border rounded-md bg-gray-50 dark:bg-gray-950/30"
                      data-testid={`general-attachment-${attachment.id}`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)} • General
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-general-${attachment.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {stepData.attachments.filter((att: any) => att.category === 'general').length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No general files added yet. Upload general documentation and resources.
                </p>
              )}
            </CardContent>
          </Card>

          {/* FAQ Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <span className="mr-2">📋</span>
                FAQ Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* FAQ Upload Button */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  id="faq-upload"
                  multiple
                  onChange={(e) => handleFileSelect(e, 'faq')}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('faq-upload')?.click()}
                  data-testid="button-upload-faq"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload FAQ Files
                </Button>
                <span className="text-xs text-muted-foreground">
                  PDF, DOC, TXT, Images
                </span>
              </div>

              {/* FAQ Attachment List */}
              {stepData.attachments.filter((att: any) => att.category === 'faq').length > 0 && (
                <div className="space-y-2">
                  {stepData.attachments.filter((att: any) => att.category === 'faq').map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 border border-border rounded-md bg-blue-50 dark:bg-blue-950/30"
                      data-testid={`faq-attachment-${attachment.id}`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)} • FAQ
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-faq-${attachment.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {stepData.attachments.filter((att: any) => att.category === 'faq').length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No FAQ files added yet. Upload files with frequently asked questions.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Other Help Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <span className="mr-2">🛠️</span>
                Other Help Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Other Help Upload Button */}
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  id="other-help-upload"
                  multiple
                  onChange={(e) => handleFileSelect(e, 'other-help')}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('other-help-upload')?.click()}
                  data-testid="button-upload-other-help"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Help Files
                </Button>
                <span className="text-xs text-muted-foreground">
                  PDF, DOC, TXT, Images
                </span>
              </div>

              {/* Other Help Attachment List */}
              {stepData.attachments.filter((att: any) => att.category === 'other-help').length > 0 && (
                <div className="space-y-2">
                  {stepData.attachments.filter((att: any) => att.category === 'other-help').map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 border border-border rounded-md bg-green-50 dark:bg-green-950/30"
                      data-testid={`other-help-attachment-${attachment.id}`}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {attachment.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)} • Other Help
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-other-help-${attachment.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {stepData.attachments.filter((att: any) => att.category === 'other-help').length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No other help files added yet. Upload additional support materials.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button 
          onClick={() => {
            console.log("💥 Save button clicked!");
            handleSave();
          }}
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
