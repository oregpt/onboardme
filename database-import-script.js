#!/usr/bin/env node

// Database Import/Restore Script
// This script restores data from a backup file to all tables

import fs from 'fs';

async function restoreFromBackup(backupFilename) {
  console.log(`🔄 Starting database restore from ${backupFilename}...`);
  
  // Read backup file
  if (!fs.existsSync(backupFilename)) {
    throw new Error(`Backup file not found: ${backupFilename}`);
  }
  
  const backupData = JSON.parse(fs.readFileSync(backupFilename, 'utf8'));
  console.log(`📋 Backup contains ${Object.keys(backupData.data).length} tables`);
  console.log(`📅 Backup created: ${backupData.timestamp}`);
  
  const baseUrl = 'http://localhost:5000';
  
  // Define restore endpoints (these would need to be created in your app)
  const restoreEndpoints = {
    'users': '/api/import/users',
    'projects': '/api/import/projects',
    'project_members': '/api/import/project-members',
    'guides': '/api/import/guides',
    'flow_boxes': '/api/import/flow-boxes',
    'steps': '/api/import/steps',
    'user_progress': '/api/import/user-progress',
    'qa_conversations': '/api/import/conversations',
    'conversation_history': '/api/import/conversation-history',
    'knowledge_base': '/api/import/knowledge-base',
    'step_comments': '/api/import/step-comments'
  };
  
  // Restore order (dependencies matter!)
  const restoreOrder = [
    'users',           // First - other tables reference users
    'projects',        // Second - guides reference projects
    'project_members', // After projects and users
    'guides',          // After projects
    'flow_boxes',      // After guides
    'steps',           // After flow_boxes
    'knowledge_base',  // After guides
    'qa_conversations', // After guides and users
    'conversation_history', // After qa_conversations
    'step_comments',   // After steps and users
    'user_progress'    // Last - references many other tables
  ];
  
  console.log(`📊 Restoring tables in dependency order...`);
  
  for (const table of restoreOrder) {
    try {
      const tableData = backupData.data[table];
      
      if (!tableData || tableData.error || tableData.skipped) {
        console.log(`⏭️  Skipping ${table} (no data or error in backup)`);
        continue;
      }
      
      if (!Array.isArray(tableData) || tableData.length === 0) {
        console.log(`⏭️  Skipping ${table} (empty)`);
        continue;
      }
      
      console.log(`📥 Restoring ${table} (${tableData.length} records)...`);
      
      const endpoint = restoreEndpoints[table];
      if (!endpoint) {
        console.log(`⚠️  No restore endpoint for ${table}`);
        continue;
      }
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: tableData })
      });
      
      if (response.ok) {
        console.log(`✅ ${table}: Successfully restored`);
      } else {
        const errorText = await response.text();
        console.log(`❌ ${table}: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Database restore completed!`);
}

// Generate SQL INSERT statements from backup
function generateSQLInserts(backupFilename) {
  console.log(`📝 Generating SQL INSERT statements from ${backupFilename}...`);
  
  const backupData = JSON.parse(fs.readFileSync(backupFilename, 'utf8'));
  let sqlContent = `-- Database Restore SQL Script
-- Generated from: ${backupFilename}
-- Backup created: ${backupData.timestamp}
-- Generated on: ${new Date().toISOString()}

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

`;

  // Generate INSERT statements for each table
  const restoreOrder = [
    'users', 'projects', 'project_members', 'guides', 'flow_boxes', 
    'steps', 'knowledge_base', 'qa_conversations', 'conversation_history',
    'step_comments', 'user_progress'
  ];
  
  for (const table of restoreOrder) {
    const tableData = backupData.data[table];
    
    if (!tableData || tableData.error || tableData.skipped || !Array.isArray(tableData) || tableData.length === 0) {
      sqlContent += `-- Skipping ${table} (no data)\n\n`;
      continue;
    }
    
    sqlContent += `-- Restore ${table} table (${tableData.length} records)\n`;
    sqlContent += `DELETE FROM ${table}; -- Clear existing data\n`;
    
    const firstRecord = tableData[0];
    const columns = Object.keys(firstRecord);
    
    sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n`;
    
    const values = tableData.map(record => {
      const recordValues = columns.map(col => {
        const value = record[col];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (Array.isArray(value)) return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      return `  (${recordValues.join(', ')})`;
    });
    
    sqlContent += values.join(',\n') + ';\n\n';
  }
  
  sqlContent += `-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences (adjust table names as needed)
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), false);
SELECT setval(pg_get_serial_sequence('projects', 'id'), COALESCE((SELECT MAX(id) FROM projects), 1), false);
SELECT setval(pg_get_serial_sequence('guides', 'id'), COALESCE((SELECT MAX(id) FROM guides), 1), false);

-- End of restore script`;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `database-restore-${timestamp}.sql`;
  
  fs.writeFileSync(filename, sqlContent);
  console.log(`✅ SQL restore script created: ${filename}`);
  
  return filename;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backupFile = process.argv[2] || 'complete-database-backup.json';
  
  if (process.argv.includes('--sql')) {
    generateSQLInserts(backupFile);
  } else {
    restoreFromBackup(backupFile).catch(console.error);
  }
}

export { restoreFromBackup, generateSQLInserts };