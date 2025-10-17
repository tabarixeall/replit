// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  calls;
  currentUserId;
  currentCallId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.calls = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentCallId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createCall(insertCall) {
    const id = this.currentCallId++;
    const call = {
      ...insertCall,
      id,
      timestamp: /* @__PURE__ */ new Date()
    };
    this.calls.set(id, call);
    return call;
  }
  async getCalls(limit = 50) {
    const callArray = Array.from(this.calls.values());
    return callArray.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }
  async getCallsStats() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const todayCalls = Array.from(this.calls.values()).filter(
      (call) => call.timestamp >= today
    );
    return {
      totalCalls: todayCalls.length,
      successfulCalls: todayCalls.filter((call) => call.status === "completed").length
    };
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callFrom: text("call_from").notNull(),
  callTo: text("call_to").notNull(),
  region: text("region").notNull(),
  status: text("status").notNull(),
  // 'completed', 'failed', 'in-progress'
  duration: text("duration"),
  // formatted duration like "2:34"
  callId: text("call_id"),
  // API response call ID
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  timestamp: true
});
var makeCallSchema = z.object({
  callFrom: z.string().min(10, "Call from number is required"),
  callTo: z.string().min(10, "Call to number is required"),
  region: z.enum(["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"])
});

// server/routes.ts
import { z as z2 } from "zod";
var API_KEY = process.env.APIDAZE_API_KEY || process.env.API_KEY;
var API_SECRET = process.env.APIDAZE_API_SECRET || process.env.API_SECRET;
if (!API_KEY || !API_SECRET) {
  console.warn("Warning: APIDAZE_API_KEY and APIDAZE_API_SECRET environment variables are not set");
}
async function registerRoutes(app2) {
  app2.post("/api/calls", async (req, res) => {
    try {
      const callData = makeCallSchema.parse(req.body);
      const apiUrl = `https://api.apidaze.io/${API_KEY}/calls`;
      const payload = {
        type: "number",
        call_to: callData.callTo,
        call_from: callData.callFrom,
        region: callData.region
      };
      const params = new URLSearchParams({
        api_secret: API_SECRET || ""
      });
      try {
        const response = await fetch(`${apiUrl}?${params}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Apidaze API error: ${response.status} - ${errorText}`);
        }
        const apiResult = await response.json();
        const call = await storage.createCall({
          callFrom: callData.callFrom,
          callTo: callData.callTo,
          region: callData.region,
          status: "completed",
          callId: apiResult.call_uuid || apiResult.id || "unknown",
          duration: null,
          errorMessage: null
        });
        res.json({
          success: true,
          call_id: apiResult.call_uuid || apiResult.id,
          message: `Call initiated to ${callData.callTo}`,
          call
        });
      } catch (apiError) {
        await storage.createCall({
          callFrom: callData.callFrom,
          callTo: callData.callTo,
          region: callData.region,
          status: "failed",
          callId: null,
          duration: null,
          errorMessage: apiError.message
        });
        res.status(400).json({
          success: false,
          error: apiError.message || "Failed to initiate call"
        });
      }
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Internal server error"
        });
      }
    }
  });
  app2.get("/api/calls", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const calls2 = await storage.getCalls(limit);
      res.json(calls2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch call history" });
    }
  });
  app2.get("/api/calls/stats", async (req, res) => {
    try {
      const stats = await storage.getCallsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch call stats" });
    }
  });
  app2.get("/call-script.xml", (req, res) => {
    const xmlScript = `<?xml version="1.0" encoding="UTF-8"?>
<document>
 <work>
  <answer/>
  <wait>2</wait>
  <playback file="intro.wav" input-timeout="50000">
    <bind action="https://vi-2-xeallrender.replit.app/connect">1</bind>
  </playback>
  <playback file="outro.wav"></playback>
 </work>
</document>`;
    res.set({
      "Content-Type": "application/xml",
      "Cache-Control": "no-cache"
    });
    res.send(xmlScript);
  });
  app2.get("/api/call-script", (req, res) => {
    const xmlScript = `<?xml version="1.0" encoding="UTF-8"?>
<document>
 <work>
  <answer/>
  <wait>2</wait>
  <playback file="intro.wav" input-timeout="50000">
    <bind action="https://vi-2-xeallrender.replit.app/connect">1</bind>
  </playback>
  <playback file="outro.wav"></playback>
 </work>
</document>`;
    res.set({
      "Content-Type": "application/xml",
      "Cache-Control": "no-cache"
    });
    res.send(xmlScript);
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();