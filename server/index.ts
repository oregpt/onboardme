import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy configuration - must be set early for correct IP extraction
app.set('trust proxy', 1);

// Body size limits to prevent memory exhaustion attacks
app.use('/api/upload', express.json({ limit: '10mb' }));
app.use('/api/upload', express.urlencoded({ extended: false, limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Bootstrap domain mappings for deployment
  async function bootstrapDomainMappings() {
    try {
      const { storage } = await import('./storage.js');
      
      // Check if guides.canty.ai mapping exists
      const existingMapping = await storage.getCustomDomainMappingByDomain('guides.canty.ai', '/');
      
      if (!existingMapping) {
        console.log('🚀 Creating bootstrap domain mapping for guides.canty.ai');
        await storage.createCustomDomainMapping({
          domain: 'guides.canty.ai',
          pathPrefix: '/',
          feature: 'both',
          routeMode: 'project_guides',
          projectId: 3,
          theme: {
            primary: '#3b82f6',
            secondary: '#f3f4f6',
            background: '#ffffff',
            text: '#1f2937'
          },
          seoSettings: {},
          isActive: true,
          verifiedAt: new Date(),
          createdBy: 'system'
        });
        console.log('✅ Bootstrap domain mapping created successfully');
      } else {
        console.log('✅ Domain mapping for guides.canty.ai already exists');
      }
    } catch (error) {
      console.error('❌ Error bootstrapping domain mappings:', error);
    }
  }

  // Run bootstrap
  await bootstrapDomainMappings();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
