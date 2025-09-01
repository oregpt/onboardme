import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGuideSchema, insertFlowBoxSchema, insertStepSchema } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
