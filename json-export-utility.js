#!/usr/bin/env node

// JSON Export Utility
// Extracts ALL database data to a clean JSON format for import/export

import { db } from './server/db.js';
import { 
  users, 
  projects, 
  projectMembers, 
  guides, 
  flowBoxes, 
  steps, 
  userProgress,
  qaConversations,
  conversationHistory,
  knowledgeBase,
  stepComments
} from './shared/schema.js';
import fs from 'fs';

async function exportAllData() {
  console.log('🔄 Starting complete database export...');
  
  try {
    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        description: 'Complete database export for Guide Builder application',
        exported_by: 'json-export-utility'
      },
      data: {}
    };

    // Export all tables in dependency order
    console.log('📥 Exporting users...');
    exportData.data.users = await db.select().from(users);
    
    console.log('📥 Exporting projects...');
    exportData.data.projects = await db.select().from(projects);
    
    console.log('📥 Exporting project_members...');
    exportData.data.project_members = await db.select().from(projectMembers);
    
    console.log('📥 Exporting guides...');
    exportData.data.guides = await db.select().from(guides);
    
    console.log('📥 Exporting flow_boxes...');
    exportData.data.flow_boxes = await db.select().from(flowBoxes);
    
    console.log('📥 Exporting steps...');
    exportData.data.steps = await db.select().from(steps);
    
    console.log('📥 Exporting user_progress...');
    exportData.data.user_progress = await db.select().from(userProgress);
    
    console.log('📥 Exporting qa_conversations...');
    exportData.data.qa_conversations = await db.select().from(qaConversations);
    
    console.log('📥 Exporting conversation_history...');
    exportData.data.conversation_history = await db.select().from(conversationHistory);
    
    console.log('📥 Exporting knowledge_base...');
    exportData.data.knowledge_base = await db.select().from(knowledgeBase);
    
    console.log('📥 Exporting step_comments...');
    exportData.data.step_comments = await db.select().from(stepComments);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-export-${timestamp}.json`;
    
    // Write to file
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    // Summary
    const summary = {
      filename,
      timestamp: exportData.metadata.timestamp,
      tables: Object.keys(exportData.data).length,
      records: Object.values(exportData.data).reduce((sum, table) => sum + (Array.isArray(table) ? table.length : 0), 0),
      file_size_kb: Math.round(fs.statSync(filename).size / 1024)
    };
    
    console.log('\n✅ Export completed successfully!');
    console.log(`📁 File: ${summary.filename}`);
    console.log(`📊 Tables: ${summary.tables}`);
    console.log(`📈 Total records: ${summary.records}`);
    console.log(`💾 File size: ${summary.file_size_kb} KB`);
    
    return summary;
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Run export if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportAllData().catch(console.error);
}

export { exportAllData };