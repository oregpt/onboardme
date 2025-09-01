#!/usr/bin/env node

// Database Backup Script
// This script creates a comprehensive backup of all application data

import fs from 'fs';
import path from 'path';

// API endpoints to backup
const endpoints = [
  { name: 'users', url: '/api/users' },
  { name: 'projects', url: '/api/projects' },
  { name: 'guides', url: '/api/guides' },
  { name: 'flow-boxes', url: '/api/flow-boxes' },
  { name: 'steps', url: '/api/steps' },
  { name: 'project-members', url: '/api/project-members' },
  { name: 'user-progress', url: '/api/user-progress' },
  { name: 'conversations', url: '/api/conversations' },
  { name: 'knowledge-base', url: '/api/knowledge-base' }
];

async function backupData() {
  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {}
  };

  console.log('🔄 Starting database backup...');

  // If running in Replit environment, use localhost
  const baseUrl = process.env.REPL_ID ? 'http://localhost:5000' : 'http://localhost:5000';

  for (const endpoint of endpoints) {
    try {
      console.log(`📥 Backing up ${endpoint.name}...`);
      
      const response = await fetch(`${baseUrl}${endpoint.url}`, {
        headers: {
          'Accept': 'application/json',
          // Add any authentication headers if needed
        }
      });

      if (response.ok) {
        const data = await response.json();
        backup.data[endpoint.name] = data;
        console.log(`✅ ${endpoint.name}: ${Array.isArray(data) ? data.length : 'N/A'} records`);
      } else {
        console.log(`⚠️  ${endpoint.name}: ${response.status} ${response.statusText}`);
        backup.data[endpoint.name] = { error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      backup.data[endpoint.name] = { error: error.message };
    }
  }

  // Save backup to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `database-backup-${timestamp}.json`;
  
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ Backup completed: ${filename}`);
  console.log(`📁 File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
  console.log(`🗂️  Tables backed up: ${Object.keys(backup.data).length}`);
  
  return filename;
}

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  backupData().catch(console.error);
}

export { backupData };