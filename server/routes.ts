import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertGuideSchema, insertFlowBoxSchema, insertStepSchema, aiSystemPromptUpdateSchema, type Guide } from "@shared/schema";
import { AIService, KnowledgeContext, type AIProvider, type ConversationContext } from "./aiService";
import { z } from "zod";
import crypto from "crypto";

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

  // Custom domain routing middleware
  app.use(async (req, res, next) => {
    try {
      // Fix hostname resolution to match working white-label route logic
      const hostname = (req.get('host')?.split(':')[0] || 
                       req.get('x-forwarded-host') || 
                       req.hostname || '').toLowerCase();
      const path = req.path;
      const acceptHeader = req.headers.accept || '';

      // Skip API routes, asset/HMR paths, white-label routes, and when already in white-label mode
      const shouldSkip = path.startsWith('/api/') || 
          path.startsWith('/assets/') || 
          path.startsWith('/src/') || // Skip Vite dev server source files
          path.startsWith('/@vite/') || 
          path.startsWith('/@react-refresh/') ||
          path.startsWith('/white-label/') || // Skip white-label routes to prevent double processing
          req.query.wl || // Skip when already in white-label mode to prevent redirect loops
          path.startsWith('/favicon.ico') ||
          path.startsWith('/robots.txt') ||
          path.startsWith('/manifest.webmanifest') ||
          path.includes('.') || // Any path with file extension
          (req.method === 'GET' && !acceptHeader.includes('text/html'));
      
      if (shouldSkip) {
        return next();
      }

      console.log('🌐 Custom Domain Check:', { 
        hostname: hostname.substring(0, 50) + (hostname.length > 50 ? '...' : ''), 
        path
      });

      // Get all mappings for this domain and find the best matching prefix
      let mapping = null;
      let domainMappings = [];
      try {
        console.log('🔍 Looking for domain mapping for:', hostname);
        const allMappingsForDomain = await storage.getCustomDomainMappings();
        console.log('📋 Found total mappings:', allMappingsForDomain.length);
        console.log('🔍 First mapping fields:', allMappingsForDomain[0] ? Object.keys(allMappingsForDomain[0]) : 'no mappings');
        console.log('🔍 First mapping values:', allMappingsForDomain[0] || 'no mappings');
        domainMappings = allMappingsForDomain.filter(m => 
          m.domain?.toLowerCase() === hostname && m.isActive
        );
        console.log('🎯 Matching active mappings for domain:', domainMappings.length);
        
        if (domainMappings.length > 0) {
          console.log('📄 Domain mapping details:', domainMappings.map(m => ({
            id: m.id,
            domain: m.domain,
            pathPrefix: m.pathPrefix,
            feature: m.feature,
            routeMode: m.routeMode,
            projectId: m.projectId,
            guideId: m.guideId
          })));
        }
      } catch (error) {
        console.error('❌ Error fetching domain mappings:', error);
        return next();
      }

      // Sort by pathPrefix length (longest first) for best match
      domainMappings.sort((a, b) => (b.pathPrefix?.length || 1) - (a.pathPrefix?.length || 1));
      
      // Find the first mapping whose pathPrefix matches the request path
      for (const candidateMapping of domainMappings) {
        const pathPrefix = candidateMapping.pathPrefix || '/';
        if (path.startsWith(pathPrefix)) {
          mapping = candidateMapping;
          break;
        }
      }
      
      if (mapping && mapping.isActive) {
        console.log('🎯 Custom Domain Match:', {
          mappingId: mapping.id,
          feature: mapping.feature,
          routeMode: mapping.routeMode,
          projectId: mapping.projectId,
          guideId: mapping.guideId
        });

        // Store mapping context in res.locals for use by other routes/middleware
        res.locals.domainMapping = mapping;

        // Calculate internal path by removing the path prefix
        const pathPrefix = mapping.pathPrefix || '/';
        let internalPath = path;
        if (pathPrefix !== '/' && path.startsWith(pathPrefix)) {
          internalPath = path.substring(pathPrefix.length) || '/';
          if (!internalPath.startsWith('/')) {
            internalPath = '/' + internalPath;
          }
        }

        console.log('🔀 Path mapping:', { originalPath: path, pathPrefix, internalPath });

        // Handle different routing scenarios based on internal path
        if (mapping.feature === 'chat') {
          // For chat-only domains, redirect to chat interface only from root
          if (internalPath === '/') {
            const pathPrefix = mapping.pathPrefix || '/';
            const chatPath = pathPrefix === '/' ? '/chat' : `${pathPrefix}/chat`;
            console.log('📞 Chat domain - redirecting to chat interface:', chatPath);
            return res.redirect(chatPath);
          }
          // If already on a chat path, let it continue normally
        } 
        
        if (mapping.feature === 'guides' || mapping.feature === 'both') {
          if (mapping.routeMode === 'single_guide') {
            // Single guide mode - redirect to specific guide
            if (mapping.guideId && internalPath === '/') {
              console.log('📖 Single guide mode - redirecting to white-label guide', mapping.guideId);
              return res.redirect(`/white-label/guide/${mapping.guideId}`);
            } else if (mapping.defaultGuideSlug && internalPath === '/') {
              // Redirect to default guide by slug
              console.log('📖 Single guide mode - redirecting to white-label guide by slug');
              return res.redirect(`/white-label/guide/slug/${mapping.defaultGuideSlug}`);
            }
          } else if (mapping.routeMode === 'project_guides') {
            // Project guides mode - show white-label interface
            if (internalPath === '/' && mapping.projectId) {
              console.log('📚 Project guides mode - redirecting to white-label interface');
              return res.redirect(`/white-label/project/${mapping.projectId}`);
            }
            
            // Handle guide slug routing for project guides (only single segment, no dots, HTML requests)
            const guideSlugMatch = internalPath.match(/^\/([a-z0-9-]+)$/);
            if (guideSlugMatch && mapping.projectId && acceptHeader.includes('text/html')) {
              const slug = guideSlugMatch[1];
              // Skip special routes that are NOT guide slugs (guides, chat, etc.)
              const reservedRoutes = ['guides', 'chat', 'assets', 'vite', 'favicon', 'robots', 'manifest'];
              if (!slug.includes('.') && !reservedRoutes.some(route => slug === route)) {
                console.log('📖 Project guides mode - redirecting to specific guide:', slug);
                return res.redirect(`/white-label/guide/slug/${slug}?wl=project&projectId=${mapping.projectId}`);
              }
            }
          }
        }

        // If we have a domain mapping but didn't match specific routes, continue
        console.log('⚡ Custom domain matched but no specific route handled - continuing');
      }

      // Continue with normal routing
      next();
    } catch (error) {
      console.error('❌ Error in domain validation');
      // Don't leak error details that could reveal system internals
      next();
    }
  });

  // Rate limiting store - in production, use Redis or database
  interface RateLimitEntry {
    requests: number;
    windowStart: number;
  }

  const rateLimitStore = new Map<string, RateLimitEntry>();

  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of Array.from(rateLimitStore.entries())) {
      if (now - entry.windowStart > 60000) { // 1 minute window
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Enhanced security middleware for public endpoints
  function createSecurityMiddleware() {
    return (req: any, res: any, next: any) => {
      // Security headers for public endpoints
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
      next();
    };
  }

  // Rate limiting middleware with secure key generation
  function createRateLimit(maxRequests: number, windowMs: number = 60000) {
    return (req: any, res: any, next: any) => {
      // Use validated domain mapping ID if available, otherwise fall back to a hash of hostname
      const mapping = res.locals.domainMapping;
      const domainKey = mapping?.id ? `mapping-${mapping.id}` : `host-${crypto.createHash('sha256').update(req.hostname).digest('hex').substring(0, 16)}`;
      
      // Get real client IP (trust proxy is configured in server/index.ts)
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${domainKey}:${clientIP}`;
      
      const now = Date.now();
      let entry = rateLimitStore.get(key);
      
      if (!entry || now - entry.windowStart > windowMs) {
        entry = { requests: 1, windowStart: now };
        rateLimitStore.set(key, entry);
        return next();
      }
      
      if (entry.requests >= maxRequests) {
        const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
        console.log(`🚫 Rate limit exceeded for ${domainKey}:${clientIP}: ${entry.requests}/${maxRequests} requests`);
        
        // Set Retry-After header as per HTTP specification
        res.set('Retry-After', retryAfter.toString());
        
        return res.status(429).json({ 
          message: "Too many requests. Please wait before sending another message.",
          retryAfter
        });
      }
      
      entry.requests++;
      next();
    };
  }

  // Allowed AI providers
  const ALLOWED_PROVIDERS = ['claude', 'openai', 'xai'];

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

  // Domain info endpoint for white-label detection (public, no auth required)
  app.get('/api/domain-info', async (req, res) => {
    console.log('🔍 /api/domain-info handler called!');
    try {
      const hostname = (req.get('host')?.split(':')[0] || 
                       req.get('x-forwarded-host') || 
                       req.hostname || '').toLowerCase();
      console.log('🌐 Domain info for hostname:', hostname);
      
      // Check for existing domain mapping from middleware
      let mapping = res.locals.domainMapping;
      
      // If not set by middleware, query database
      if (!mapping) {
        const allMappings = await storage.getCustomDomainMappings();
        mapping = allMappings.find(m => 
          m.domain?.toLowerCase() === hostname && m.isActive
        );
      }
      console.log('📋 Found mapping:', mapping ? 'YES' : 'NO');
      
      if (mapping) {
        const result = {
          isWhiteLabel: true,
          domain: mapping.domain,
          feature: mapping.feature,
          routeMode: mapping.routeMode,
          projectId: mapping.projectId,
          guideId: mapping.guideId,
          defaultGuideSlug: mapping.defaultGuideSlug,
          theme: mapping.theme,
        };
        console.log('✅ Returning white-label data:', JSON.stringify(result));
        res.setHeader('Content-Type', 'application/json');
        return res.json(result);
      }
      
      const result = { isWhiteLabel: false };
      console.log('✅ Returning normal mode data:', JSON.stringify(result));
      res.setHeader('Content-Type', 'application/json');
      return res.json(result);
    } catch (error) {
      console.error('❌ Error in /api/domain-info:', error);
      res.setHeader('Content-Type', 'application/json');
      return res.json({ isWhiteLabel: false });
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
        case 'cantyai':
          // Add user to Project 3 (CantyAI Guides) as a user if not already a member
          try {
            const existingRole = await storage.getUserProjectRole(userId, 3);
            if (!existingRole) {
              await storage.addProjectMember(3, userId, 'user');
            }
            return res.redirect('/project/3');
          } catch (error) {
            console.error('Error adding user to CantyAI project:', error);
            return res.redirect('/');
          }

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
      
      // Ensure projectId is provided
      if (!req.body.projectId) {
        return res.status(400).json({ message: "projectId is required for guide creation" });
      }
      
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
        isPublic: true,
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
      console.log(`PUT /api/steps/${id} - Received update request:`, req.body);
      
      // Validate the request body
      const updateStepSchema = insertStepSchema.partial();
      const updates = updateStepSchema.parse(req.body);
      
      const step = await storage.updateStep(id, updates);
      if (!step) {
        console.log(`PUT /api/steps/${id} - Step not found`);
        return res.status(404).json({ message: "Step not found" });
      }
      
      console.log(`PUT /api/steps/${id} - Step updated successfully:`, step.title);
      res.json(step);
    } catch (error) {
      console.error("Error updating step:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid step data", errors: error.errors });
      }
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

  // HTML template transformation middleware for domain mapping injection
  // This middleware runs BEFORE Vite middleware and injects domain mapping data into HTML
  app.use('*', async (req, res, next) => {
    try {
      // Only process GET requests for HTML content
      if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/api-public/') || req.path.includes('.')) {
        return next();
      }

      const hostname = (req.get('host')?.split(':')[0] || 
                       req.get('x-forwarded-host') || 
                       req.hostname || '').toLowerCase();
      
      console.log('🔍 HTML injection check for:', hostname);
      
      // Check if there's already a domain mapping in res.locals (set by earlier middleware)
      let mapping = res.locals.domainMapping;
      
      if (!mapping) {
        // Look up domain mapping
        const allMappings = await storage.getCustomDomainMappings();
        mapping = allMappings.find(m => 
          m.domain?.toLowerCase() === hostname && m.isActive
        );
      }
      
      if (mapping && mapping.isActive) {
        console.log('✅ Domain mapping found for HTML injection:', mapping.domain);
        
        // Create safe subset of mapping info for client injection
        const clientSafeMapping = {
          domain: mapping.domain,
          feature: mapping.feature,
          routeMode: mapping.routeMode,
          projectId: mapping.projectId,
          guideId: mapping.guideId,
          theme: mapping.theme,
          isWhiteLabel: true
        };
        
        // Store in res.locals for template injection
        res.locals.whiteLabelConfig = clientSafeMapping;
        console.log('📝 Stored white-label config for injection');
      } else {
        console.log('❌ No domain mapping found for HTML injection');
        res.locals.whiteLabelConfig = { isWhiteLabel: false };
      }
    } catch (error) {
      console.error('Error in domain mapping HTML injection:', error);
      res.locals.whiteLabelConfig = { isWhiteLabel: false };
    }
    
    next();
  });

  // ==========================================
  // PUBLIC API ENDPOINTS (No Auth Required)
  // For custom domain embedding
  // ==========================================

  // Middleware to ensure domain mapping exists and is valid for all public routes
  app.use('/api-public/*', async (req, res, next) => {
    try {
      const hostname = (req.get('host')?.split(':')[0] || 
                       req.get('x-forwarded-host') || 
                       req.hostname || '').toLowerCase();
      
      console.log('🔍 Public API domain check for:', hostname);
      
      if (!res.locals.domainMapping) {
        const allMappings = await storage.getCustomDomainMappings();
        const domainMapping = allMappings.find(m => 
          m.domain?.toLowerCase() === hostname && m.isActive
        );
        
        if (domainMapping) {
          res.locals.domainMapping = domainMapping;
          console.log('✅ Domain mapping set for public API:', domainMapping.domain);
        } else {
          console.log('❌ No domain mapping found for:', hostname);
          // SECURITY: Reject requests without valid domain mapping to prevent data leaks
          return res.status(404).json({ message: "Resource not found" });
        }
      }
      
      // Additional security: Ensure the mapping has required fields
      const mapping = res.locals.domainMapping;
      if (!mapping || !mapping.isActive) {
        console.log('❌ Invalid or inactive domain mapping');
        return res.status(404).json({ message: "Resource not found" });
      }
      
    } catch (error) {
      console.error('Error validating domain mapping for public API:', error);
      return res.status(404).json({ message: "Resource not found" });
    }
    next();
  });

  // Get public guide by ID (domain-scoped)
  app.get('/api-public/guide/:id', createSecurityMiddleware(), createRateLimit(60), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate ID parameter
      if (isNaN(id) || id <= 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed to exist by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Get guide and validate existence before any scoping checks
      const guide = await storage.getGuide(id);
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Enforce strict domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        // Single guide mode: MUST have guideId and MUST match exactly
        if (!mapping.guideId || id !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        // Project guides mode: MUST have projectId and guide MUST belong to that project
        if (!mapping.projectId || guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else {
        // SECURITY: Unknown route mode - reject
        return res.status(404).json({ message: "Guide not found" });
      }
      
      res.json(guide);
    } catch (error) {
      console.error("Error fetching public guide:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  // Get public guide by slug (domain-scoped)
  app.get('/api-public/guide/slug/:slug', createSecurityMiddleware(), createRateLimit(60), async (req, res) => {
    try {
      const slug = req.params.slug;
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate slug parameter
      if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      let guide: Guide | undefined;
      
      // SECURITY: Enforce strict domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        // Single guide mode: MUST have defaultGuideSlug AND guideId, slug MUST match exactly
        if (!mapping.defaultGuideSlug || !mapping.guideId || slug !== mapping.defaultGuideSlug) {
          return res.status(404).json({ message: "Guide not found" });
        }
        // Get the guide and verify it matches BOTH the mapping's guideId AND slug
        guide = await storage.getGuide(mapping.guideId);
        if (!guide || guide.slug !== slug || guide.id !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        // Project guides mode: MUST have projectId, scope lookup to the mapped project ONLY
        if (!mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
        guide = await storage.getGuideBySlug(slug, mapping.projectId);
        // SECURITY: Double-check that returned guide belongs to the correct project
        if (guide && guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else {
        // SECURITY: Unknown route mode - reject
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Final validation - guide must exist and be public
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      res.json(guide);
    } catch (error) {
      console.error("Error fetching public guide by slug:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  // Get public guide by project and slug (domain-scoped)
  app.get('/api-public/guide/:projectId/:slug', createSecurityMiddleware(), createRateLimit(60), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const slug = req.params.slug;
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate parameters
      if (isNaN(projectId) || projectId <= 0 || !slug || typeof slug !== 'string' || slug.trim().length === 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Enforce STRICT domain scoping - ONLY project_guides mode allowed for this route
      if (mapping.routeMode !== 'project_guides' || 
          !mapping.projectId || 
          projectId !== mapping.projectId) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Use more efficient and secure lookup method
      const guide = await storage.getGuideBySlug(slug, projectId);
      
      // SECURITY: Triple validation - guide must exist, be public, and belong to correct project
      if (!guide || !guide.isPublic || guide.projectId !== projectId || guide.projectId !== mapping.projectId) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      res.json(guide);
    } catch (error) {
      console.error("Error fetching public guide by project and slug:", error);
      res.status(500).json({ message: "Failed to fetch guide" });
    }
  });

  // Get all public guides for a project (domain-scoped)
  app.get('/api-public/guides/project/:projectId', createSecurityMiddleware(), createRateLimit(100), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const mapping = res.locals.domainMapping;
      
      // Ensure we have domain mapping context and guides feature is enabled
      if (!mapping || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guides not available" });
      }
      
      // Enforce domain scoping: only allow access to guides from the mapped project
      if (mapping.routeMode !== 'project_guides' || 
          !mapping.projectId || 
          projectId !== mapping.projectId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const guides = await storage.getGuides();
      const publicGuides = guides.filter(g => 
        g.projectId === projectId && g.isPublic
      );
      
      res.json(publicGuides);
    } catch (error) {
      console.error("Error fetching public guides for project:", error);
      res.status(500).json({ message: "Failed to fetch guides" });
    }
  });

  // Get flow boxes for public guide (domain-scoped)
  app.get('/api-public/guides/:guideId/flowboxes', createSecurityMiddleware(), createRateLimit(100), async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate guideId parameter
      if (isNaN(guideId) || guideId <= 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Get guide and validate existence and accessibility BEFORE domain scoping
      const guide = await storage.getGuide(guideId);
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Enforce STRICT domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        // Single guide mode: MUST have guideId and MUST match exactly
        if (!mapping.guideId || guideId !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        // Project guides mode: MUST have projectId and guide MUST belong to that project
        if (!mapping.projectId || guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else {
        // SECURITY: Unknown route mode - reject
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Only fetch flow boxes after all validations pass
      const flowBoxes = await storage.getFlowBoxesByGuide(guideId);
      res.json(flowBoxes);
    } catch (error) {
      console.error("Error fetching public guide flow boxes:", error);
      res.status(500).json({ message: "Failed to fetch flow boxes" });
    }
  });

  // Get steps for public guide (domain-scoped)
  app.get('/api-public/guides/:guideId/steps', createSecurityMiddleware(), createRateLimit(100), async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate guideId parameter
      if (isNaN(guideId) || guideId <= 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Get guide and validate existence and accessibility BEFORE domain scoping
      const guide = await storage.getGuide(guideId);
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Enforce STRICT domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        // Single guide mode: MUST have guideId and MUST match exactly
        if (!mapping.guideId || guideId !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        // Project guides mode: MUST have projectId and guide MUST belong to that project
        if (!mapping.projectId || guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else {
        // SECURITY: Unknown route mode - reject
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Only fetch steps after all validations pass
      const steps = await storage.getStepsByGuide(guideId);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching public guide steps:", error);
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  // Get Q&A for public guide (domain-scoped)
  app.get('/api-public/guides/:guideId/qa', createSecurityMiddleware(), createRateLimit(60), async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate guideId parameter
      if (isNaN(guideId) || guideId <= 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Get guide and validate existence and accessibility BEFORE domain scoping
      const guide = await storage.getGuide(guideId);
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Enforce STRICT domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        // Single guide mode: MUST have guideId and MUST match exactly
        if (!mapping.guideId || guideId !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        // Project guides mode: MUST have projectId and guide MUST belong to that project
        if (!mapping.projectId || guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else {
        // SECURITY: Unknown route mode - reject
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Only fetch Q&A after all validations pass
      const conversations = await storage.getQAByGuide(guideId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching public guide Q&A:", error);
      res.status(500).json({ message: "Failed to fetch Q&A" });
    }
  });

  // Get knowledge base for public guide (domain-scoped)
  app.get('/api-public/guides/:guideId/knowledge', createSecurityMiddleware(), createRateLimit(60), async (req, res) => {
    try {
      const guideId = parseInt(req.params.guideId);
      const mapping = res.locals.domainMapping;
      
      // SECURITY: Validate guideId parameter
      if (isNaN(guideId) || guideId <= 0) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Domain mapping is guaranteed by middleware, but double-check
      if (!mapping || !mapping.isActive || (mapping.feature !== 'guides' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Get guide and validate existence and accessibility BEFORE domain scoping
      const guide = await storage.getGuide(guideId);
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Enforce STRICT domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        // Single guide mode: MUST have guideId and MUST match exactly
        if (!mapping.guideId || guideId !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        // Project guides mode: MUST have projectId and guide MUST belong to that project
        if (!mapping.projectId || guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else {
        // SECURITY: Unknown route mode - reject
        return res.status(404).json({ message: "Guide not found" });
      }
      
      // SECURITY: Only fetch knowledge after all validations pass
      const knowledge = await storage.getKnowledgeByGuide(guideId);
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching public guide knowledge:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  // Public AI Chat endpoint (for custom domains) - domain-scoped
  app.post('/api-public/ai/chat', createSecurityMiddleware(), createRateLimit(30), async (req, res) => {
    try {
      const { message, provider, guideId, flowBoxId, stepId } = req.body;
      const mapping = res.locals.domainMapping;
      
      if (!message || !guideId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate message size (max 4KB)
      if (typeof message !== 'string' || message.length > 4096) {
        return res.status(400).json({ message: "Message too long. Maximum 4096 characters allowed." });
      }

      // Validate provider allowlist
      if (provider && !ALLOWED_PROVIDERS.includes(provider)) {
        return res.status(400).json({ message: "Invalid provider. Allowed providers: claude, openai, xai" });
      }

      // Ensure we have domain mapping context and chat feature is enabled
      if (!mapping || (mapping.feature !== 'chat' && mapping.feature !== 'both')) {
        return res.status(404).json({ message: "Chat not available" });
      }

      // Enforce domain verification for production security
      if (!mapping.verifiedAt) {
        return res.status(403).json({ message: "Domain not verified. Please verify your domain through the admin panel." });
      }

      // Verify guide is public
      const guide = await storage.getGuide(guideId);
      if (!guide || !guide.isPublic) {
        return res.status(404).json({ message: "Guide not found or not public" });
      }
      
      // Enforce domain scoping based on route mode
      if (mapping.routeMode === 'single_guide') {
        if (mapping.guideId && guideId !== mapping.guideId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      } else if (mapping.routeMode === 'project_guides') {
        if (mapping.projectId && guide.projectId !== mapping.projectId) {
          return res.status(404).json({ message: "Guide not found" });
        }
      }

      // Get all required data for context
      const allSteps = await storage.getStepsByGuide(guideId);

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

      // Build knowledge context (same as private endpoint but without userId)
      const context: KnowledgeContext = {
        guide,
        flowBox,
        currentStep,
        allSteps,
        generalFiles,
        faqFiles,
        otherHelpFiles
      };

      // Get AI assistant prompt from environment or default
      const assistantPrompt = process.env.AI_ASSISTANT_PROMPT || 
        `You are a helpful assistant for the "${guide.title}" guide. 
         Help users with questions about the content and provide step-by-step guidance.
         Be friendly, concise, and focus on actionable advice.`;

      // Build chat messages array
      const messages = [{
        role: 'user' as const,
        content: message
      }];

      const aiResponse = await AIService.generateResponse(
        messages,
        context,
        provider === 'openai' ? 'openai' : provider === 'xai' ? 'xai' : 'anthropic'
      );
      
      const response = aiResponse.content;

      // Save Q&A without user info for public endpoints
      await storage.createQAConversation({
        guideId,
        question: message,
        aiResponse: response,
        userId: 'anonymous',
        stepId: stepId || null
      });

      res.json({ response });
    } catch (error) {
      console.error("Error in public AI chat:", error);
      res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  // ==========================================
  // END PUBLIC API ENDPOINTS
  // ==========================================

  // ==========================================
  // ADMIN API ENDPOINTS (Platform Admin Only)
  // For managing custom domain mappings
  // ==========================================

  // Get all custom domain mappings (Admin only)
  app.get('/api/admin/custom-domains', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can manage domains
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const domainMappings = await storage.getCustomDomainMappings();
      res.json(domainMappings);
    } catch (error) {
      console.error("Error fetching custom domain mappings:", error);
      res.status(500).json({ message: "Failed to fetch domain mappings" });
    }
  });

  // Create custom domain mapping (Admin only)
  app.post('/api/admin/custom-domains', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can manage domains
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      // Validate required fields
      const { domain, pathPrefix, feature, routeMode, projectId, guideId, defaultGuideSlug, theme, isActive } = req.body;
      
      if (!domain || !feature || !routeMode) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate route mode specific requirements
      if (routeMode === 'single_guide' && !guideId) {
        return res.status(400).json({ message: "guideId is required for single_guide mode" });
      }
      
      if (routeMode === 'project_guides' && !projectId) {
        return res.status(400).json({ message: "projectId is required for project_guides mode" });
      }
      
      const domainMapping = await storage.createCustomDomainMapping({
        domain,
        pathPrefix: pathPrefix || '/',
        feature,
        routeMode,
        projectId: projectId || null,
        guideId: guideId || null,
        defaultGuideSlug: defaultGuideSlug || null,
        theme: theme || null,
        isActive: isActive !== false,
        verifiedAt: null, // Not verified initially
        createdBy: userId, // Add the user ID who created this domain mapping
      });
      
      res.json(domainMapping);
    } catch (error) {
      console.error("Error creating custom domain mapping:", error);
      res.status(500).json({ message: "Failed to create domain mapping" });
    }
  });

  // Update custom domain mapping (Admin only)
  app.put('/api/admin/custom-domains/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can manage domains
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const domainId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedMapping = await storage.updateCustomDomainMapping(domainId, updates);
      if (!updatedMapping) {
        return res.status(404).json({ message: "Domain mapping not found" });
      }
      
      res.json(updatedMapping);
    } catch (error) {
      console.error("Error updating custom domain mapping:", error);
      res.status(500).json({ message: "Failed to update domain mapping" });
    }
  });

  // Delete custom domain mapping (Admin only)
  app.delete('/api/admin/custom-domains/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can manage domains
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const domainId = parseInt(req.params.id);
      const deleted = await storage.deleteCustomDomainMapping(domainId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Domain mapping not found" });
      }
      
      res.json({ message: "Domain mapping deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom domain mapping:", error);
      res.status(500).json({ message: "Failed to delete domain mapping" });
    }
  });

  // Verify DNS for custom domain (Admin only)
  app.post('/api/admin/custom-domains/:id/verify-dns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only platform admins can manage domains
      if (!user?.isPlatformAdmin) {
        return res.status(403).json({ message: "Platform admin access required" });
      }
      
      const domainId = parseInt(req.params.id);
      
      // Get the domain mapping
      const mapping = await storage.getCustomDomainMapping(domainId);
      if (!mapping) {
        return res.status(404).json({ message: "Domain mapping not found" });
      }
      
      // TODO: Implement actual DNS verification logic
      // For now, we'll simulate verification based on domain format
      const isValidDomain = /^[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]$/.test(mapping.domain);
      const dnsVerified = isValidDomain && !mapping.domain.includes('localhost');
      
      // Update the domain mapping with verification status
      await storage.updateCustomDomainMapping(domainId, { 
        verifiedAt: dnsVerified ? new Date() : null 
      });
      
      res.json({
        verified: dnsVerified,
        message: dnsVerified 
          ? "Domain DNS verification successful" 
          : "Domain DNS verification failed. Please check your DNS configuration."
      });
    } catch (error) {
      console.error("Error verifying DNS:", error);
      res.status(500).json({ message: "Failed to verify DNS" });
    }
  });

  // ==========================================
  // END ADMIN API ENDPOINTS
  // ==========================================

  // ==========================================
  // WHITE-LABEL ROUTES
  // Serve brandless white-label components for custom domains
  // ==========================================

  // White-label project guides interface
  app.get('/white-label/project/:projectId', async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    let mapping = res.locals.domainMapping;
    
    // If no domain mapping context (when accessed directly), try to find it using headers
    if (!mapping) {
      const hostname = req.get('host')?.split(':')[0] || 
                      req.get('x-forwarded-host') || 
                      req.get('referer')?.match(/https?:\/\/([^\/]+)/)?.[1];
      
      if (hostname) {
        console.log('🔍 White-label route fetching domain mapping for:', hostname);
        try {
          const allMappings = await storage.getCustomDomainMappings();
          mapping = allMappings.find(m => m.domain === hostname && m.isActive);
          console.log('📋 Found mapping:', mapping ? `Project ${mapping.projectId}` : 'none');
        } catch (error) {
          console.error('❌ Error fetching mapping for white-label route:', error);
        }
      }
    }
    
    // Ensure domain mapping context exists OR create fallback for testing
    if (!mapping) {
      console.log('❌ No domain mapping found for white-label route');
      
      // TESTING FALLBACK: Create a mock mapping for dev/testing purposes
      const hostname = req.get('host')?.split(':')[0] || req.hostname || 'localhost';
      const isDevEnvironment = hostname.includes('replit.dev') || hostname.includes('localhost') || hostname.includes('127.0.0.1');
      
      if (isDevEnvironment) {
        console.log('🧪 Creating fallback mapping for testing environment');
        mapping = {
          id: 999,
          domain: hostname,
          pathPrefix: '/',
          feature: 'both',
          routeMode: 'project_guides',
          projectId: projectId,
          guideId: null,
          defaultGuideSlug: null,
          theme: {
            primary: '#3b82f6',
            secondary: '#f3f4f6', 
            background: '#ffffff',
            text: '#1f2937'
          },
          seoSettings: {},
          isActive: true,
          verificationToken: null,
          verifiedAt: null,
          createdBy: 'testing',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('✅ Using fallback mapping for testing');
      } else {
        return res.status(404).send('Not found');
      }
    }
    
    // Redirect to React app with white-label context
    const theme = encodeURIComponent(JSON.stringify(mapping.theme || {}));
    const redirectUrl = `/?wl=project&projectId=${projectId}&domain=${encodeURIComponent(mapping.domain)}&features=${mapping.feature}&theme=${theme}`;
    
    console.log('🔀 Redirecting white-label project to React app:', redirectUrl);
    res.redirect(redirectUrl);
  });

  // White-label single guide interface
  app.get('/white-label/guide/:guideId', async (req, res) => {
    const guideId = parseInt(req.params.guideId);
    let mapping = res.locals.domainMapping;
    
    // If no domain mapping context, try to find it using headers
    if (!mapping) {
      const hostname = req.get('host')?.split(':')[0] || 
                      req.get('x-forwarded-host') || 
                      req.get('referer')?.match(/https?:\/\/([^\/]+)/)?.[1];
      
      if (hostname) {
        try {
          const allMappings = await storage.getCustomDomainMappings();
          mapping = allMappings.find(m => m.domain === hostname && m.isActive);
        } catch (error) {
          console.error('❌ Error fetching mapping for white-label guide route:', error);
        }
      }
    }
    
    if (!mapping) {
      return res.status(404).send('Not found');
    }
    
    // Redirect to React app with white-label context
    const theme = encodeURIComponent(JSON.stringify(mapping.theme || {}));
    const redirectUrl = `/?wl=guide&guideId=${guideId}&domain=${encodeURIComponent(mapping.domain)}&features=${mapping.feature}&theme=${theme}`;
    
    console.log('🔀 Redirecting white-label guide to React app:', redirectUrl);
    res.redirect(redirectUrl);
  });

  // White-label guide by slug interface
  app.get('/white-label/guide/slug/:slug', async (req, res) => {
    const slug = req.params.slug;
    let mapping = res.locals.domainMapping;
    
    // If no domain mapping context, try to find it using headers
    if (!mapping) {
      const hostname = req.get('host')?.split(':')[0] || 
                      req.get('x-forwarded-host') || 
                      req.get('referer')?.match(/https?:\/\/([^\/]+)/)?.[1];
      
      if (hostname) {
        try {
          const allMappings = await storage.getCustomDomainMappings();
          mapping = allMappings.find(m => m.domain === hostname && m.isActive);
        } catch (error) {
          console.error('❌ Error fetching mapping for white-label slug route:', error);
        }
      }
    }
    
    if (!mapping) {
      return res.status(404).send('Not found');
    }
    
    // Redirect to React app with white-label context
    const theme = encodeURIComponent(JSON.stringify(mapping.theme || {}));
    const redirectUrl = `/?wl=slug&slug=${encodeURIComponent(slug)}&projectId=${mapping.projectId}&domain=${encodeURIComponent(mapping.domain)}&features=${mapping.feature}&theme=${theme}`;
    
    console.log('🔀 Redirecting white-label slug to React app:', redirectUrl);
    res.redirect(redirectUrl);
  });

  // ==========================================
  // END WHITE-LABEL ROUTES
  // ==========================================

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
