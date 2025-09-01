import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/Sidebar";
import { FlowEditor } from "@/components/FlowEditor";
import { StepEditor } from "@/components/StepEditor";
import { CSVImport } from "@/components/CSVImport";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Guide, FlowBox, Step } from "@shared/schema";
import { Save, Eye, Settings, ChevronRight, Upload, X, Paperclip, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function GuideEditor() {
  const [, params] = useRoute("/editor/:id?");
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string>("Developer");
  const [guideData, setGuideData] = useState({
    title: "",
    description: "",
    slug: "",
    globalInformation: "",
    personas: ["Developer", "Designer", "Product Manager", "Customer Success", "Finance", "CxO", "Consultant", "Other", "General"],
    resourceLinks: [] as Array<{title: string, url: string}>,
    resourceAttachments: [] as Array<{id: number, name: string, type: string, size: number, data: string, category: string}>,
    isActive: true,
  });

  const isEditing = !!params?.id;
  const guideId = params?.id ? parseInt(params.id) : undefined;

  // Fetch existing guide if editing
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: ["/api/guides", guideId],
    enabled: isEditing && !!guideId,
  });

  // Fetch flow boxes for the guide
  const { data: flowBoxes, isLoading: flowBoxesLoading } = useQuery<FlowBox[]>({
    queryKey: ["/api/guides", guideId, "flowboxes"],
    enabled: !!guideId,
  });

  // Update form when guide data loads
  useEffect(() => {
    if (guide) {
      setGuideData({
        title: guide.title,
        description: guide.description || "",
        slug: guide.slug,
        globalInformation: guide.globalInformation || "",
        personas: (guide.personas as string[]) || ["Developer", "Designer", "Product Manager", "Customer Success", "Finance", "CxO", "Consultant", "Other", "General"],
        resourceLinks: (guide as any).resourceLinks || [],
        resourceAttachments: (guide as any).resourceAttachments || [],
        isActive: guide.isActive,
      });
    }
  }, [guide]);

  // Generate slug from title
  useEffect(() => {
    if (!isEditing && guideData.title) {
      const slug = guideData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setGuideData(prev => ({ ...prev, slug }));
    }
  }, [guideData.title, isEditing]);

  // Helper function for file size formatting
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection for resource attachments
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          category: 'general', // Default category
        };
        
        setGuideData(prev => ({
          ...prev,
          resourceAttachments: [...prev.resourceAttachments, newAttachment]
        }));
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
  };

  // Remove attachment
  const removeAttachment = (id: number) => {
    setGuideData(prev => ({
      ...prev,
      resourceAttachments: prev.resourceAttachments.filter(att => att.id !== id)
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing && guideId) {
        return await apiRequest("PUT", `/api/guides/${guideId}`, data);
      } else {
        return await apiRequest("POST", "/api/guides", data);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: isEditing ? "Guide updated successfully" : "Guide created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      if (!isEditing) {
        window.location.href = `/editor/${data.id}`;
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save guide",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!guideData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a guide title",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(guideData);
  };

  const handlePreview = () => {
    if (guideData.slug) {
      window.open(`/guide/${guideData.slug}`, '_blank');
    }
  };

  if (guideLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {isEditing ? "Edit Guide" : "Create Guide"}
              </h2>
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground mt-1">
                <Link href="/guides" className="hover:text-foreground transition-colors">
                  <span>Guides</span>
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>{guideData.title || "New Guide"}</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">Flow Editor</span>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={handlePreview}
                disabled={!guideData.slug}
                data-testid="button-preview"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Area */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Guide Information Panel */}
            <div className="mb-6 bg-card rounded-lg border border-border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Guide Title
                    </label>
                    <Input
                      value={guideData.title}
                      onChange={(e) => setGuideData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter guide title..."
                      className="w-full"
                      data-testid="input-guide-title"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Description
                    </label>
                    <Textarea
                      value={guideData.description}
                      onChange={(e) => setGuideData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this guide..."
                      className="h-20 w-full"
                      data-testid="input-guide-description"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Slug
                    </label>
                    <Input
                      value={guideData.slug}
                      onChange={(e) => setGuideData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="guide-url-slug"
                      data-testid="input-guide-slug"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be the URL: /guide/{guideData.slug}
                    </p>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="ml-4">
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Persona Selector */}
              <div className="mb-4">
                <label className="text-sm font-medium text-foreground mb-2 block">Target Persona</label>
                <div className="flex space-x-2">
                  {guideData.personas.map((persona) => (
                    <button
                      key={persona}
                      onClick={() => setSelectedPersona(persona)}
                      className={`px-3 py-2 text-sm rounded-md transition-colors ${
                        selectedPersona === persona
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:bg-accent text-foreground"
                      }`}
                      data-testid={`button-persona-${persona.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {persona}
                    </button>
                  ))}
                </div>
              </div>

              {/* Global Information */}
              <div className="bg-muted rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Guide Overview</h4>
                <Textarea
                  value={guideData.globalInformation}
                  onChange={(e) => setGuideData(prev => ({ ...prev, globalInformation: e.target.value }))}
                  placeholder="Provide an overview of this guide and what users will learn..."
                  className="bg-background h-60"
                  data-testid="input-guide-overview"
                />
              </div>

              {/* Resource Links */}
              <div className="bg-muted rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Resource Links (Optional)</h4>
                <div className="space-y-2">
                  {guideData.resourceLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Link title"
                        value={link.title}
                        onChange={(e) => {
                          const newLinks = [...guideData.resourceLinks];
                          newLinks[index].title = e.target.value;
                          setGuideData(prev => ({ ...prev, resourceLinks: newLinks }));
                        }}
                        className="flex-1 bg-background"
                      />
                      <Input
                        placeholder="URL"
                        value={link.url}
                        onChange={(e) => {
                          const newLinks = [...guideData.resourceLinks];
                          newLinks[index].url = e.target.value;
                          setGuideData(prev => ({ ...prev, resourceLinks: newLinks }));
                        }}
                        className="flex-1 bg-background"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newLinks = guideData.resourceLinks.filter((_, i) => i !== index);
                          setGuideData(prev => ({ ...prev, resourceLinks: newLinks }));
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setGuideData(prev => ({ 
                      ...prev, 
                      resourceLinks: [...prev.resourceLinks, { title: "", url: "" }] 
                    }))}
                  >
                    + Add Resource Link
                  </Button>
                </div>
              </div>

              {/* Resource Attachments */}
              <div className="bg-muted rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Resource Attachments (Optional)</h4>
                
                {/* Upload Button */}
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="file"
                    id="resource-upload"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.zip,.xlsx,.pptx"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('resource-upload')?.click()}
                    data-testid="button-upload-resources"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    PDF, DOC, Images, Archives, etc.
                  </span>
                </div>

                {/* Attachment List */}
                {guideData.resourceAttachments.length > 0 ? (
                  <div className="space-y-2">
                    {guideData.resourceAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-2 border border-border rounded-md bg-background"
                        data-testid={`resource-attachment-${attachment.id}`}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.size)} • {attachment.type}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-remove-resource-${attachment.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No files uploaded yet. Upload helpful resources for this guide.
                  </p>
                )}
              </div>
            </div>

            {/* Flow Editor */}
            {guideId && (
              <FlowEditor
                guideId={guideId}
                flowBoxes={flowBoxes || []}
                selectedPersona={selectedPersona}
                onStepSelect={setSelectedStep}
              />
            )}
          </div>

          {/* Step Editor Sidebar */}
          {selectedStep && (
            <StepEditor
              step={selectedStep}
              selectedPersona={selectedPersona}
              onClose={() => setSelectedStep(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
