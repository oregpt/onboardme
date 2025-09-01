#!/usr/bin/env node

// Simple Database Import - Just the basics
// Usage: node simple-import.js backup-file.json

import fs from 'fs';
import { db } from './server/db.js';
import * as schema from './shared/schema.js';

async function simpleImport(filename) {
  console.log(`📥 Importing from ${filename}...`);
  
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const tables = data.data;
  
  // Simple order - just import what we can
  const order = ['users', 'projects', 'project_members', 'guides', 'flow_boxes', 'steps'];
  
  for (const table of order) {
    if (!tables[table] || !Array.isArray(tables[table])) continue;
    
    console.log(`📥 ${table}: ${tables[table].length} records`);
    
    try {
      let tableSchema;
      switch (table) {
        case 'users': tableSchema = schema.users; break;
        case 'projects': tableSchema = schema.projects; break;
        case 'project_members': tableSchema = schema.projectMembers; break;
        case 'guides': tableSchema = schema.guides; break;
        case 'flow_boxes': tableSchema = schema.flowBoxes; break;
        case 'steps': tableSchema = schema.steps; break;
      }
      
      if (tableSchema) {
        // Clear table first, then insert all records
        await db.delete(tableSchema);
        
        if (tables[table].length > 0) {
          await db.insert(tableSchema).values(tables[table]);
        }
        
        console.log(`✅ ${table} done`);
      }
    } catch (error) {
      console.log(`❌ ${table} failed:`, error.message);
    }
  }
  
  console.log('✅ Import complete');
}

// Run if called with filename
if (process.argv[2]) {
  simpleImport(process.argv[2]).catch(console.error);
} else {
  console.log('Usage: node simple-import.js backup-file.json');
}