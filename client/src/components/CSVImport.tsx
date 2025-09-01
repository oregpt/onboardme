import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Upload, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImportResult {
  success: boolean;
  message: string;
  results: {
    flowBoxesCreated: number;
    stepsCreated: number;
    flows: Array<{
      name: string;
      stepCount: number;
    }>;
  };
  importedAt: Date;
}

interface CSVImportProps {
  guideId: number;
  onImportComplete?: () => void;
}

export function CSVImport({ guideId, onImportComplete }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => prev < 90 ? prev + 10 : prev);
      }, 200);

      // Read file content
      const csvContent = await file.text();
      
      setProgress(95);

      // Call import API
      const importResult = await apiRequest(`/api/guides/${guideId}/import-csv`, {
        method: 'POST',
        body: JSON.stringify({ csvContent }),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as ImportResult;

      clearInterval(progressInterval);
      setProgress(100);
      setResult(importResult);

      if (importResult.success && onImportComplete) {
        // Delay to show success state
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      }

    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed',
        results: { flowBoxesCreated: 0, stepsCreated: 0, flows: [] },
        importedAt: new Date()
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="csv-import-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Guide Content from CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV file with Flow Name, Flow Description, Step Title, and Content columns to import structured guide content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importing}
            data-testid="csv-file-input"
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        {/* Expected Format */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Expected CSV Format:</strong>
            <br />
            Columns: Flow Name, Flow Description, Step Title, Content
            <br />
            Content should include markdown formatting for rich text (code blocks, lists, etc.)
          </AlertDescription>
        </Alert>

        {/* Import Button */}
        <Button 
          onClick={handleImport} 
          disabled={!file || importing}
          className="w-full"
          data-testid="import-button"
        >
          {importing ? 'Importing...' : 'Import CSV Content'}
        </Button>

        {/* Progress Bar */}
        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {progress < 50 ? 'Reading file...' : 
               progress < 95 ? 'Processing content...' : 
               'Creating flows and steps...'}
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <Alert className={result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="space-y-2">
              <div className={result.success ? "text-green-800" : "text-red-800"}>
                <strong>{result.success ? 'Success!' : 'Error:'}</strong> {result.message}
              </div>
              
              {result.success && result.results.flows.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium">Import Summary:</div>
                  <div className="text-sm">
                    • {result.results.flowBoxesCreated} flow boxes created
                    <br />
                    • {result.results.stepsCreated} steps created
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-sm font-medium">Imported Flows:</div>
                    <ul className="text-sm list-disc list-inside ml-2">
                      {result.results.flows.map((flow, index) => (
                        <li key={index}>
                          {flow.name} ({flow.stepCount} steps)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}