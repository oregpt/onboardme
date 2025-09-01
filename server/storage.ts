import {
  guides,
  flowBoxes,
  steps,
  userProgress,
  qaConversations,
  knowledgeBase,
  users,
  type User,
  type UpsertUser,
  type Guide,
  type InsertGuide,
  type FlowBox,
  type InsertFlowBox,
  type Step,
  type InsertStep,
  type UserProgress,
  type InsertUserProgress,
  type QAConversation,
  type InsertQAConversation,
  type KnowledgeBase,
  type InsertKnowledgeBase,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Guide operations
  createGuide(guide: InsertGuide): Promise<Guide>;
  getGuides(): Promise<Guide[]>;
  getGuide(id: number): Promise<Guide | undefined>;
  getGuideBySlug(slug: string): Promise<Guide | undefined>;
  updateGuide(id: number, updates: Partial<InsertGuide>): Promise<Guide | undefined>;
  deleteGuide(id: number): Promise<boolean>;
  
  // Flow operations
  createFlowBox(flowBox: InsertFlowBox): Promise<FlowBox>;
  getFlowBoxesByGuide(guideId: number): Promise<FlowBox[]>;
  updateFlowBox(id: number, updates: Partial<InsertFlowBox>): Promise<FlowBox | undefined>;
  deleteFlowBox(id: number): Promise<boolean>;
  
  // Step operations
  createStep(step: InsertStep): Promise<Step>;
  getStepsByFlowBox(flowBoxId: number): Promise<Step[]>;
  getStepsByGuide(guideId: number): Promise<Step[]>;
  updateStep(id: number, updates: Partial<InsertStep>): Promise<Step | undefined>;
  deleteStep(id: number): Promise<boolean>;
  
  // Progress operations
  getUserProgress(userId: string, guideId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: string, guideId: number, updates: Partial<InsertUserProgress>): Promise<UserProgress>;
  markStepComplete(userId: string, guideId: number, stepId: number): Promise<void>;
  markFlowBoxComplete(userId: string, guideId: number, flowBoxId: number): Promise<void>;
  
  // Q&A operations
  createQAConversation(qa: InsertQAConversation): Promise<QAConversation>;
  getQAByGuide(guideId: number): Promise<QAConversation[]>;
  getQAByStep(stepId: number): Promise<QAConversation[]>;
  updateQAFeedback(id: number, feedback: number): Promise<void>;
  
  // Knowledge base operations
  createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase>;
  getKnowledgeByGuide(guideId: number): Promise<KnowledgeBase[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Guide operations
  async createGuide(guide: InsertGuide): Promise<Guide> {
    const [newGuide] = await db.insert(guides).values(guide).returning();
    return newGuide;
  }

  async getGuides(): Promise<Guide[]> {
    return await db.select().from(guides).orderBy(desc(guides.createdAt));
  }

  async getGuide(id: number): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, id));
    return guide;
  }

  async getGuideBySlug(slug: string): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.slug, slug));
    return guide;
  }

  async updateGuide(id: number, updates: Partial<InsertGuide>): Promise<Guide | undefined> {
    const [updatedGuide] = await db
      .update(guides)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(guides.id, id))
      .returning();
    return updatedGuide;
  }

  async deleteGuide(id: number): Promise<boolean> {
    const result = await db.delete(guides).where(eq(guides.id, id));
    return result.rowCount > 0;
  }

  // Flow operations
  async createFlowBox(flowBox: InsertFlowBox): Promise<FlowBox> {
    const [newFlowBox] = await db.insert(flowBoxes).values(flowBox).returning();
    return newFlowBox;
  }

  async getFlowBoxesByGuide(guideId: number): Promise<FlowBox[]> {
    return await db
      .select()
      .from(flowBoxes)
      .where(eq(flowBoxes.guideId, guideId))
      .orderBy(asc(flowBoxes.position));
  }

  async updateFlowBox(id: number, updates: Partial<InsertFlowBox>): Promise<FlowBox | undefined> {
    const [updatedFlowBox] = await db
      .update(flowBoxes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flowBoxes.id, id))
      .returning();
    return updatedFlowBox;
  }

  async deleteFlowBox(id: number): Promise<boolean> {
    const result = await db.delete(flowBoxes).where(eq(flowBoxes.id, id));
    return result.rowCount > 0;
  }

  // Step operations
  async createStep(step: InsertStep): Promise<Step> {
    const [newStep] = await db.insert(steps).values(step).returning();
    return newStep;
  }

  async getStepsByFlowBox(flowBoxId: number): Promise<Step[]> {
    return await db
      .select()
      .from(steps)
      .where(eq(steps.flowBoxId, flowBoxId))
      .orderBy(asc(steps.position));
  }

  async getStepsByGuide(guideId: number): Promise<Step[]> {
    return await db
      .select({
        id: steps.id,
        flowBoxId: steps.flowBoxId,
        title: steps.title,
        content: steps.content,
        personaVariations: steps.personaVariations,
        position: steps.position,
        isVisible: steps.isVisible,
        attachments: steps.attachments,
        createdAt: steps.createdAt,
        updatedAt: steps.updatedAt,
      })
      .from(steps)
      .innerJoin(flowBoxes, eq(steps.flowBoxId, flowBoxes.id))
      .where(eq(flowBoxes.guideId, guideId))
      .orderBy(asc(flowBoxes.position), asc(steps.position));
  }

  async updateStep(id: number, updates: Partial<InsertStep>): Promise<Step | undefined> {
    const [updatedStep] = await db
      .update(steps)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(steps.id, id))
      .returning();
    return updatedStep;
  }

  async deleteStep(id: number): Promise<boolean> {
    const result = await db.delete(steps).where(eq(steps.id, id));
    return result.rowCount > 0;
  }

  // Progress operations
  async getUserProgress(userId: string, guideId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.userId, userId), eq(userProgress.guideId, guideId)));
    return progress;
  }

  async updateUserProgress(userId: string, guideId: number, updates: Partial<InsertUserProgress>): Promise<UserProgress> {
    const existing = await this.getUserProgress(userId, guideId);
    
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ ...updates, lastAccessedAt: new Date() })
        .where(and(eq(userProgress.userId, userId), eq(userProgress.guideId, guideId)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userProgress)
        .values({ userId, guideId, ...updates })
        .returning();
      return created;
    }
  }

  async markStepComplete(userId: string, guideId: number, stepId: number): Promise<void> {
    const progress = await this.getUserProgress(userId, guideId);
    const completedSteps = (progress?.completedSteps as number[]) || [];
    
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
      await this.updateUserProgress(userId, guideId, { 
        completedSteps: completedSteps,
        currentStep: stepId 
      });
    }
  }

  async markFlowBoxComplete(userId: string, guideId: number, flowBoxId: number): Promise<void> {
    const progress = await this.getUserProgress(userId, guideId);
    const completedFlowBoxes = (progress?.completedFlowBoxes as number[]) || [];
    const completedSteps = (progress?.completedSteps as number[]) || [];
    
    if (!completedFlowBoxes.includes(flowBoxId)) {
      // Get all steps in this flow box
      const flowBoxSteps = await this.getStepsByFlowBox(flowBoxId);
      
      // Add all steps from this flow box to completed steps
      const newCompletedSteps = [...completedSteps];
      let hasNewSteps = false;
      
      flowBoxSteps.forEach(step => {
        if (!newCompletedSteps.includes(step.id)) {
          newCompletedSteps.push(step.id);
          hasNewSteps = true;
        }
      });
      
      // Mark flow box as complete
      completedFlowBoxes.push(flowBoxId);
      
      // Update progress with both completed flow box and all its steps
      await this.updateUserProgress(userId, guideId, { 
        completedFlowBoxes: completedFlowBoxes,
        completedSteps: newCompletedSteps,
        currentStep: flowBoxSteps[flowBoxSteps.length - 1]?.id // Set current step to last step in flow
      });
    }
  }

  // Q&A operations
  async createQAConversation(qa: InsertQAConversation): Promise<QAConversation> {
    const [newQA] = await db.insert(qaConversations).values(qa).returning();
    return newQA;
  }

  async getQAByGuide(guideId: number): Promise<QAConversation[]> {
    return await db
      .select()
      .from(qaConversations)
      .where(eq(qaConversations.guideId, guideId))
      .orderBy(desc(qaConversations.createdAt));
  }

  async getQAByStep(stepId: number): Promise<QAConversation[]> {
    return await db
      .select()
      .from(qaConversations)
      .where(eq(qaConversations.stepId, stepId))
      .orderBy(desc(qaConversations.createdAt));
  }

  async updateQAFeedback(id: number, feedback: number): Promise<void> {
    await db
      .update(qaConversations)
      .set({ userFeedback: feedback })
      .where(eq(qaConversations.id, id));
  }

  // Knowledge base operations
  async createKnowledgeEntry(entry: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [newEntry] = await db.insert(knowledgeBase).values(entry).returning();
    return newEntry;
  }

  async getKnowledgeByGuide(guideId: number): Promise<KnowledgeBase[]> {
    return await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.guideId, guideId))
      .orderBy(desc(knowledgeBase.createdAt));
  }
}

export const storage = new DatabaseStorage();
