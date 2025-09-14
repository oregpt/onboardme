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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Direct handler for white-label entry to bypass Vite catch-all issues
  app.get('/src/white-label-entry.tsx', async (req, res, next) => {
    const hostname = req.get('host')?.split(':')[0] || '';
    const isCustomDomain = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('replit');
    
    if (isCustomDomain) {
      try {
        // Directly serve the transformed white-label entry for custom domains
        const fs = await import('fs');
        const path = await import('path');
        
        const filePath = path.resolve(import.meta.dirname, '..', 'client', 'src', 'white-label-entry.tsx');
        
        if (fs.existsSync(filePath)) {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.send(content);
          return;
        }
      } catch (error) {
        console.error('Error serving white-label entry:', error);
      }
    }
    next();
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
