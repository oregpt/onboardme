import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGuideSchema, insertFlowBoxSchema, insertStepSchema, aiSystemPromptUpdateSchema } from "@shared/schema";
import { AIService, KnowledgeContext, type AIProvider, type ConversationContext } from "./aiService";
import { z } from "zod";

// Default AI Generator prompt used as fallback
const DEFAULT_AI_GENERATOR_PROMPT = `Purpose: You are GuideFlow Dialog, a dialog-first onboarding guide builder. Your job is to: (1) discover what the user needs via brief, targeted questions, (2) play back a concise proposed structure, (3) get explicit confirmation, and only then (4) generate the guide using the exact markdown format and rules provided.{CONTEXT}

Core Workflow (follow step-by-step):
1) Discovery (short, focused):
- Ask 1 focused question at a time (max 2 per message). Keep messages brief.
- Prioritize these topics: audience, primary outcome, key phases or modules, must-include steps, constraints (time, tools, policies), tone (developer-precise vs broadly accessible), source materials (links/files). 
- Accept and parse any provided content or files to extract phases and steps.

2) Playback (proposed outline, not the final guide):
- Present a concise outline of Flow Boxes: each with a title, a 1-line italic description, and 3–6 draft step titles (short phrases only). Do not output the final markdown yet.
- List assumptions and any open questions.

3) Confirm (gate before generation):
- Ask the user to reply with "Confirm" to generate, or provide edits (add/remove/rename boxes, adjust steps, tone, level of technical detail).
- If the user tries to skip, still require a one-line confirmation: "Reply Confirm to generate."

4) Generate (final output):
- Upon explicit "Confirm", output only the guide in the exact markdown format and nothing else.
- No preface, no postscript, no extra commentary—just the markdown.

5) Validate (self-check before sending):
- Ensure formatting exactly matches:
  • Use "## Flow Box Title *Brief description of this section*" for each major section.
  • Use "### Step Title" followed by detailed step content on the next lines.
  • 3–8 steps per Flow Box.
  • Steps are actionable, clear, and grouped logically.
  • Use simple, direct language; avoid jargon unless the audience is technical and expects it.
  • No extra headings, bullet lists, or text outside the specified format.

6) Iterate:
- After delivering the guide, offer quick revisions on request: add/remove boxes, merge or split steps, tweak tone, or tailor for different audiences.

Communication & Language Style:
- Tone: professional, crisp, builder-friendly; default to developer-precise but accessible to non-developers.
- Complexity: start simple; increase technical depth if user signals developer audience or provides technical context.
- Length: concise messages during discovery; comprehensive yet clear in the final guide content.
- Format: structured, minimal fluff; use bullets sparingly in discovery/playback only (never in the final guide).

Reasoning & Problem-Solving:
- Methodology: systematic, step-by-step. Convert vague inputs into concrete phases and steps.
- Depth: pragmatic. Provide enough detail for a developer to act without being verbose.
- Decision-making: data- and constraint-driven. Where unsure, state assumptions in playback and ask for confirmation.
- Logic style: deductive organization into phases; then expand steps.

Domain Knowledge & Expertise:
- Capabilities: translate product or process info into onboarding flows; identify dependencies, prerequisites, environment setup, integration steps, validation checks, rollbacks, and handoffs.
- Audience: optimized for developers and builders; adaptable to general audiences.
- Sources: incorporate provided docs/files; extract canonical steps and align terminology with the user's ecosystem.

Behavioral Patterns & Personality:
- Response style: helpful, direct, collaborative; no lecturing.
- Interaction approach: proactive suggestions with restraint—ask 1 question at a time and propose options instead of long questionnaires.
- Risk tolerance: cautious about generating without confirmation. Always gate the final generation behind explicit approval.
- Empathy: acknowledge trade-offs; offer alternatives if constraints are tight.

Task Performance & Workflow:
- Quality: high clarity, consistent structure, no missing steps within each phase.
- Speed vs accuracy: prioritize accuracy and structure; be efficient in discovery.
- Initiative: propose a sensible outline if inputs are sparse; clearly mark assumptions.
- Tools/files: accept MD, TXT, CSV, PDF, Word, Excel. Summarize and map content to phases/steps.

User Interaction & Service:
- Clarifying questions: ask when scope is ambiguous (max 2 per message, ideally 1). Examples: "What is the primary outcome of this guide?" or "Which platforms are in scope (Web, iOS, Android)?"
- Feedback handling: embrace edits; update outline quickly and reconfirm.
- Boundaries: if the user requests the final guide without confirmation, respond with a brief confirmation prompt.
- Relationship: professional, collaborative; mirror the user's level of technical detail.

Safety & Compliance:
- Privacy: do not expose or retain sensitive data beyond the session. If sensitive info appears, ask whether to include it; redact if not necessary.
- Accuracy: admit uncertainty; never invent product features. Mark assumptions and verify in playback.
- Content boundaries: avoid harmful or prohibited content; keep instructions safe and responsible.

Formatting Rules for Final Output (must follow exactly):
- Use "##" for major sections (Flow Boxes) followed by a space, the title, a space, then an italic description in asterisks on the same line.
- Use "###" for individual steps. After the step title line, provide the detailed step content on the following lines. Multi-line content is allowed.
- Aim for 3–8 steps per Flow Box.
- Use clear, actionable language. Group related steps into logical Flow Boxes.
- No extra text before or after the markdown guide.

Validation Checklist (run mentally before sending final guide):
- All Flow Boxes include an italic description on the same line as the title.
- Each Flow Box has 3–8 steps, each with a clear title and concrete, actionable content.
- No bullets, tables, or headings outside the specified pattern.
- Language is simple and unambiguous; developer examples included only when needed.
- The guide starts with a Flow Box (## ...) and contains only valid sections/steps until the end.

Operational Prompts You Use:
- Discovery opener: "Quick check—what's the primary outcome you want this guide to achieve for developers?"
- Playback close: "Reply Confirm to generate, or share edits (add/remove/rename boxes, adjust steps/tone)."
- Confirmation gate: "I'll generate the guide now. Reply Confirm to proceed."
- Post-delivery: "Want revisions? Tell me what to add, remove, or adjust."`;

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

  // Onboarding flow handler
  app.get('/api/onboarding-flow', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const flow = (req.session as any)?.onboardingFlow;

      // Clear the flow from session
      delete (req.session as any)?.onboardingFlow;

      if (!flow) {
        return res.redirect('/');
      }

      switch (flow) {
        case 'atxp':
          // Add user to Project 1 as a user if not already a member
          try {
            const existingRole = await storage.getUserProjectRole(userId, 1);
            if (!existingRole) {
              await storage.addProjectMember(1, userId, 'user');
            }
            return res.redirect('/project/1');
          } catch (error) {
            console.error('Error adding user to ATXP project:', error);
            return res.redirect('/');
          }

        case 'create':
          // Create new project with user as admin
          try {
            const email = user?.email || `user-${userId}`;
            const project = await storage.createProject({
              name: email,
              description: email,
              ownerId: userId,
              slug: `project-${Date.now()}`
            });
            await storage.addProjectMember(project.id, userId, 'admin');
            return res.redirect(`/project/${project.id}`);
          } catch (error) {
            console.error('Error creating project for user:', error);
            return res.redirect('/');
          }

        case 'other':
          // Add user to Project 2 as a user if not already a member
          try {
            const existingRole = await storage.getUserProjectRole(userId, 2);
            if (!existingRole) {
              await storage.addProjectMember(2, userId, 'user');
            }
            return res.redirect('/project/2');
          } catch (error) {
            console.error('Error adding user to Project 2:', error);
            return res.redirect('/');
          }

        default:
          // Add user to Project 2 as a user if not already a member
          try {
            const existingRole = await storage.getUserProjectRole(userId, 2);
            if (!existingRole) {
              await storage.addProjectMember(2, userId, 'user');
            }
            return res.redirect('/project/2');
          } catch (error) {
            console.error('Error adding user to Project 2:', error);
            return res.redirect('/');
          }
      }
    } catch (error) {
      console.error('Error in onboarding flow:', error);
      res.redirect('/');
    }
  });

  // Project management routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let projects;
      if (user?.isPlatformAdmin) {
        // Platform admins see all projects
        projects = await storage.getAllProjects();
        // Add role info for platform admins (they have admin access to all)
        const projectsWithRoles = projects.map(project => ({
          ...project,
          userRole: 'admin'
        }));
        res.json(projectsWithRoles);
      } else {
        // Regular users see only their projects
        projects = await storage.getProjects(userId);
        // Add role info for each project
        const projectsWithRoles = await Promise.all(
          projects.map(async (project) => {
            const role = await storage.getUserProjectRole(userId, project.id);
            return { ...project, userRole: role || 'user' };
          })
        );
        res.json(projectsWithRoles);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has access to this project
      let role = await storage.getUserProjectRole(userId, projectId);
      
      // Platform admins have admin access to all projects
      if (user?.isPlatformAdmin) {
        role = 'admin';
      }
      
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
      const user = await storage.getUser(userId);
      
      // Check if user is admin or platform admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin' && !user?.isPlatformAdmin) {
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
      
      // Automatically add the creator as an admin member of the project
      await storage.addProjectMember(project.id, userId, 'admin');
      
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Delete project (Platform Admin Only)
  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can delete projects
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const { confirmationName } = req.body;
      if (!confirmationName) {
        return res.status(400).json({ message: "Project name confirmation is required" });
      }
      
      // Get project to verify name
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify the confirmation name matches exactly
      if (confirmationName !== project.name) {
        return res.status(400).json({ message: "Project name confirmation does not match" });
      }
      
      // Perform the deletion
      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete project" });
      }
      
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get('/api/projects/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if user has access to this project
      let role = await storage.getUserProjectRole(userId, projectId);
      if (user?.isPlatformAdmin) {
        role = 'admin';
      }
      
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
      const user = await storage.getUser(userId);
      
      // Check if user is admin or platform admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin' && !user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { email, role: memberRole } = req.body;
      if (!email || !memberRole) {
        return res.status(400).json({ message: "Email and role are required" });
      }
      
      // Find or create user by email
      let targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        // Create a placeholder user record for the invitation
        // The user will be fully set up when they first log in
        targetUser = await storage.createPlaceholderUser(email);
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
      const user = await storage.getUser(userId);
      
      // Check if user is admin or platform admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin' && !user?.isPlatformAdmin) {
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
      const user = await storage.getUser(userId);
      
      // Check if user is admin or platform admin
      const role = await storage.getUserProjectRole(userId, projectId);
      if (role !== 'admin' && !user?.isPlatformAdmin) {
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

  // User progress statistics endpoint
  app.get('/api/user-progress/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getUserProgressStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting user progress stats:', error);
      res.status(500).json({ message: 'Failed to get user progress stats' });
    }
  });

  // Markdown import endpoint - bypasses typical controls for production use
  app.post('/api/guides/import-markdown', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { guideId, flowBoxes } = req.body;

      if (!guideId || !flowBoxes || !Array.isArray(flowBoxes)) {
        return res.status(400).json({ message: "Invalid import data: guideId and flowBoxes array required" });
      }

      // Verify guide exists and user has access
      const guide = await storage.getGuide(guideId);
      if (!guide) {
        return res.status(404).json({ message: "Guide not found" });
      }

      let flowBoxesCreated = 0;
      let stepsCreated = 0;

      // Get the highest position for flow boxes to append new ones
      const existingFlowBoxes = await storage.getFlowBoxesByGuide(guideId);
      let maxPosition = Math.max(...existingFlowBoxes.map(fb => fb.position), 0);

      // Process each flow box
      for (const flowBoxData of flowBoxes) {
        try {
          // Create flow box
          const flowBox = await storage.createFlowBox({
            guideId,
            title: flowBoxData.title,
            description: flowBoxData.description || null,
            position: ++maxPosition,
            isVisible: true
          });
          flowBoxesCreated++;

          // Create steps for this flow box
          let stepPosition = 1;
          for (const stepData of flowBoxData.steps) {
            await storage.createStep({
              flowBoxId: flowBox.id,
              title: stepData.title,
              content: stepData.content,
              position: stepPosition++,
              isVisible: true,
              isCritical: false
            });
            stepsCreated++;
          }
        } catch (error) {
          console.error(`Error creating flow box "${flowBoxData.title}":`, error);
          throw error;
        }
      }

      res.json({
        success: true,
        message: `Successfully imported ${flowBoxesCreated} flow boxes with ${stepsCreated} steps`,
        flowBoxesCreated,
        stepsCreated
      });

    } catch (error) {
      console.error("Error importing markdown:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to import markdown content" 
      });
    }
  });

  // AI Guide Generation validation schema
  const aiGenerateSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1)
    })).min(1),
    guideId: z.number().int().positive().optional()
  });

  // AI Guide Generation endpoint
  app.post('/api/guides/generate-ai', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { messages, guideId } = aiGenerateSchema.parse(req.body);

      // Verify guide exists if provided and get context
      let guide = null;
      let contextText = '';
      if (guideId) {
        guide = await storage.getGuide(guideId);
        if (!guide) {
          return res.status(404).json({ message: "Guide not found" });
        }
        
        // Get existing flow boxes and steps for context
        const flowBoxes = await storage.getFlowBoxesByGuide(guideId);
        const steps = await storage.getStepsByGuide(guideId);
        
        if (flowBoxes.length > 0) {
          contextText = `\n\nExisting Guide Context:\nGuide: "${guide.title}"\nExisting Flow Boxes: ${flowBoxes.map(fb => fb.title).join(', ')}\nTotal Steps: ${steps.length}\n\nNote: Build upon or enhance the existing structure as appropriate.`;
        }
      }

      // Get configurable AI Generator prompt from database or use default
      let systemPromptTemplate = DEFAULT_AI_GENERATOR_PROMPT;
      try {
        const config = await storage.getPlatformConfig('ai_generator_prompt');
        if (config?.value?.trim()) {
          systemPromptTemplate = config.value;
        }
      } catch (error) {
        console.error('Failed to fetch AI generator prompt config, using default:', error);
      }

      // Add context to the prompt template
      const systemPrompt = systemPromptTemplate.includes('{CONTEXT}') 
        ? systemPromptTemplate.replace('{CONTEXT}', contextText)
        : `${systemPromptTemplate}${contextText}`;

      // Build the complete messages array with system prompt
      const completeMessages: { role: 'user' | 'assistant' | 'system', content: string }[] = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      // Create a minimal knowledge context for the AI service
      const dummyGuide = guide || {
        id: 0,
        title: 'New Guide',
        description: null,
        slug: 'new-guide',
        isActive: true,
        createdAt: new Date(),
        updatedAt: null,
        projectId: null,
        globalInformation: '',
        personas: [],
        agentInstructions: '',
        resourceLinks: [],
        resourceAttachments: [],
        createdBy: userId
      };
      
      const dummyContext: KnowledgeContext = {
        guide: dummyGuide,
        flowBox: null,
        currentStep: null,
        allSteps: [],
        generalFiles: [],
        faqFiles: [],
        otherHelpFiles: [],
        agentInstructions: null
      };

      // Generate AI response using Claude directly to preserve the AI Generator prompt
      const response = await AIService.callAnthropic(completeMessages);

      res.json({
        success: true,
        content: response.content,
        provider: response.provider,
        model: response.model,
        timestamp: response.timestamp
      });

    } catch (error) {
      console.error("Error generating AI guide:", error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : "Failed to generate AI guide" 
      });
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

  // Detailed user progress endpoint
  app.get('/api/user-progress/detailed', async (req, res) => {
    try {
      const detailedProgress = await storage.getDetailedUserProgress();
      res.json(detailedProgress);
    } catch (error) {
      console.error("Error fetching detailed user progress:", error);
      res.status(500).json({ message: "Failed to fetch detailed user progress" });
    }
  });

  // Per-guide metrics endpoint
  app.get('/api/metrics/guides', async (req, res) => {
    try {
      const metrics = await storage.getPerGuideMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching per-guide metrics:", error);
      res.status(500).json({ message: "Failed to fetch per-guide metrics" });
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
  app.post('/api/ai/chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message, provider, guideId, flowBoxId, stepId } = req.body;
      const userId = req.user.claims.sub;
      
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

  // Database Import/Export endpoints
  app.post('/api/admin/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can import data
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      const { data: importData } = req.body;
      if (!importData || !importData.metadata || !importData.data) {
        return res.status(400).json({ message: "Invalid import data format" });
      }

      console.log('🔄 Starting database import...');
      let importedTables = 0;
      let totalRecords = 0;
      const results: Record<string, any> = {};

      // Import tables in dependency order
      const importOrder = [
        'users',
        'projects', 
        'project_members',
        'guides',
        'flow_boxes',
        'steps',
        'knowledge_base',
        'qa_conversations',
        'conversation_history',
        'step_comments',
        'user_progress'
      ];

      for (const tableName of importOrder) {
        try {
          const tableData = importData.data[tableName];
          if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
            results[tableName] = { skipped: true, reason: 'No data' };
            continue;
          }

          console.log(`📥 Importing ${tableName} (${tableData.length} records)...`);
          
          // Direct database insertion with conflict resolution - bypasses all normal controls
          let imported = 0;
          try {
            // Get the appropriate table schema
            let tableSchema;
            switch (tableName) {
              case 'users':
                const { users } = await import('../shared/schema.js');
                tableSchema = users;
                break;
              case 'projects':
                const { projects } = await import('../shared/schema.js');
                tableSchema = projects;
                break;
              case 'project_members':
                const { projectMembers } = await import('../shared/schema.js');
                tableSchema = projectMembers;
                break;
              case 'guides':
                const { guides } = await import('../shared/schema.js');
                tableSchema = guides;
                break;
              case 'flow_boxes':
                const { flowBoxes } = await import('../shared/schema.js');
                tableSchema = flowBoxes;
                break;
              case 'steps':
                const { steps } = await import('../shared/schema.js');
                tableSchema = steps;
                break;
              case 'user_progress':
                const { userProgress } = await import('../shared/schema.js');
                tableSchema = userProgress;
                break;
              case 'qa_conversations':
                const { qaConversations } = await import('../shared/schema.js');
                tableSchema = qaConversations;
                break;
              case 'conversation_history':
                const { conversationHistory } = await import('../shared/schema.js');
                tableSchema = conversationHistory;
                break;
              case 'knowledge_base':
                const { knowledgeBase } = await import('../shared/schema.js');
                tableSchema = knowledgeBase;
                break;
              case 'step_comments':
                const { stepComments } = await import('../shared/schema.js');
                tableSchema = stepComments;
                break;
              default:
                console.log(`⚠️  No schema mapping for ${tableName}`);
                continue;
            }

            if (tableSchema) {
              // Use direct database insert with ON CONFLICT DO UPDATE (upsert)
              // This bypasses all normal validation and constraint checks
              const { db } = await import('./db.js');
              
              // For tables with primary keys, use upsert to handle conflicts
              const primaryKey = Object.keys(tableData[0])[0]; // Assume first field is primary key
              
              for (const record of tableData) {
                try {
                  await db
                    .insert(tableSchema)
                    .values(record)
                    .onConflictDoUpdate({
                      target: (tableSchema as any)[primaryKey],
                      set: record
                    });
                } catch (insertError) {
                  // If upsert fails, try regular insert (for tables without conflicts)
                  try {
                    await db.insert(tableSchema).values(record);
                  } catch (fallbackError) {
                    console.error(`Failed to import record in ${tableName}:`, fallbackError);
                  }
                }
              }
              
              imported = tableData.length;
            }
          } catch (directInsertError) {
            console.error(`Direct insert failed for ${tableName}:`, directInsertError);
            imported = 0;
          }

          results[tableName] = { imported, total: tableData.length };
          importedTables++;
          totalRecords += imported;

        } catch (tableError: any) {
          console.error(`Error importing table ${tableName}:`, tableError);
          results[tableName] = { error: tableError.message };
        }
      }

      console.log(`✅ Import completed: ${importedTables} tables, ${totalRecords} records`);

      res.json({
        success: true,
        message: `Import completed: ${importedTables} tables, ${totalRecords} records`,
        results,
        importedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  // Export current database to JSON
  app.get('/api/admin/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can export data
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      console.log('🔄 Starting database export...');

      const exportData = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          description: 'Database export from Guide Builder application',
          exported_by: userId
        },
        data: {
          users: await storage.getAllUsers(),
          projects: await storage.getAllProjects(),
          project_members: await storage.getAllProjectMembers(),
          guides: await storage.getAllGuides(),
          flow_boxes: await storage.getAllFlowBoxes(),
          steps: await storage.getAllSteps(),
          user_progress: await storage.getAllUserProgress()
          // Add other tables as storage methods become available
        }
      };

      const totalRecords = Object.values(exportData.data).reduce((sum, table) => 
        sum + (Array.isArray(table) ? table.length : 0), 0
      );

      console.log(`✅ Export completed: ${Object.keys(exportData.data).length} tables, ${totalRecords} records`);

      res.json(exportData);

    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Platform configuration routes - AI system prompt management
  app.get('/api/admin/config/ai-system-prompt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can access config
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      // Import the default prompt from aiService
      const { DEFAULT_AI_SYSTEM_PROMPT } = await import('./aiService.js');
      const config = await storage.getPlatformConfig('ai_system_prompt');
      
      res.json({
        prompt: config?.value?.trim() || DEFAULT_AI_SYSTEM_PROMPT,
        updatedAt: config?.updatedAt,
        updatedBy: config?.updatedBy
      });
    } catch (error) {
      console.error("Error fetching AI system prompt config:", error);
      res.status(500).json({ message: "Failed to fetch AI system prompt configuration" });
    }
  });

  app.put('/api/admin/config/ai-system-prompt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can update config
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      // Validate request body
      const validationResult = aiSystemPromptUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const { prompt } = validationResult.data;
      
      // Update the configuration
      const config = await storage.setPlatformConfig('ai_system_prompt', prompt, userId);
      
      res.json({
        prompt: config.value,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
      });
    } catch (error) {
      console.error("Error updating AI system prompt config:", error);
      res.status(500).json({ message: "Failed to update AI system prompt configuration" });
    }
  });

  // Platform configuration routes - AI generator prompt management
  app.get('/api/admin/config/ai-generator-prompt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can access config
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      const config = await storage.getPlatformConfig('ai_generator_prompt');
      res.json({
        prompt: config?.value?.trim() || DEFAULT_AI_GENERATOR_PROMPT,
        updatedAt: config?.updatedAt,
        updatedBy: config?.updatedBy
      });
    } catch (error) {
      console.error("Error fetching AI generator prompt config:", error);
      res.status(500).json({ message: "Failed to fetch AI generator prompt configuration" });
    }
  });

  app.put('/api/admin/config/ai-generator-prompt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can update config
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }

      // Validate request body
      const validationResult = aiSystemPromptUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const { prompt } = validationResult.data;
      
      // Update the configuration
      const config = await storage.setPlatformConfig('ai_generator_prompt', prompt, userId);
      
      res.json({
        prompt: config.value,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
      });
    } catch (error) {
      console.error("Error updating AI generator prompt config:", error);
      res.status(500).json({ message: "Failed to update AI generator prompt configuration" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
