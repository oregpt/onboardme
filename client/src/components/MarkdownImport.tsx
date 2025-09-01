import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Guide {
  id: number;
  title: string;
  description: string;
  projectId: number;
}

interface ParsedFlowBox {
  title: string;
  description: string;
  steps: ParsedStep[];
}

interface ParsedStep {
  title: string;
  content: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  flowBoxesCreated?: number;
  stepsCreated?: number;
  details?: any;
}

export default function MarkdownImport() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFlowBox[] | null>(null);

  // Fetch all guides for selection
  const { data: guides, isLoading: guidesLoading } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async ({ guideId, flowBoxes }: { guideId: number; flowBoxes: ParsedFlowBox[] }) => {
      return await apiRequest("POST", "/api/guides/import-markdown", { guideId, flowBoxes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flow-boxes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/steps"] });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        setSelectedFile(file);
        setImportResult(null);
        setParsedData(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a Markdown (.md) file",
          variant: "destructive"
        });
      }
    }
  };

  const parseMarkdownContent = (content: string): ParsedFlowBox[] => {
    const flowBoxes: ParsedFlowBox[] = [];
    const lines = content.split('\n');
    
    let currentFlowBox: ParsedFlowBox | null = null;
    let currentStep: ParsedStep | null = null;
    let contentLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Flow box title (## Flow Name)
      if (line.startsWith('## ')) {
        // Save previous step if exists
        if (currentStep && currentFlowBox) {
          currentStep.content = contentLines.join('\n').trim();
          currentFlowBox.steps.push(currentStep);
        }
        
        // Save previous flow box if exists
        if (currentFlowBox) {
          flowBoxes.push(currentFlowBox);
        }
        
        // Start new flow box
        const title = line.substring(3).trim();
        currentFlowBox = {
          title,
          description: '', // Will be filled from next line if it's italic
          steps: []
        };
        
        // Check if next line is the description (italic text)
        if (i + 1 < lines.length && lines[i + 1].trim().startsWith('*') && lines[i + 1].trim().endsWith('*')) {
          currentFlowBox.description = lines[i + 1].trim().slice(1, -1);
          i++; // Skip description line
        }
        
        currentStep = null;
        contentLines = [];
      }
      // Step title (### Step Name)
      else if (line.startsWith('### ')) {
        // Save previous step if exists
        if (currentStep && currentFlowBox) {
          currentStep.content = contentLines.join('\n').trim();
          currentFlowBox.steps.push(currentStep);
        }
        
        // Start new step
        const title = line.substring(4).trim();
        currentStep = {
          title,
          content: ''
        };
        contentLines = [];
      }
      // Content lines
      else if (currentStep && line.length > 0) {
        contentLines.push(lines[i]); // Keep original formatting
      }
    }
    
    // Save final step and flow box
    if (currentStep && currentFlowBox) {
      currentStep.content = contentLines.join('\n').trim();
      currentFlowBox.steps.push(currentStep);
    }
    if (currentFlowBox) {
      flowBoxes.push(currentFlowBox);
    }
    
    return flowBoxes;
  };

  const handlePreview = async () => {
    if (!selectedFile) return;

    setProgress(25);
    try {
      // Read file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(selectedFile);
      });

      setProgress(50);

      // Parse markdown content
      const parsed = parseMarkdownContent(fileContent);
      setParsedData(parsed);
      setProgress(100);

      toast({
        title: "Preview ready",
        description: `Found ${parsed.length} flow boxes with ${parsed.reduce((sum, fb) => sum + fb.steps.length, 0)} steps`,
      });

    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setProgress(0);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedGuideId || !parsedData) return;

    setImporting(true);
    setProgress(0);

    try {
      setProgress(25);

      const guideId = parseInt(selectedGuideId);
      const response = await importMutation.mutateAsync({ guideId, flowBoxes: parsedData });
      const result = await response.json();

      setProgress(100);
      setImportResult(result as ImportResult);

      toast({
        title: "Import completed",
        description: `Successfully imported ${parsedData.length} flow boxes`,
      });

    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const renderPreview = () => {
    if (!parsedData) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Preview ({parsedData.length} Flow Boxes)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {parsedData.map((flowBox, fbIndex) => (
            <div key={fbIndex} className="border rounded-lg p-3">
              <h4 className="font-semibold text-sm">{flowBox.title}</h4>
              {flowBox.description && (
                <p className="text-xs text-muted-foreground mb-2">{flowBox.description}</p>
              )}
              <div className="space-y-1">
                {flowBox.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs px-2 py-0">
                      Step {stepIndex + 1}
                    </Badge>
                    <span className="truncate">{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderResultSummary = () => {
    if (!importResult) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            Import {importResult.success ? 'Successful' : 'Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{importResult.message}</p>
          {importResult.success && (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {importResult.flowBoxesCreated && (
                <p>• Flow boxes created: {importResult.flowBoxesCreated}</p>
              )}
              {importResult.stepsCreated && (
                <p>• Steps created: {importResult.stepsCreated}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Import Markdown Guide</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Guide and Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Guide Selection */}
          <div>
            <Label htmlFor="guide-select">Target Guide</Label>
            <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
              <SelectTrigger data-testid="select-guide">
                <SelectValue placeholder="Select a guide to import into" />
              </SelectTrigger>
              <SelectContent>
                {guidesLoading ? (
                  <SelectItem value="loading" disabled>Loading guides...</SelectItem>
                ) : guides && guides.length > 0 ? (
                  guides.map((guide) => (
                    <SelectItem key={guide.id} value={guide.id.toString()}>
                      {guide.title}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-guides" disabled>No guides available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* File Upload */}
          <div>
            <Label htmlFor="markdown-file">Markdown File</Label>
            <input
              type="file"
              accept=".md,.markdown"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90
                cursor-pointer"
              data-testid="input-markdown-file"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Preview Button */}
          <Button 
            onClick={handlePreview}
            disabled={!selectedFile}
            variant="outline"
            className="w-full"
            data-testid="button-preview-markdown"
          >
            <FileText className="w-4 h-4 mr-2" />
            Preview Content
          </Button>

          {/* Progress */}
          {(importing || progress > 0) && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {importing ? "Importing data..." : "Processing file..."}
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Import Button */}
          <Button 
            onClick={handleImport}
            disabled={!selectedFile || !selectedGuideId || !parsedData || importing}
            className="w-full"
            variant={selectedFile && selectedGuideId && parsedData ? "default" : "secondary"}
            data-testid="button-import-markdown"
          >
            {importing ? "Importing..." : "Import to Guide"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {renderPreview()}

      {/* Results */}
      {renderResultSummary()}
    </div>
  );
}