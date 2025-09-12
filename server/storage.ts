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
  platformConfigs,
  customDomainMappings,
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
  type PlatformConfig,
  type InsertPlatformConfig,
  type CustomDomainMapping,
  type InsertCustomDomainMapping,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProjects(userId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>; // For platform admins
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
  
  // Platform configuration operations
  getPlatformConfig(key: string): Promise<PlatformConfig | undefined>;
  setPlatformConfig(key: string, value: string, updatedBy?: string): Promise<PlatformConfig>;
  
  // Custom domain operations
  createCustomDomainMapping(mapping: InsertCustomDomainMapping): Promise<CustomDomainMapping>;
  getCustomDomainMappings(projectId?: number): Promise<CustomDomainMapping[]>;
  getCustomDomainMapping(id: number): Promise<CustomDomainMapping | undefined>;
  getCustomDomainMappingByDomain(domain: string, pathPrefix?: string): Promise<CustomDomainMapping | undefined>;
  updateCustomDomainMapping(id: number, updates: Partial<InsertCustomDomainMapping>): Promise<CustomDomainMapping | undefined>;
  deleteCustomDomainMapping(id: number): Promise<boolean>;
  getPublicGuidesByProject(projectId: number): Promise<Guide[]>;
  getPublicGuideBySlug(slug: string, projectId: number): Promise<Guide | undefined>;
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

  async createPlaceholderUser(email: string): Promise<User> {
    // Generate a temporary ID for the placeholder user
    // When they actually log in, this will be updated with their real Replit user ID
    const tempId = `placeholder_${Date.now()}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const [user] = await db
      .insert(users)
      .values({
        id: tempId,
        email: email,
        firstName: email.split('@')[0], // Use email prefix as temporary name
        lastName: null,
        profileImageUrl: null,
        isPlatformAdmin: false
      })
      .returning();
    
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Set platform admin for ore.phillips@icloud.com
    if (userData.email === 'ore.phillips@icloud.com') {
      userData.isPlatformAdmin = true;
    }

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

    // Auto-add new users to project 1 as user role
    if (user && userData.id) {
      try {
        // Check if user is already a member of project 1
        const existingMembership = await this.getUserProjectRole(userData.id, 1);
        if (!existingMembership) {
          await this.addProjectMember(1, userData.id, 'user');
        }
      } catch (error) {
        console.log('Note: Could not auto-add user to project 1 (project may not exist yet)');
      }
    }

    return user;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProjects(userId: string): Promise<Project[]> {
    // Check if user is platform admin
    const user = await this.getUser(userId);
    if (user?.isPlatformAdmin) {
      return await this.getAllProjects();
    }

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

  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.isActive, true))
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
    // Check if user is already a member
    const existingRole = await this.getUserProjectRole(userId, projectId);
    if (existingRole) {
      // If user exists and role is different, update the role
      if (existingRole !== role) {
        const [member] = await db
          .select()
          .from(projectMembers)
          .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)));
        
        if (member) {
          return await this.updateProjectMemberRole(member.id, role) || member;
        }
      }
      // If same role, return existing member
      const [existingMember] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)));
      return existingMember;
    }
    
    const [newMember] = await db.insert(projectMembers).values({
      projectId,
      userId,
      role
    }).returning();
    return newMember;
  }

  async getProjectMembers(projectId: number): Promise<any[]> {
    return await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
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

  // Export methods for admin functionality
  async getAllUsers() {
    return await db.select().from(users);
  }

  async getAllProjectsForExport() {
    return await db.select().from(projects);
  }

  async getAllProjectMembers() {
    return await db.select().from(projectMembers);
  }

  async getAllGuides() {
    return await db.select().from(guides);
  }

  async getAllFlowBoxes() {
    return await db.select().from(flowBoxes);
  }

  async getAllSteps() {
    return await db.select().from(steps);
  }

  async getAllUserProgress() {
    return await db.select().from(userProgress);
  }

  // Guide operations
  async createGuide(guide: InsertGuide): Promise<Guide> {
    const [newGuide] = await db.insert(guides).values(guide).returning();
    return newGuide;
  }

  async getGuides(projectId?: number): Promise<Guide[]> {
    if (projectId) {
      return await db
        .select()
        .from(guides)
        .where(eq(guides.projectId, projectId))
        .orderBy(desc(guides.createdAt));
    }
    return await db
      .select()
      .from(guides)
      .orderBy(desc(guides.createdAt));
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
        isCritical: steps.isCritical,
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

  async getUserProgressStats(): Promise<{
    totalUsers: number;
    avgCompletion: number;
    completedGuides: number;
  }> {
    // Get all user progress records
    const allProgress = await db.select().from(userProgress);
    
    // Get all unique users
    const uniqueUsers = new Set(allProgress.map(p => p.userId));
    const totalUsers = uniqueUsers.size;

    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        avgCompletion: 0,
        completedGuides: 0
      };
    }

    // Calculate average completion percentage
    let totalCompletionPercentage = 0;
    let completedGuides = 0;
    
    for (const progress of allProgress) {
      const completedSteps = (progress.completedSteps as number[]) || [];
      
      // Get total steps for this guide by joining through flowBoxes
      const guideSteps = await db
        .select()
        .from(steps)
        .innerJoin(flowBoxes, eq(steps.flowBoxId, flowBoxes.id))
        .where(eq(flowBoxes.guideId, progress.guideId));
      
      const totalSteps = guideSteps.length;
      
      if (totalSteps > 0) {
        const completion = (completedSteps.length / totalSteps) * 100;
        totalCompletionPercentage += completion;
        
        // Count as completed if 100% done
        if (completion >= 100) {
          completedGuides++;
        }
      }
    }

    const avgCompletion = allProgress.length > 0 
      ? Math.round(totalCompletionPercentage / allProgress.length)
      : 0;

    return {
      totalUsers,
      avgCompletion,
      completedGuides
    };
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

  // Platform configuration operations
  async getPlatformConfig(key: string): Promise<PlatformConfig | undefined> {
    const [config] = await db.select().from(platformConfigs).where(eq(platformConfigs.key, key));
    return config;
  }

  async setPlatformConfig(key: string, value: string, updatedBy?: string): Promise<PlatformConfig> {
    const [config] = await db
      .insert(platformConfigs)
      .values({
        key,
        value,
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: platformConfigs.key,
        set: {
          value,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return config;
  }

  async getDetailedUserProgress(): Promise<any[]> {
    // Get all user progress with user and guide information
    const progressData = await db
      .select({
        userId: userProgress.userId,
        guideId: userProgress.guideId,
        completedSteps: userProgress.completedSteps,
        completedFlowBoxes: userProgress.completedFlowBoxes,
        lastAccessedAt: userProgress.lastAccessedAt,
        guideName: guides.title,
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email
      })
      .from(userProgress)
      .leftJoin(guides, eq(userProgress.guideId, guides.id))
      .leftJoin(users, eq(userProgress.userId, users.id));

    // Get total steps for each guide
    const guideSteps = await db
      .select({
        guideId: flowBoxes.guideId,
        stepCount: sql<number>`count(*)::int`
      })
      .from(steps)
      .leftJoin(flowBoxes, eq(steps.flowBoxId, flowBoxes.id))
      .groupBy(flowBoxes.guideId);

    // Transform data for frontend
    const userMap = new Map();
    
    for (const progress of progressData) {
      if (!userMap.has(progress.userId)) {
        userMap.set(progress.userId, {
          userId: progress.userId,
          userName: progress.userName || 'Unknown User',
          email: progress.userEmail || 'No email',
          guides: []
        });
      }

      const user = userMap.get(progress.userId);
      const completedStepsArray = Array.isArray(progress.completedSteps) ? progress.completedSteps : [];
      const totalSteps = guideSteps.find(g => g.guideId === progress.guideId)?.stepCount || 0;
      const progressPercentage = totalSteps > 0 ? Math.round((completedStepsArray.length / totalSteps) * 100) : 0;

      user.guides.push({
        guideId: progress.guideId,
        guideName: progress.guideName || 'Unknown Guide',
        completedSteps: completedStepsArray.length,
        totalSteps,
        progress: progressPercentage,
        lastActive: progress.lastAccessedAt ? new Date(progress.lastAccessedAt).toLocaleDateString() : 'Never'
      });
    }

    return Array.from(userMap.values());
  }

  async getPerGuideMetrics(): Promise<any[]> {
    // Get all guides with their step counts and user progress
    const guidesWithMetrics = await db
      .select({
        guideId: guides.id,
        guideName: guides.title,
        guideDescription: guides.description
      })
      .from(guides);

    // Get step counts per guide
    const stepCounts = await db
      .select({
        guideId: flowBoxes.guideId,
        totalSteps: sql<number>`count(*)::int`
      })
      .from(steps)
      .leftJoin(flowBoxes, eq(steps.flowBoxId, flowBoxes.id))
      .groupBy(flowBoxes.guideId);

    // Get user progress metrics per guide
    const progressMetrics = await db
      .select({
        guideId: userProgress.guideId,
        totalUsers: sql<number>`count(distinct ${userProgress.userId})::int`,
        avgCompletedSteps: sql<number>`avg(jsonb_array_length(${userProgress.completedSteps}))::int`,
        totalCompleted: sql<number>`count(case when jsonb_array_length(${userProgress.completedSteps}) = (
          select count(*) from ${steps} s 
          join ${flowBoxes} fb on s.flow_box_id = fb.id 
          where fb.guide_id = ${userProgress.guideId}
        ) then 1 end)::int`
      })
      .from(userProgress)
      .groupBy(userProgress.guideId);

    // Combine the data
    const metrics = guidesWithMetrics.map(guide => {
      const stepData = stepCounts.find(sc => sc.guideId === guide.guideId);
      const progressData = progressMetrics.find(pm => pm.guideId === guide.guideId);
      
      const totalSteps = stepData?.totalSteps || 0;
      const avgCompletedSteps = progressData?.avgCompletedSteps || 0;
      const avgCompletion = totalSteps > 0 ? Math.round((avgCompletedSteps / totalSteps) * 100) : 0;

      return {
        guideId: guide.guideId,
        guideName: guide.guideName,
        guideDescription: guide.guideDescription,
        totalUsers: progressData?.totalUsers || 0,
        totalSteps,
        avgCompletion,
        totalCompleted: progressData?.totalCompleted || 0
      };
    });

    return metrics;
  }

  // Custom domain operations
  async createCustomDomainMapping(mapping: InsertCustomDomainMapping): Promise<CustomDomainMapping> {
    const [newMapping] = await db.insert(customDomainMappings).values(mapping).returning();
    return newMapping;
  }

  async getCustomDomainMappings(projectId?: number): Promise<CustomDomainMapping[]> {
    if (projectId) {
      return await db
        .select()
        .from(customDomainMappings)
        .where(eq(customDomainMappings.projectId, projectId))
        .orderBy(desc(customDomainMappings.createdAt));
    }
    return await db
      .select()
      .from(customDomainMappings)
      .orderBy(desc(customDomainMappings.createdAt));
  }

  async getCustomDomainMapping(id: number): Promise<CustomDomainMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(customDomainMappings)
      .where(eq(customDomainMappings.id, id));
    return mapping;
  }

  async getCustomDomainMappingByDomain(domain: string, pathPrefix: string = "/"): Promise<CustomDomainMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(customDomainMappings)
      .where(and(
        eq(customDomainMappings.domain, domain),
        eq(customDomainMappings.pathPrefix, pathPrefix),
        eq(customDomainMappings.isActive, true)
      ));
    return mapping;
  }

  async updateCustomDomainMapping(id: number, updates: Partial<InsertCustomDomainMapping>): Promise<CustomDomainMapping | undefined> {
    const [updatedMapping] = await db
      .update(customDomainMappings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customDomainMappings.id, id))
      .returning();
    return updatedMapping;
  }

  async deleteCustomDomainMapping(id: number): Promise<boolean> {
    const result = await db
      .delete(customDomainMappings)
      .where(eq(customDomainMappings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPublicGuidesByProject(projectId: number): Promise<Guide[]> {
    return await db
      .select()
      .from(guides)
      .where(and(
        eq(guides.projectId, projectId),
        eq(guides.isActive, true),
        eq(guides.isPublic, true)
      ))
      .orderBy(desc(guides.createdAt));
  }

  async getPublicGuideBySlug(slug: string, projectId: number): Promise<Guide | undefined> {
    const [guide] = await db
      .select()
      .from(guides)
      .where(and(
        eq(guides.slug, slug),
        eq(guides.projectId, projectId),
        eq(guides.isActive, true),
        eq(guides.isPublic, true)
      ));
    return guide;
  }
}

export const storage = new DatabaseStorage();
