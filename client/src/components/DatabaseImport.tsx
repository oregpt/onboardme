import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ImportResult {
  success: boolean;
  message: string;
  results: Record<string, { imported?: number; total?: number; skipped?: boolean; error?: string; reason?: string }>;
  importedAt: string;
}

export function DatabaseImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a JSON file",
          variant: "destructive"
        });
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setProgress(0);

    try {
      // Read file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(selectedFile);
      });

      setProgress(25);

      // Parse JSON
      const importData = JSON.parse(fileContent);
      setProgress(50);

      // Validate format
      if (!importData.metadata || !importData.data) {
        throw new Error("Invalid import file format. Expected metadata and data sections.");
      }

      setProgress(75);

      // Send to server
      const result = await apiRequest('/api/admin/import', {
        method: 'POST',
        body: JSON.stringify({ data: importData })
      }) as ImportResult;

      setProgress(100);
      setImportResult(result);

      toast({
        title: "Import completed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Import error:', error);
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

  const handleExport = async () => {
    setExporting(true);

    try {
      const exportData = await apiRequest('/api/admin/export') as any;

      // Create download link
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `database-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export completed",
        description: "Database export downloaded successfully"
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setExporting(false);
    }
  };

  const renderResultSummary = () => {
    if (!importResult) return null;

    const tableResults = Object.entries(importResult.results);
    const successful = tableResults.filter(([_, result]) => result.imported && result.imported > 0);
    const skipped = tableResults.filter(([_, result]) => result.skipped);
    const errors = tableResults.filter(([_, result]) => result.error);

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            Import Results
          </CardTitle>
          <CardDescription>
            Completed at {new Date(importResult.importedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {successful.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                Successfully Imported ({successful.length} tables)
              </h4>
              <div className="space-y-1">
                {successful.map(([table, result]) => (
                  <div key={table} className="text-sm text-muted-foreground">
                    <span className="font-medium">{table}:</span> {result.imported}/{result.total} records
                  </div>
                ))}
              </div>
            </div>
          )}

          {skipped.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                Skipped ({skipped.length} tables)
              </h4>
              <div className="space-y-1">
                {skipped.map(([table, result]) => (
                  <div key={table} className="text-sm text-muted-foreground">
                    <span className="font-medium">{table}:</span> {result.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Errors ({errors.length} tables)
              </h4>
              <div className="space-y-1">
                {errors.map(([table, result]) => (
                  <div key={table} className="text-sm text-muted-foreground">
                    <span className="font-medium">{table}:</span> {result.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Database
          </CardTitle>
          <CardDescription>
            Download a complete backup of all database tables as JSON
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleExport} 
            disabled={exporting}
            className="w-full"
            data-testid="button-export-database"
          >
            {exporting ? "Exporting..." : "Download Database Export"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Database
          </CardTitle>
          <CardDescription>
            Upload a JSON backup file to restore database contents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This will overwrite existing data. Make sure to export your current database first.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
                data-testid="input-import-file"
              />
            </div>

            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </div>
            )}

            {importing && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Importing data...</div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            <Button 
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="w-full"
              variant={selectedFile ? "default" : "secondary"}
              data-testid="button-import-database"
            >
              {importing ? "Importing..." : "Import Database"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {renderResultSummary()}
    </div>
  );
}