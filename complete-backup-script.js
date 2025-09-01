#!/usr/bin/env node

// Complete Database Backup Script
// This script creates a comprehensive backup of ALL application tables

import fs from 'fs';

// All tables from the database schema
const tables = [
  'conversation_history',
  'flow_boxes', 
  'guides',
  'knowledge_base',
  'project_members',
  'projects',
  'qa_conversations',
  'sessions',
  'step_comments',
  'steps',
  'user_progress',
  'users'
];

async function backupAllTables() {
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    description: 'Complete database backup of all tables',
    tables_included: tables,
    data: {}
  };

  console.log('🔄 Starting complete database backup...');
  console.log(`📋 Backing up ${tables.length} tables`);

  // Use API endpoints or direct database queries
  const baseUrl = 'http://localhost:5000';

  // Map tables to their likely API endpoints
  const tableEndpoints = {
    'users': '/api/users',
    'projects': '/api/projects', 
    'project_members': '/api/project-members',
    'guides': '/api/guides',
    'flow_boxes': '/api/flow-boxes',
    'steps': '/api/steps',
    'user_progress': '/api/user-progress',
    'qa_conversations': '/api/conversations',
    'conversation_history': '/api/conversation-history',
    'knowledge_base': '/api/knowledge-base',
    'step_comments': '/api/step-comments',
    'sessions': null // Skip sessions table as it contains temporary data
  };

  for (const table of tables) {
    try {
      console.log(`📥 Backing up ${table}...`);
      
      const endpoint = tableEndpoints[table];
      if (!endpoint) {
        console.log(`⏭️  Skipping ${table} (no endpoint defined)`);
        backup.data[table] = { skipped: true, reason: 'No API endpoint' };
        continue;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        backup.data[table] = data;
        console.log(`✅ ${table}: ${Array.isArray(data) ? data.length : 'N/A'} records`);
      } else {
        console.log(`⚠️  ${table}: ${response.status} ${response.statusText}`);
        backup.data[table] = { error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
      backup.data[table] = { error: error.message };
    }
  }

  // Save backup to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `complete-database-backup-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ Complete backup finished: ${filename}`);
  console.log(`📁 File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
  console.log(`🗂️  Tables processed: ${tables.length}`);
  console.log(`📊 Tables with data: ${Object.keys(backup.data).filter(t => backup.data[t] && !backup.data[t].error && !backup.data[t].skipped).length}`);
  
  return filename;
}

// Also create a SQL-based backup function for direct database access
async function createSQLBackup() {
  const sqlQueries = tables.map(table => {
    if (table === 'sessions') return `-- Skipping sessions table (temporary data)`;
    return `-- Backup of ${table} table\nSELECT * FROM ${table};`;
  }).join('\n\n');

  const sqlBackupContent = `-- Complete Database Backup SQL Script
-- Generated on: ${new Date().toISOString()}
-- Tables: ${tables.join(', ')}

${sqlQueries}

-- End of backup script`;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `database-backup-queries-${timestamp}.sql`;
  
  fs.writeFileSync(filename, sqlBackupContent);
  console.log(`📝 SQL backup queries saved: ${filename}`);
  
  return filename;
}

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.all([
    backupAllTables(),
    createSQLBackup()
  ]).catch(console.error);
}

export { backupAllTables, createSQLBackup };