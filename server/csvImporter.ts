import { storage } from "./storage";
import { type InsertFlowBox, type InsertStep } from "@shared/schema";

interface CSVRow {
  "Flow Name": string;
  "Flow Description": string;
  "Step Title": string;
  "Content": string;
}

export interface ImportResult {
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

export function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n');
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header and one data row");
  }

  // Parse header
  const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
  const expectedHeaders = ["Flow Name", "Flow Description", "Step Title", "Content"];
  
  if (!expectedHeaders.every(h => header.includes(h))) {
    throw new Error(`CSV must have headers: ${expectedHeaders.join(', ')}`);
  }

  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing - handles quoted fields with commas
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim().replace(/^"|"$/g, ''));
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    fields.push(currentField.trim().replace(/^"|"$/g, ''));
    
    if (fields.length >= 4) {
      rows.push({
        "Flow Name": fields[0],
        "Flow Description": fields[1],
        "Step Title": fields[2],
        "Content": fields[3]
      });
    }
  }

  return rows;
}

export async function importGuideFromCSV(
  guideId: number,
  csvContent: string
): Promise<ImportResult> {
  try {
    const rows = parseCSV(csvContent);
    
    if (rows.length === 0) {
      throw new Error("No valid data rows found in CSV");
    }

    // Group rows by flow
    const flowGroups = new Map<string, { description: string; steps: Array<{ title: string; content: string }> }>();
    
    for (const row of rows) {
      const flowName = row["Flow Name"];
      const flowDescription = row["Flow Description"];
      const stepTitle = row["Step Title"];
      const stepContent = row["Content"];
      
      if (!flowGroups.has(flowName)) {
        flowGroups.set(flowName, {
          description: flowDescription,
          steps: []
        });
      }
      
      flowGroups.get(flowName)!.steps.push({
        title: stepTitle,
        content: stepContent
      });
    }

    // Import flows and steps
    let flowBoxesCreated = 0;
    let stepsCreated = 0;
    const flows: Array<{ name: string; stepCount: number }> = [];
    let position = 1;

    // Get existing flow boxes to determine starting position
    const existingFlows = await storage.getFlowBoxesByGuide(guideId);
    if (existingFlows.length > 0) {
      position = Math.max(...existingFlows.map(f => f.position)) + 1;
    }

    for (const [flowName, flowData] of flowGroups) {
      // Create flow box
      const flowBox: InsertFlowBox = {
        guideId,
        title: flowName,
        description: flowData.description,
        position: position++
      };

      const createdFlowBox = await storage.createFlowBox(flowBox);
      flowBoxesCreated++;

      // Create steps for this flow
      let stepPosition = 1;
      for (const stepData of flowData.steps) {
        const step: InsertStep = {
          flowBoxId: createdFlowBox.id,
          title: stepData.title,
          content: stepData.content,
          position: stepPosition++
        };

        await storage.createStep(step);
        stepsCreated++;
      }

      flows.push({
        name: flowName,
        stepCount: flowData.steps.length
      });
    }

    return {
      success: true,
      message: `Successfully imported ${flowBoxesCreated} flows with ${stepsCreated} steps`,
      results: {
        flowBoxesCreated,
        stepsCreated,
        flows
      },
      importedAt: new Date()
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown import error",
      results: {
        flowBoxesCreated: 0,
        stepsCreated: 0,
        flows: []
      },
      importedAt: new Date()
    };
  }
}