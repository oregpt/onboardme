#!/usr/bin/env tsx
/**
 * Data Migration Script: Development to Production Database
 * 
 * This script migrates data from your development database to production database.
 * It handles the Replit deployment scenario where production has a separate DATABASE_URL.
 */

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

// Source (Development) Database
const DEV_DATABASE_URL = "postgresql://neondb_owner:npg_ws4gZCG0ukaW@ep-withered-dream-adoknr4g.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Target (Production) Database - Update this with your production URL
const PROD_DATABASE_URL = "postgresql://neondb_owner:npg_zwogZnG1bm0L@ep-broad-cloud-adon2wgl.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function createConnection(url: string) {
  const pool = new Pool({ connectionString: url });
  return drizzle({ client: pool, schema });
}

async function exportData(db: any) {
  console.log("📥 Exporting data from development database...");
  
  // Export in dependency order (tables that others reference first)
  const users = await db.select().from(schema.users);
  const projects = await db.select().from(schema.projects);
  const projectMembers = await db.select().from(schema.projectMembers);
  const guides = await db.select().from(schema.guides);
  const flowBoxes = await db.select().from(schema.flowBoxes);
  const steps = await db.select().from(schema.steps);
  const userProgress = await db.select().from(schema.userProgress);
  const qaConversations = await db.select().from(schema.qaConversations);
  const knowledgeBase = await db.select().from(schema.knowledgeBase);
  const conversationHistory = await db.select().from(schema.conversationHistory);
  const stepComments = await db.select().from(schema.stepComments);

  console.log(`📊 Export Summary:`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Project Members: ${projectMembers.length}`);
  console.log(`   Guides: ${guides.length}`);
  console.log(`   Flow Boxes: ${flowBoxes.length}`);
  console.log(`   Steps: ${steps.length}`);
  console.log(`   User Progress: ${userProgress.length}`);
  console.log(`   QA Conversations: ${qaConversations.length}`);
  console.log(`   Knowledge Base: ${knowledgeBase.length}`);
  console.log(`   Conversation History: ${conversationHistory.length}`);
  console.log(`   Step Comments: ${stepComments.length}`);

  return {
    users,
    projects,
    projectMembers,
    guides,
    flowBoxes,
    steps,
    userProgress,
    qaConversations,
    knowledgeBase,
    conversationHistory,
    stepComments
  };
}

async function importData(db: any, data: any) {
  console.log("📤 Importing data to production database...");
  
  try {
    // Clear existing data (in reverse dependency order)
    console.log("🧹 Clearing existing production data...");
    await db.delete(schema.stepComments);
    await db.delete(schema.conversationHistory);
    await db.delete(schema.knowledgeBase);
    await db.delete(schema.qaConversations);
    await db.delete(schema.userProgress);
    await db.delete(schema.steps);
    await db.delete(schema.flowBoxes);
    await db.delete(schema.guides);
    await db.delete(schema.projectMembers);
    await db.delete(schema.projects);
    await db.delete(schema.users);

    // Import data (in dependency order)
    console.log("📥 Inserting development data...");
    
    if (data.users.length > 0) {
      await db.insert(schema.users).values(data.users);
      console.log(`✅ Users: ${data.users.length} imported`);
    }
    
    if (data.projects.length > 0) {
      await db.insert(schema.projects).values(data.projects);
      console.log(`✅ Projects: ${data.projects.length} imported`);
    }
    
    if (data.projectMembers.length > 0) {
      await db.insert(schema.projectMembers).values(data.projectMembers);
      console.log(`✅ Project Members: ${data.projectMembers.length} imported`);
    }
    
    if (data.guides.length > 0) {
      await db.insert(schema.guides).values(data.guides);
      console.log(`✅ Guides: ${data.guides.length} imported`);
    }
    
    if (data.flowBoxes.length > 0) {
      await db.insert(schema.flowBoxes).values(data.flowBoxes);
      console.log(`✅ Flow Boxes: ${data.flowBoxes.length} imported`);
    }
    
    if (data.steps.length > 0) {
      await db.insert(schema.steps).values(data.steps);
      console.log(`✅ Steps: ${data.steps.length} imported`);
    }
    
    if (data.userProgress.length > 0) {
      await db.insert(schema.userProgress).values(data.userProgress);
      console.log(`✅ User Progress: ${data.userProgress.length} imported`);
    }
    
    if (data.qaConversations.length > 0) {
      await db.insert(schema.qaConversations).values(data.qaConversations);
      console.log(`✅ QA Conversations: ${data.qaConversations.length} imported`);
    }
    
    if (data.knowledgeBase.length > 0) {
      await db.insert(schema.knowledgeBase).values(data.knowledgeBase);
      console.log(`✅ Knowledge Base: ${data.knowledgeBase.length} imported`);
    }
    
    if (data.conversationHistory.length > 0) {
      await db.insert(schema.conversationHistory).values(data.conversationHistory);
      console.log(`✅ Conversation History: ${data.conversationHistory.length} imported`);
    }
    
    if (data.stepComments.length > 0) {
      await db.insert(schema.stepComments).values(data.stepComments);
      console.log(`✅ Step Comments: ${data.stepComments.length} imported`);
    }

    console.log("🎉 Data migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting Data Migration: Dev → Prod");
  console.log("=" .repeat(50));
  
  try {
    // Connect to both databases
    console.log("🔗 Connecting to databases...");
    const devDb = await createConnection(DEV_DATABASE_URL);
    const prodDb = await createConnection(PROD_DATABASE_URL);
    
    // Export from development
    const data = await exportData(devDb);
    
    // Import to production
    await importData(prodDb, data);
    
    console.log("=" .repeat(50));
    console.log("✅ Migration completed successfully!");
    console.log("🎯 Your production database now has the same data as development.");
    
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main();
}

export { exportData, importData, createConnection };