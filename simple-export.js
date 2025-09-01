#!/usr/bin/env node

// Simple Database Export - Just the basics
// Usage: node simple-export.js

import fs from 'fs';
import { db } from './server/db.js';
import * as schema from './shared/schema.js';

async function simpleExport() {
  console.log('📤 Exporting database...');
  
  const data = {
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    },
    data: {}
  };
  
  // Export main tables
  try {
    data.data.users = await db.select().from(schema.users);
    data.data.projects = await db.select().from(schema.projects);
    data.data.project_members = await db.select().from(schema.projectMembers);
    data.data.guides = await db.select().from(schema.guides);
    data.data.flow_boxes = await db.select().from(schema.flowBoxes);
    data.data.steps = await db.select().from(schema.steps);
    
    const filename = `backup-${new Date().toISOString().slice(0,19).replace(/[T:]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    
    const total = Object.values(data.data).reduce((sum, table) => sum + table.length, 0);
    console.log(`✅ Exported ${total} records to ${filename}`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

simpleExport();