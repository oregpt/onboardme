import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGuideSchema, insertFlowBoxSchema, insertStepSchema } from "@shared/schema";
import { AIService, KnowledgeContext, type AIProvider, type ConversationContext } from "./aiService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project management routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user has access to this project
      const role = await storage.getUserProjectRole(userId, projectId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ ...project, userRole: role });
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user is admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const updatedProject = await storage.updateProject(projectId, req.body);
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Create new project
  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Project name is required" });
      }
      
      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      const project = await storage.createProject({
        name,
        description: description || '',
        slug,
        ownerId: userId,
      });
      
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user has access to this project
      const role = await storage.getUserProjectRole(userId, projectId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  // Add member to project
  app.post('/api/projects/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user is admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { email, role: memberRole } = req.body;
      if (!email || !memberRole) {
        return res.status(400).json({ message: "Email and role are required" });
      }
      
      // Find user by email
      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const member = await storage.addProjectMember(projectId, targetUser.id, memberRole);
      res.json(member);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  // Update member role
  app.put('/api/projects/:id/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);
      const userId = req.user.claims.sub;
      
      // Check if user is admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { role: newRole } = req.body;
      if (!newRole) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      const updatedMember = await storage.updateProjectMemberRole(memberId, newRole);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ message: "Failed to update member role" });
    }
  });

  // Remove member from project
  app.delete('/api/projects/:id/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);
      const userId = req.user.claims.sub;
      
      // Check if user is admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.removeProjectMember(memberId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // Guide management routes
  app.get('/api/guides', async (req, res) => {
    try {
      const guides = await storage.getGuides();
      res.json(guides);
    } catch (error) {
      console.error("Error fetching guides:", error);
      res.status(500).json({ message: "Failed to fetch guides" });
    }
  });

  app.get('/api/guides/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const guide = await storage.getGuide(id);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      res.json(guide);
    } catch (error) {
      console.error("Error fetching guide:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  app.get('/api/guides/slug/:slug', async (req, res) => {
    try {
      const guide = await storage.getGuideBySlug(req.params.slug);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      res.json(guide);
    } catch (error) {
      console.error("Error fetching guide:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  app.post('/api/guides', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideData = insertGuideSchema.parse({ ...req.body, createdBy: userId });
      const guide = await storage.createGuide(guideData);
      res.json(guide);
    } catch (error) {
      console.error("Error creating guide:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid guide data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create guide" });
    }
  });

  app.put('/api/guides/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const guide = await storage.updateGuide(id, updates);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }
      res.json(guide);
    } catch (error) {
      console.error("Error updating guide:", error);
      res.status(500).json({ message: "Failed to update guide" });
    }
  });

  app.delete('/api/guides/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGuide(id);
      if (!success) {
        return res.status(404).json({ message: "Guide not found" });
      }
      res.json({ message: "Guide deleted successfully" });
    } catch (error) {
      console.error("Error deleting guide:", error);
      res.status(500).json({ message: "Failed to delete guide" });
    }
  });

  // Flow box routes
  app.get('/api/guides/:guideId/flowboxes', async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const flowBoxes = await storage.getFlowBoxesByGuide(guideId);
      res.json(flowBoxes);
    } catch (error) {
      console.error("Error fetching flow boxes:", error);
      res.status(500).json({ message: "Failed to fetch flow boxes" });
    }
  });

  app.post('/api/guides/:guideId/flowboxes', isAuthenticated, async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const flowBoxData = insertFlowBoxSchema.parse({ ...req.body, guideId });
      const flowBox = await storage.createFlowBox(flowBoxData);
      res.json(flowBox);
    } catch (error) {
      console.error("Error creating flow box:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flow box data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create flow box" });
    }
  });

  app.put('/api/flowboxes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const flowBox = await storage.updateFlowBox(id, updates);
      if (!flowBox) {
        return res.status(404).json({ message: "Flow box not found" });
      }
      res.json(flowBox);
    } catch (error) {
      console.error("Error updating flow box:", error);
      res.status(500).json({ message: "Failed to update flow box" });
    }
  });

  app.delete('/api/flowboxes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFlowBox(id);
      if (!success) {
        return res.status(404).json({ message: "Flow box not found" });
      }
      res.json({ message: "Flow box deleted successfully" });
    } catch (error) {
      console.error("Error deleting flow box:", error);
      res.status(500).json({ message: "Failed to delete flow box" });
    }
  });

  // Step routes
  app.get('/api/flowboxes/:flowBoxId/steps', async (req, res) => {
    try {
      const flowBoxId = parseInt(req.params.flowBoxId);
      const steps = await storage.getStepsByFlowBox(flowBoxId);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching steps:", error);
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  app.get('/api/guides/:guideId/steps', async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const steps = await storage.getStepsByGuide(guideId);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching steps:", error);
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  app.post('/api/flowboxes/:flowBoxId/steps', isAuthenticated, async (req, res) => {
    try {
      const flowBoxId = parseInt(req.params.flowBoxId);
      const stepData = insertStepSchema.parse({ ...req.body, flowBoxId });
      const step = await storage.createStep(stepData);
      res.json(step);
    } catch (error) {
      console.error("Error creating step:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid step data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create step" });
    }
  });

  app.put('/api/steps/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const step = await storage.updateStep(id, updates);
      if (!step) {
        return res.status(404).json({ message: "Step not found" });
      }
      res.json(step);
    } catch (error) {
      console.error("Error updating step:", error);
      res.status(500).json({ message: "Failed to update step" });
    }
  });

  app.delete('/api/steps/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStep(id);
      if (!success) {
        return res.status(404).json({ message: "Step not found" });
      }
      res.json({ message: "Step deleted successfully" });
    } catch (error) {
      console.error("Error deleting step:", error);
      res.status(500).json({ message: "Failed to delete step" });
    }
  });

  // Progress tracking routes
  app.get('/api/guides/:guideId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.guideId);
      const progress = await storage.getUserProgress(userId, guideId);
      res.json(progress || { completedSteps: [], completedFlowBoxes: [] });
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/guides/:guideId/progress/steps/:stepId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.guideId);
      const stepId = parseInt(req.params.stepId);
      
      await storage.markStepComplete(userId, guideId, stepId);
      res.json({ message: "Step marked as complete" });
    } catch (error) {
      console.error("Error marking step complete:", error);
      res.status(500).json({ message: "Failed to mark step complete" });
    }
  });

  app.post('/api/guides/:guideId/progress/flowboxes/:flowBoxId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.guideId);
      const flowBoxId = parseInt(req.params.flowBoxId);
      
      await storage.markFlowBoxComplete(userId, guideId, flowBoxId);
      res.json({ message: "Flow box marked as complete" });
    } catch (error) {
      console.error("Error marking flow box complete:", error);
      res.status(500).json({ message: "Failed to mark flow box complete" });
    }
  });

  app.delete('/api/guides/:guideId/progress/steps/:stepId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.guideId);
      const stepId = parseInt(req.params.stepId);
      
      await storage.unmarkStepComplete(userId, guideId, stepId);
      res.json({ message: "Step unmarked as complete" });
    } catch (error) {
      console.error("Error unmarking step complete:", error);
      res.status(500).json({ message: "Failed to unmark step complete" });
    }
  });

  app.delete('/api/guides/:guideId/progress/flowboxes/:flowBoxId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const guideId = parseInt(req.params.guideId);
      const flowBoxId = parseInt(req.params.flowBoxId);
      
      await storage.unmarkFlowBoxComplete(userId, guideId, flowBoxId);
      res.json({ message: "Flow box unmarked as complete" });
    } catch (error) {
      console.error("Error unmarking flow box complete:", error);
      res.status(500).json({ message: "Failed to unmark flow box complete" });
    }
  });

  // Step comment routes
  app.get('/api/steps/:stepId/comments', async (req, res) => {
    try {
      const stepId = parseInt(req.params.stepId);
      const comments = await storage.getStepComments(stepId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching step comments:", error);
      res.status(500).json({ message: "Failed to fetch step comments" });
    }
  });

  app.post('/api/steps/:stepId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const stepId = parseInt(req.params.stepId);
      const userId = req.user.claims.sub;
      const { content, isCertified = true } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const comment = await storage.createStepComment({
        stepId,
        userId,
        content: content.trim(),
        isCertified,
        isHelpful: true,
      });

      res.json(comment);
    } catch (error) {
      console.error("Error creating step comment:", error);
      res.status(500).json({ message: "Failed to create step comment" });
    }
  });

  app.put('/api/comments/:commentId', isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const userId = req.user.claims.sub;
      const { content } = req.body;

      // Note: In a full implementation, you'd check if the user owns this comment
      const updatedComment = await storage.updateStepComment(commentId, {
        content: content.trim(),
        updatedAt: new Date(),
      });

      if (!updatedComment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json(updatedComment);
    } catch (error) {
      console.error("Error updating step comment:", error);
      res.status(500).json({ message: "Failed to update step comment" });
    }
  });

  app.delete('/api/comments/:commentId', isAuthenticated, async (req: any, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const userId = req.user.claims.sub;

      // Note: In a full implementation, you'd check if the user owns this comment
      const deleted = await storage.deleteStepComment(commentId);

      if (!deleted) {
        return res.status(404).json({ message: "Comment not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting step comment:", error);
      res.status(500).json({ message: "Failed to delete step comment" });
    }
  });

  // Q&A routes
  app.get('/api/guides/:guideId/qa', async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const conversations = await storage.getQAByGuide(guideId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching Q&A:", error);
      res.status(500).json({ message: "Failed to fetch Q&A" });
    }
  });

  app.get('/api/steps/:stepId/qa', async (req, res) => {
    try {
      const stepId = parseInt(req.params.stepId);
      const conversations = await storage.getQAByStep(stepId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching Q&A:", error);
      res.status(500).json({ message: "Failed to fetch Q&A" });
    }
  });

  // Knowledge base routes
  app.get('/api/guides/:guideId/knowledge', async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const knowledge = await storage.getKnowledgeByGuide(guideId);
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  app.post('/api/guides/:guideId/knowledge', isAuthenticated, async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const entryData = { ...req.body, guideId };
      const entry = await storage.createKnowledgeEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating knowledge entry:", error);
      res.status(500).json({ message: "Failed to create knowledge entry" });
    }
  });

  // AI Chat endpoint
  app.post('/api/ai/chat', isAuthenticated, async (req, res) => {
    try {
      const { message, provider, guideId, flowBoxId, stepId } = req.body;
      
      if (!message || !guideId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get all required data for context
      const guide = await storage.getGuide(guideId);
      const allSteps = await storage.getStepsByGuide(guideId);

      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      // Handle "All flows" selection or specific flow/step
      let flowBox = null;
      let currentStep = null;

      if (flowBoxId && stepId) {
        flowBox = await storage.getFlowBox(flowBoxId);
        currentStep = await storage.getStep(stepId);
        
        if (!flowBox || !currentStep) {
          return res.status(404).json({ message: "Flow box or step not found" });
        }
      }

      // Categorize attachments from all steps
      const allAttachments = allSteps.flatMap(step => 
        (step.attachments as any[]) || []
      );
      
      const generalFiles = allAttachments.filter(att => att.category === 'general');
      const faqFiles = allAttachments.filter(att => att.category === 'faq');
      const otherHelpFiles = allAttachments.filter(att => att.category === 'other-help');

      // Build knowledge context
      const context: KnowledgeContext = {
        guide,
        flowBox,
        currentStep,
        allSteps,
        generalFiles,
        faqFiles,
        otherHelpFiles,
        agentInstructions: flowBox ? (flowBox as any).agentInstructions : null
      };

      // Get project information for conversation history
      const project = await storage.getProject(guide.projectId!);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Build conversation context
      const conversationId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const conversationContext: ConversationContext = {
        project,
        conversationId,
        userId: userId,
        storage
      };

      // Generate AI response
      const chatMessages = [{ role: 'user' as const, content: message }];
      const response = await AIService.generateResponse(
        chatMessages,
        context,
        provider as AIProvider,
        conversationContext
      );

      res.json(response);
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ message: "Failed to generate AI response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
