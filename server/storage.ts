import {
  guides,
  flowBoxes,
  steps,
  userProgress,
  qaConversations,
  knowledgeBase,
  users,
  projects,
  projectMembers,
  conversationHistory,
  stepComments,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type ProjectMember,
  type InsertProjectMember,
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
  type ConversationHistory,
  type InsertConversationHistory,
  type StepComment,
  type InsertStepComment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Project member operations
  addProjectMember(projectId: number, userId: string, role: string): Promise<ProjectMember>;
  getProjectMembers(projectId: number): Promise<ProjectMember[]>;
  getUserProjectRole(userId: string, projectId: number): Promise<string | undefined>;
  updateProjectMemberRole(memberId: number, role: string): Promise<ProjectMember | undefined>;
  removeProjectMember(memberId: number): Promise<boolean>;
  
  // Guide operations
  createGuide(guide: InsertGuide): Promise<Guide>;
  getGuides(projectId?: number): Promise<Guide[]>;
  getGuide(id: number): Promise<Guide | undefined>;
  getGuideBySlug(slug: string, projectId?: number): Promise<Guide | undefined>;
  updateGuide(id: number, updates: Partial<InsertGuide>): Promise<Guide | undefined>;
  deleteGuide(id: number): Promise<boolean>;
  
  // Flow operations
  createFlowBox(flowBox: InsertFlowBox): Promise<FlowBox>;
  getFlowBoxesByGuide(guideId: number): Promise<FlowBox[]>;
  getFlowBox(id: number): Promise<FlowBox | undefined>;
  updateFlowBox(id: number, updates: Partial<InsertFlowBox>): Promise<FlowBox | undefined>;
  deleteFlowBox(id: number): Promise<boolean>;
  
  // Step operations
  createStep(step: InsertStep): Promise<Step>;
  getStepsByFlowBox(flowBoxId: number): Promise<Step[]>;
  getStepsByGuide(guideId: number): Promise<Step[]>;
  getStep(id: number): Promise<Step | undefined>;
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
  
  // Conversation history operations
  storeConversationMessage(message: InsertConversationHistory): Promise<ConversationHistory>;
  getConversationHistory(projectId: number, conversationId?: string): Promise<ConversationHistory[]>;
  
  // Step comment operations
  createStepComment(comment: InsertStepComment): Promise<StepComment>;
  getStepComments(stepId: number): Promise<StepComment[]>;
  updateStepComment(id: number, updates: Partial<InsertStepComment>): Promise<StepComment | undefined>;
  deleteStepComment(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        slug: projects.slug,
        ownerId: projects.ownerId,
        settings: projects.settings,
        isActive: projects.isActive,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(and(eq(projectMembers.userId, userId), eq(projects.isActive, true)))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug));
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Project member operations
  async addProjectMember(projectId: number, userId: string, role: string): Promise<ProjectMember> {
    const [newMember] = await db.insert(projectMembers).values({
      projectId,
      userId,
      role
    }).returning();
    return newMember;
  }

  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
  }

  async getUserProjectRole(userId: string, projectId: number): Promise<string | undefined> {
    const [member] = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)));
    return member?.role ?? undefined;
  }

  async updateProjectMemberRole(memberId: number, role: string): Promise<ProjectMember | undefined> {
    const [updatedMember] = await db
      .update(projectMembers)
      .set({ role })
      .where(eq(projectMembers.id, memberId))
      .returning();
    return updatedMember;
  }

  async removeProjectMember(memberId: number): Promise<boolean> {
    const result = await db
      .delete(projectMembers)
      .where(eq(projectMembers.id, memberId));
    return (result.rowCount ?? 0) > 0;
  }

  // Guide operations
  async createGuide(guide: InsertGuide): Promise<Guide> {
    const [newGuide] = await db.insert(guides).values(guide).returning();
    return newGuide;
  }

  async getGuides(projectId?: number): Promise<Guide[]> {
    const query = db.select().from(guides);
    if (projectId) {
      query.where(eq(guides.projectId, projectId));
    }
    return await query.orderBy(desc(guides.createdAt));
  }

  async getGuide(id: number): Promise<Guide | undefined> {
    const [guide] = await db.select().from(guides).where(eq(guides.id, id));
    return guide;
  }

  async getGuideBySlug(slug: string, projectId?: number): Promise<Guide | undefined> {
    const conditions = [eq(guides.slug, slug)];
    if (projectId) {
      conditions.push(eq(guides.projectId, projectId));
    }
    const [guide] = await db.select().from(guides).where(and(...conditions));
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
    return (result.rowCount ?? 0) > 0;
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

  async getFlowBox(id: number): Promise<FlowBox | undefined> {
    const [flowBox] = await db
      .select()
      .from(flowBoxes)
      .where(eq(flowBoxes.id, id));
    return flowBox;
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
    return (result.rowCount ?? 0) > 0;
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

  async getStep(id: number): Promise<Step | undefined> {
    const [step] = await db
      .select()
      .from(steps)
      .where(eq(steps.id, id));
    return step;
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
    return (result.rowCount ?? 0) > 0;
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

  async unmarkStepComplete(userId: string, guideId: number, stepId: number): Promise<void> {
    const progress = await this.getUserProgress(userId, guideId);
    const completedSteps = (progress?.completedSteps as number[]) || [];
    
    if (completedSteps.includes(stepId)) {
      const updatedSteps = completedSteps.filter(id => id !== stepId);
      await this.updateUserProgress(userId, guideId, { 
        completedSteps: updatedSteps
      });
    }
  }

  async unmarkFlowBoxComplete(userId: string, guideId: number, flowBoxId: number): Promise<void> {
    const progress = await this.getUserProgress(userId, guideId);
    const completedFlowBoxes = (progress?.completedFlowBoxes as number[]) || [];
    const completedSteps = (progress?.completedSteps as number[]) || [];
    
    if (completedFlowBoxes.includes(flowBoxId)) {
      // Get all steps in this flow box
      const flowBoxSteps = await this.getStepsByFlowBox(flowBoxId);
      
      // Remove all steps from this flow box from completed steps
      const updatedSteps = completedSteps.filter(stepId => 
        !flowBoxSteps.some(step => step.id === stepId)
      );
      
      // Remove flow box from completed flow boxes
      const updatedFlowBoxes = completedFlowBoxes.filter(id => id !== flowBoxId);
      
      // Update progress
      await this.updateUserProgress(userId, guideId, { 
        completedFlowBoxes: updatedFlowBoxes,
        completedSteps: updatedSteps
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

  // Conversation history operations
  async storeConversationMessage(message: InsertConversationHistory): Promise<ConversationHistory> {
    const [newMessage] = await db.insert(conversationHistory).values(message).returning();
    return newMessage;
  }

  async getConversationHistory(projectId: number, conversationId?: string): Promise<ConversationHistory[]> {
    const conditions = [eq(conversationHistory.projectId, projectId)];
    if (conversationId) {
      conditions.push(eq(conversationHistory.conversationId, conversationId));
    }
    return await db
      .select()
      .from(conversationHistory)
      .where(and(...conditions))
      .orderBy(asc(conversationHistory.createdAt));
  }

  // Step comment operations
  async createStepComment(comment: InsertStepComment): Promise<StepComment> {
    const [newComment] = await db.insert(stepComments).values(comment).returning();
    return newComment;
  }

  async getStepComments(stepId: number): Promise<StepComment[]> {
    return await db
      .select()
      .from(stepComments)
      .where(eq(stepComments.stepId, stepId))
      .orderBy(desc(stepComments.createdAt));
  }

  async updateStepComment(id: number, updates: Partial<InsertStepComment>): Promise<StepComment | undefined> {
    const [updatedComment] = await db
      .update(stepComments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(stepComments.id, id))
      .returning();
    return updatedComment;
  }

  async deleteStepComment(id: number): Promise<boolean> {
    const result = await db.delete(stepComments).where(eq(stepComments.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
