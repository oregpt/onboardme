import { sql, relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects for multi-tenancy
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  ownerId: varchar("owner_id").notNull(),
  settings: jsonb("settings").default(sql`'{"conversationHistoryEnabled": false}'::jsonb`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project members for access control
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 50 }).default("user"), // admin, creator, user
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Onboarding Guides
export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"), // Nullable initially for migration
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull(),
  globalInformation: text("global_information"), // Guide-wide content
  personas: jsonb("personas").default(sql`'[]'::jsonb`), // Array of persona definitions
  resourceLinks: jsonb("resource_links").default(sql`'[]'::jsonb`), // Array of resource links
  resourceAttachments: jsonb("resource_attachments").default(sql`'[]'::jsonb`), // Array of resource attachments
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flow boxes (containers for steps)
export const flowBoxes = pgTable("flow_boxes", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  agentInstructions: text("agent_instructions"), // Optional AI instructions for this flow
  position: integer("position").notNull(), // Order in the flow
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Individual steps within flow boxes
export const steps = pgTable("steps", {
  id: serial("id").primaryKey(),
  flowBoxId: integer("flow_box_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"), // Base content (markdown)
  personaVariations: jsonb("persona_variations").default(sql`'{}'::jsonb`), // Persona-specific content
  position: integer("position").notNull(), // Order within flow box
  isVisible: boolean("is_visible").default(true),
  isCritical: boolean("is_critical").default(false), // Flag for critical steps
  attachments: jsonb("attachments").default(sql`'[]'::jsonb`), // File attachments
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User progress tracking
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  guideId: integer("guide_id").notNull(),
  completedSteps: jsonb("completed_steps").default(sql`'[]'::jsonb`), // Array of step IDs
  completedFlowBoxes: jsonb("completed_flow_boxes").default(sql`'[]'::jsonb`), // Array of flow box IDs
  currentStep: integer("current_step"),
  selectedPersona: varchar("selected_persona"),
  startedAt: timestamp("started_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
});

// AI Q&A conversations
export const qaConversations = pgTable("qa_conversations", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").notNull(),
  stepId: integer("step_id"), // Null for guide-level questions
  userId: varchar("user_id").notNull(),
  question: text("question").notNull(),
  aiResponse: text("ai_response").notNull(),
  userFeedback: integer("user_feedback"), // 1 for thumbs up, -1 for thumbs down
  isValidatedSolution: boolean("is_validated_solution").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversation history for AI training (configurable per project)
export const conversationHistory = pgTable("conversation_history", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  guideId: integer("guide_id"),
  stepId: integer("step_id"),
  flowBoxId: integer("flow_box_id"),
  userId: varchar("user_id").notNull(),
  conversationId: varchar("conversation_id").notNull(), // Group related messages
  messageRole: varchar("message_role", { length: 20 }).notNull(), // user, assistant, system
  messageContent: text("message_content").notNull(),
  aiProvider: varchar("ai_provider", { length: 50 }), // claude, gpt-5, grok
  aiModel: varchar("ai_model", { length: 100 }),
  contextData: jsonb("context_data"), // Additional context like selected flow, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Knowledge base entries (for AI context)
export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  guideId: integer("guide_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  source: varchar("source").default("manual"), // 'manual', 'ai_synthesis', 'qa_validated'
  createdAt: timestamp("created_at").defaultNow(),
});

// Step comments for peer assistance
export const stepComments = pgTable("step_comments", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  isHelpful: boolean("is_helpful").default(true),
  isCertified: boolean("is_certified").default(true), // User certified this is helpful
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  guides: many(guides),
  conversationHistory: many(conversationHistory),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const guidesRelations = relations(guides, ({ one, many }) => ({
  project: one(projects, {
    fields: [guides.projectId],
    references: [projects.id],
  }),
  flowBoxes: many(flowBoxes),
  userProgress: many(userProgress),
  qaConversations: many(qaConversations),
  knowledgeBase: many(knowledgeBase),
  conversationHistory: many(conversationHistory),
}));

export const flowBoxesRelations = relations(flowBoxes, ({ one, many }) => ({
  guide: one(guides, {
    fields: [flowBoxes.guideId],
    references: [guides.id],
  }),
  steps: many(steps),
}));

export const stepsRelations = relations(steps, ({ one, many }) => ({
  flowBox: one(flowBoxes, {
    fields: [steps.flowBoxId],
    references: [flowBoxes.id],
  }),
  qaConversations: many(qaConversations),
  comments: many(stepComments),
}));

export const stepCommentsRelations = relations(stepComments, ({ one }) => ({
  step: one(steps, {
    fields: [stepComments.stepId],
    references: [steps.id],
  }),
  user: one(users, {
    fields: [stepComments.userId],
    references: [users.id],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  guide: one(guides, {
    fields: [userProgress.guideId],
    references: [guides.id],
  }),
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
}));

export const conversationHistoryRelations = relations(conversationHistory, ({ one }) => ({
  project: one(projects, {
    fields: [conversationHistory.projectId],
    references: [projects.id],
  }),
  guide: one(guides, {
    fields: [conversationHistory.guideId],
    references: [guides.id],
  }),
  step: one(steps, {
    fields: [conversationHistory.stepId],
    references: [steps.id],
  }),
  flowBox: one(flowBoxes, {
    fields: [conversationHistory.flowBoxId],
    references: [flowBoxes.id],
  }),
  user: one(users, {
    fields: [conversationHistory.userId],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = typeof projectMembers.$inferInsert;

export type Guide = typeof guides.$inferSelect;
export type InsertGuide = typeof guides.$inferInsert;

export type FlowBox = typeof flowBoxes.$inferSelect;
export type InsertFlowBox = typeof flowBoxes.$inferInsert;

export type Step = typeof steps.$inferSelect;
export type InsertStep = typeof steps.$inferInsert;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

export type QAConversation = typeof qaConversations.$inferSelect;
export type InsertQAConversation = typeof qaConversations.$inferInsert;

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

export type ConversationHistory = typeof conversationHistory.$inferSelect;
export type InsertConversationHistory = typeof conversationHistory.$inferInsert;

export type StepComment = typeof stepComments.$inferSelect;
export type InsertStepComment = typeof stepComments.$inferInsert;

// Validation schemas
export const insertProjectSchema = createInsertSchema(projects);
export const insertProjectMemberSchema = createInsertSchema(projectMembers);
export const insertGuideSchema = createInsertSchema(guides);
export const insertFlowBoxSchema = createInsertSchema(flowBoxes);
export const insertStepSchema = createInsertSchema(steps);
export const insertUserProgressSchema = createInsertSchema(userProgress);
export const insertQAConversationSchema = createInsertSchema(qaConversations);
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase);
export const insertConversationHistorySchema = createInsertSchema(conversationHistory);
