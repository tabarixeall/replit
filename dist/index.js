var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminAddCreditsSchema: () => adminAddCreditsSchema,
  adminCreateUserSchema: () => adminCreateUserSchema,
  adminUpdateUserSchema: () => adminUpdateUserSchema,
  bulkCallSchema: () => bulkCallSchema,
  bulkCalls: () => bulkCalls,
  bulkCallsRelations: () => bulkCallsRelations,
  calls: () => calls,
  callsRelations: () => callsRelations,
  campaignStatus: () => campaignStatus,
  campaignStatusRelations: () => campaignStatusRelations,
  contacts: () => contacts,
  contactsRelations: () => contactsRelations,
  formatPhoneNumber: () => formatPhoneNumber,
  insertCallSchema: () => insertCallSchema,
  insertContactSchema: () => insertContactSchema,
  insertUserSchema: () => insertUserSchema,
  insertWebhookResponseSchema: () => insertWebhookResponseSchema,
  loginSchema: () => loginSchema,
  makeCallSchema: () => makeCallSchema,
  registerSchema: () => registerSchema,
  systemLogs: () => systemLogs,
  systemLogsRelations: () => systemLogsRelations,
  systemSettings: () => systemSettings,
  updateSystemSettingsSchema: () => updateSystemSettingsSchema,
  updateXmlSchema: () => updateXmlSchema,
  users: () => users,
  usersRelations: () => usersRelations,
  webhookResponses: () => webhookResponses,
  webhookResponsesRelations: () => webhookResponsesRelations,
  xmlSettings: () => xmlSettings
});
import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"),
  // 'admin', 'user'
  status: text("status").default("active"),
  // 'active', 'suspended', 'deleted'
  credits: integer("credits").default(0),
  // Call credits
  lastLoginAt: timestamp("last_login_at"),
  totalCalls: integer("total_calls").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
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
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: integer("user_id"),
  // Track which user made the call
  creditsCost: integer("credits_cost").default(1)
  // Credits deducted for this call
});
var systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  // 'login', 'logout', 'call_made', 'user_created', etc.
  details: text("details"),
  // JSON string with additional info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var campaignStatus = pgTable("campaign_status", {
  id: serial("id").primaryKey(),
  activeCampaignId: integer("active_campaign_id"),
  // null if no campaign running
  activeUserId: integer("active_user_id"),
  // which user owns the active campaign
  isXmlLocked: integer("is_xml_locked").default(0),
  // 1 if XML updates are blocked
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
var registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required")
});
var adminCreateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["user", "admin"]).default("user"),
  credits: z.number().int().min(0).optional()
});
var adminAddCreditsSchema = z.object({
  userId: z.number().int().min(1),
  credits: z.number().int().min(1, "Credits must be at least 1")
});
var adminUpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Valid email is required").optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional()
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
var contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone").notNull(),
  originalPhone: text("original_phone").notNull(),
  // Store original input
  bulkCallId: integer("bulk_call_id"),
  // Link to bulk call campaign
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var bulkCalls = pgTable("bulk_calls", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalContacts: integer("total_contacts").notNull(),
  completedCalls: integer("completed_calls").default(0),
  failedCalls: integer("failed_calls").default(0),
  status: text("status").notNull(),
  // 'pending', 'in-progress', 'completed', 'cancelled'
  region: text("region").notNull(),
  callFrom: text("call_from").notNull(),
  userId: integer("user_id").notNull(),
  // Track which user owns this campaign
  maxContacts: integer("max_contacts").notNull(),
  // Limited by user credits
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var xmlSettings = pgTable("xml_settings", {
  id: serial("id").primaryKey(),
  introFile: text("intro_file").default("intro.wav"),
  outroFile: text("outro_file").default("outro.wav"),
  connectAction: text("connect_action").default("https://vi-2-xeallrender.replit.app/connect"),
  inputTimeout: integer("input_timeout").default(5e4),
  waitTime: integer("wait_time").default(2),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  concurrency: integer("concurrency").default(100),
  // Maximum concurrent calls per batch
  delayBetweenBatches: integer("delay_between_batches").default(2e3),
  // Delay in milliseconds between batches
  delayBetweenCalls: integer("delay_between_calls").default(0),
  // Delay in milliseconds between individual calls within a batch
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var webhookResponses = pgTable("webhook_responses", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  buttonPressed: text("button_pressed").notNull(),
  // '1', '2', etc.
  bulkCallId: integer("bulk_call_id"),
  // Link to bulk call campaign if found
  contactId: integer("contact_id"),
  // Link to specific contact if found
  contactName: text("contact_name"),
  // Store contact name if available
  contactEmail: text("contact_email"),
  // Store contact email if available
  campaignName: text("campaign_name"),
  // Store campaign name for easy reference
  userId: integer("user_id"),
  // Track which user owns this response data
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var updateXmlSchema = z.object({
  introFile: z.string().min(1, "Intro file is required"),
  outroFile: z.string().min(1, "Outro file is required"),
  connectAction: z.string().url("Connect action must be a valid URL").optional(),
  inputTimeout: z.number().int().min(1e3).max(3e5).optional(),
  waitTime: z.number().int().min(1).max(30).optional()
});
var updateSystemSettingsSchema = z.object({
  concurrency: z.number().int().min(1).max(1e3).optional(),
  delayBetweenBatches: z.number().int().min(0).max(6e4).optional(),
  delayBetweenCalls: z.number().int().min(0).max(1e4).optional()
});
var insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true
});
var bulkCallSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  callFrom: z.string().min(10, "Call from number is required"),
  region: z.enum(["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"]),
  contacts: z.string().min(1, "Contact data is required")
});
var formatPhoneNumber = (phone) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits;
  }
  return digits;
};
var insertWebhookResponseSchema = createInsertSchema(webhookResponses).omit({
  id: true,
  timestamp: true
});
var usersRelations = relations(users, ({ many }) => ({
  calls: many(calls),
  bulkCalls: many(bulkCalls),
  webhookResponses: many(webhookResponses),
  systemLogs: many(systemLogs)
}));
var callsRelations = relations(calls, ({ one }) => ({
  user: one(users, {
    fields: [calls.userId],
    references: [users.id]
  })
}));
var bulkCallsRelations = relations(bulkCalls, ({ one, many }) => ({
  user: one(users, {
    fields: [bulkCalls.userId],
    references: [users.id]
  }),
  contacts: many(contacts),
  webhookResponses: many(webhookResponses)
}));
var contactsRelations = relations(contacts, ({ one, many }) => ({
  bulkCall: one(bulkCalls, {
    fields: [contacts.bulkCallId],
    references: [bulkCalls.id]
  }),
  webhookResponses: many(webhookResponses)
}));
var webhookResponsesRelations = relations(webhookResponses, ({ one }) => ({
  user: one(users, {
    fields: [webhookResponses.userId],
    references: [users.id]
  }),
  bulkCall: one(bulkCalls, {
    fields: [webhookResponses.bulkCallId],
    references: [bulkCalls.id]
  }),
  contact: one(contacts, {
    fields: [webhookResponses.contactId],
    references: [contacts.id]
  })
}));
var systemLogsRelations = relations(systemLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemLogs.userId],
    references: [users.id]
  })
}));
var campaignStatusRelations = relations(campaignStatus, ({ one }) => ({
  activeCampaign: one(bulkCalls, {
    fields: [campaignStatus.activeCampaignId],
    references: [bulkCalls.id]
  }),
  activeUser: one(users, {
    fields: [campaignStatus.activeUserId],
    references: [users.id]
  })
}));

// server/db.ts
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var { Pool } = pkg;
var connectionString = "postgresql://q_vdqb_user:NCuUCUNilg4MpdR1yN9rj743zR8URmEH@dpg-d3lv0m8gjchc73codb8g-a.oregon-postgres.render.com/q_vdqb";
var pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, desc, count, sql, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
var DatabaseStorage = class {
  // Authentication methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(userData) {
    const [user] = await db.insert(users).values({
      ...userData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return user;
  }
  async authenticateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
  async registerUser(userData) {
    const existingUsername = await this.getUserByUsername(userData.username);
    if (existingUsername) {
      throw new Error("Username already exists");
    }
    const existingEmail = await this.getUserByEmail(userData.email);
    if (existingEmail) {
      throw new Error("Email already exists");
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return this.createUser({
      ...userData,
      password: hashedPassword,
      role: "user",
      status: "active"
    });
  }
  // Call methods
  async createCall(callData) {
    const [call] = await db.insert(calls).values({
      ...callData,
      timestamp: /* @__PURE__ */ new Date()
    }).returning();
    return call;
  }
  async getCalls(limit = 50) {
    return await db.select().from(calls).orderBy(desc(calls.timestamp)).limit(limit);
  }
  async getUserCalls(userId, limit = 50) {
    return await db.select().from(calls).where(eq(calls.userId, userId)).orderBy(desc(calls.timestamp)).limit(limit);
  }
  async getCallsStats() {
    const allCalls = await db.select().from(calls);
    const totalCalls = allCalls.length;
    const successfulCalls = allCalls.filter(
      (call) => call.status === "completed"
    ).length;
    return { totalCalls, successfulCalls };
  }
  // Contact methods
  async createContact(contactData) {
    const [contact] = await db.insert(contacts).values({
      ...contactData,
      createdAt: /* @__PURE__ */ new Date()
    }).returning();
    return contact;
  }
  async createMultipleContacts(contactsData) {
    const insertData = contactsData.map((contact) => ({
      ...contact,
      createdAt: /* @__PURE__ */ new Date()
    }));
    return await db.insert(contacts).values(insertData).returning();
  }
  async getContactsByBulkCallId(bulkCallId) {
    return await db.select().from(contacts).where(eq(contacts.bulkCallId, bulkCallId));
  }
  async getContacts(limit = 50) {
    return await db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(limit);
  }
  async getContactsByPhoneNumber(phoneNumber) {
    return await db.select().from(contacts).where(eq(contacts.phone, phoneNumber));
  }
  // Bulk call methods
  async createBulkCall(bulkCallData) {
    const [bulkCall] = await db.insert(bulkCalls).values({
      ...bulkCallData,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return bulkCall;
  }
  async getBulkCalls(limit = 50) {
    return await db.select().from(bulkCalls).orderBy(desc(bulkCalls.createdAt)).limit(limit);
  }
  async getBulkCallById(id) {
    const [bulkCall] = await db.select().from(bulkCalls).where(eq(bulkCalls.id, id)).limit(1);
    return bulkCall;
  }
  async getUserBulkCalls(userId, limit = 50) {
    return await db.select().from(bulkCalls).where(eq(bulkCalls.userId, userId)).orderBy(desc(bulkCalls.createdAt)).limit(limit);
  }
  async updateBulkCall(id, updates) {
    const [updatedBulkCall] = await db.update(bulkCalls).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(bulkCalls.id, id)).returning();
    if (!updatedBulkCall) {
      throw new Error(`Bulk call with id ${id} not found`);
    }
    return updatedBulkCall;
  }
  // XML Settings methods
  async getXmlSettings() {
    const [settings] = await db.select().from(xmlSettings).limit(1);
    if (!settings) {
      const [defaultSettings] = await db.insert(xmlSettings).values({
        introFile: "intro.wav",
        outroFile: "outro.wav",
        connectAction: "https://vi-2-xeallrender.replit.app/connect",
        inputTimeout: 5e4,
        waitTime: 2,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return defaultSettings;
    }
    return settings;
  }
  async updateXmlSettings(settingsData) {
    await this.getXmlSettings();
    const [updatedSettings] = await db.update(xmlSettings).set({
      ...settingsData,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return updatedSettings;
  }
  // System Settings methods
  async getSystemSettings() {
    const [settings] = await db.select().from(systemSettings).limit(1);
    if (!settings) {
      const [defaultSettings] = await db.insert(systemSettings).values({
        concurrency: 100,
        delayBetweenBatches: 2e3,
        delayBetweenCalls: 0,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return defaultSettings;
    }
    return settings;
  }
  async updateSystemSettings(settingsData) {
    await this.getSystemSettings();
    const [updatedSettings] = await db.update(systemSettings).set({
      ...settingsData,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return updatedSettings;
  }
  // Webhook response methods
  async createWebhookResponse(responseData) {
    const [response] = await db.insert(webhookResponses).values({
      ...responseData,
      timestamp: /* @__PURE__ */ new Date()
    }).returning();
    return response;
  }
  async getWebhookResponses(limit = 50) {
    return await db.select().from(webhookResponses).orderBy(desc(webhookResponses.timestamp)).limit(limit);
  }
  async getUserWebhookResponses(userId, limit = 50) {
    return await db.select().from(webhookResponses).where(eq(webhookResponses.userId, userId)).orderBy(desc(webhookResponses.timestamp)).limit(limit);
  }
  async deleteWebhookResponse(id) {
    const result = await db.delete(webhookResponses).where(eq(webhookResponses.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async deleteUserWebhookResponse(id, userId) {
    const result = await db.delete(webhookResponses).where(
      and(eq(webhookResponses.id, id), eq(webhookResponses.userId, userId))
    );
    return (result.rowCount ?? 0) > 0;
  }
  // Admin methods
  async getAllUsers(limit = 100) {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
  }
  async createUserByAdmin(userData) {
    const generatedPassword = nanoid(12);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const [user] = await db.insert(users).values({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || "user",
      status: "active"
    }).returning();
    return { user, generatedPassword };
  }
  async updateUserByAdmin(id, updates) {
    const [user] = await db.update(users).set({
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id)).returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  async suspendUser(id) {
    return this.updateUserByAdmin(id, { status: "suspended" });
  }
  async unsuspendUser(id) {
    return this.updateUserByAdmin(id, { status: "active" });
  }
  async deleteUser(id) {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async getAllCalls(limit = 100) {
    return db.select().from(calls).orderBy(desc(calls.timestamp)).limit(limit);
  }
  async getSystemLogs(limit = 100) {
    return db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(limit);
  }
  async createSystemLog(log2) {
    const [systemLog] = await db.insert(systemLogs).values(log2).returning();
    return systemLog;
  }
  // Credit management methods
  async getUserCredits(userId) {
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    return user?.credits || 0;
  }
  async addUserCredits(userId, credits) {
    const [user] = await db.update(users).set({
      credits: sql`${users.credits} + ${credits}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId)).returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  async setUserCredits(userId, credits) {
    const [user] = await db.update(users).set({
      credits,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId)).returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  async deductUserCredits(userId, credits) {
    const [user] = await db.update(users).set({
      credits: sql`GREATEST(0, ${users.credits} - ${credits})`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId)).returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  async getUserStats() {
    const [stats] = await db.select({
      totalUsers: count(),
      activeUsers: sql`count(*) filter (where ${users.status} = 'active')`,
      suspendedUsers: sql`count(*) filter (where ${users.status} = 'suspended')`
    }).from(users);
    return {
      totalUsers: Number(stats.totalUsers),
      activeUsers: Number(stats.activeUsers),
      suspendedUsers: Number(stats.suspendedUsers)
    };
  }
  async getCallStats() {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [stats] = await db.select({
      totalCalls: count(),
      successfulCalls: sql`count(*) filter (where ${calls.status} = 'completed')`,
      failedCalls: sql`count(*) filter (where ${calls.status} = 'failed')`,
      todayCalls: sql`count(*) filter (where ${calls.timestamp} >= ${today})`
    }).from(calls);
    return {
      totalCalls: Number(stats.totalCalls),
      successfulCalls: Number(stats.successfulCalls),
      failedCalls: Number(stats.failedCalls),
      todayCalls: Number(stats.todayCalls)
    };
  }
  // Credit system methods
  async addCreditsToUser(userId, credits) {
    const [user] = await db.update(users).set({
      credits: sql`${users.credits} + ${credits}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId)).returning();
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }
  async deductCredits(userId, amount = 1) {
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    if (!user || (user.credits ?? 0) < amount) {
      return false;
    }
    await db.update(users).set({
      credits: sql`${users.credits} - ${amount}`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
    return true;
  }
  // Campaign status methods
  async getActiveCampaign() {
    const [status] = await db.select().from(campaignStatus).limit(1);
    if (!status) {
      await db.insert(campaignStatus).values({
        activeCampaignId: null,
        activeUserId: null,
        isXmlLocked: 0
      });
      return { campaignId: null, userId: null, isXmlLocked: false };
    }
    return {
      campaignId: status.activeCampaignId,
      userId: status.activeUserId,
      isXmlLocked: Boolean(status.isXmlLocked)
    };
  }
  async setActiveCampaign(campaignId, userId) {
    await db.update(campaignStatus).set({
      activeCampaignId: campaignId,
      activeUserId: userId,
      lastUpdated: /* @__PURE__ */ new Date()
    });
  }
  async lockXmlUpdates(locked) {
    await db.update(campaignStatus).set({
      isXmlLocked: locked ? 1 : 0,
      lastUpdated: /* @__PURE__ */ new Date()
    });
  }
};
var storage = new DatabaseStorage();

// server/websocket.ts
import WebSocket, { WebSocketServer } from "ws";
import { parse } from "url";
var WebSocketManager = class {
  wss = null;
  clients = /* @__PURE__ */ new Set();
  init(server) {
    this.wss = new WebSocketServer({
      server,
      path: "/ws"
    });
    this.wss.on("connection", (ws, req) => {
      console.log("New WebSocket connection");
      const { query } = parse(req.url || "", true);
      const userId = query.userId ? parseInt(query.userId) : void 0;
      const username = query.username;
      if (userId && username) {
        ws.userId = userId;
        ws.username = username;
        console.log(`WebSocket authenticated for user: ${username} (ID: ${userId})`);
      }
      this.clients.add(ws);
      ws.send(JSON.stringify({
        type: "connection",
        message: "Connected to notification service",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }));
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          console.log("WebSocket message received:", data);
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });
      ws.on("close", () => {
        console.log(`WebSocket disconnected for user: ${ws.username || "unknown"}`);
        this.clients.delete(ws);
      });
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });
    });
    console.log("WebSocket server initialized on /ws");
  }
  // Broadcast webhook notification to specific user
  broadcastWebhookNotification(userId, notification) {
    const message = JSON.stringify({
      type: "webhook_response",
      data: notification,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
      }
    });
    console.log(`Sent webhook notification to ${sentCount} client(s) for user ${userId}`);
    return sentCount > 0;
  }
  // Broadcast to all authenticated clients
  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        sentCount++;
      }
    });
    console.log(`Broadcast message sent to ${sentCount} client(s)`);
    return sentCount;
  }
  // Get connected users count
  getConnectedUsersCount() {
    return Array.from(this.clients).filter(
      (client) => client.readyState === WebSocket.OPEN && client.userId
    ).length;
  }
  // Get specific user's connection count
  getUserConnectionCount(userId) {
    return Array.from(this.clients).filter(
      (client) => client.readyState === WebSocket.OPEN && client.userId === userId
    ).length;
  }
};
var wsManager = new WebSocketManager();

// server/routes.ts
import { z as z2 } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
async function executeBulkCalling(bulkCallId, bulkCall, userId) {
  try {
    console.log(`Starting bulk call campaign: ${bulkCall.name} for user ${userId}`);
    const systemSettings2 = await storage.getSystemSettings();
    const BATCH_SIZE = systemSettings2.concurrency || 100;
    const DELAY_BETWEEN_BATCHES = systemSettings2.delayBetweenBatches || 2e3;
    const DELAY_BETWEEN_CALLS = systemSettings2.delayBetweenCalls || 0;
    console.log(`Using system settings - Concurrency: ${BATCH_SIZE}, Batch Delay: ${DELAY_BETWEEN_BATCHES}ms, Call Delay: ${DELAY_BETWEEN_CALLS}ms`);
    const contacts2 = await storage.getContactsByBulkCallId(bulkCallId);
    let completedCalls = 0;
    let failedCalls = 0;
    console.log(`Total contacts to process: ${contacts2.length}`);
    const batches = [];
    for (let i = 0; i < contacts2.length; i += BATCH_SIZE) {
      batches.push(contacts2.slice(i, i + BATCH_SIZE));
    }
    console.log(`Processing ${contacts2.length} contacts in ${batches.length} batch(es) of up to ${BATCH_SIZE} concurrent calls`);
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} contacts`);
      const updatedBulkCall = await storage.getBulkCallById(bulkCallId);
      if (updatedBulkCall?.status === "cancelled") {
        console.log(`Campaign ${bulkCallId} was cancelled. Stopping execution.`);
        break;
      }
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits <= 0) {
        console.log(`User ${userId} ran out of credits. Stopping campaign.`);
        break;
      }
      const batchPromises = batch.map(async (contact, contactIndex) => {
        const globalIndex = batchIndex * BATCH_SIZE + contactIndex + 1;
        console.log(`Processing call ${globalIndex}/${contacts2.length} to ${contact.phone}`);
        try {
          const apiUrl = `https://api.apidaze.io/${API_KEY}/calls`;
          const payload = {
            type: "number",
            call_to: contact.phone,
            call_from: bulkCall.callFrom,
            region: bulkCall.region
          };
          const params = new URLSearchParams({
            api_secret: API_SECRET || ""
          });
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
          const result = await response.json();
          if (result.failure || typeof result === "object" && "failure" in result) {
            throw new Error(`Apidaze call failed: ${result.failure || "Unknown failure"}`);
          }
          if (!result.ok && !result.call_uuid && !result.id) {
            throw new Error(`Apidaze call failed: No success indicators in response`);
          }
          await storage.createCall({
            callFrom: bulkCall.callFrom,
            callTo: contact.phone,
            region: bulkCall.region,
            status: "completed",
            duration: null,
            callId: result.call_uuid || result.id || "unknown",
            errorMessage: null,
            userId,
            creditsCost: 1
          });
          await storage.deductCredits(userId, 1);
          console.log(`Call successful to ${contact.phone} (${globalIndex}/${contacts2.length}). Credits deducted.`);
          return { success: true, contact };
        } catch (callError) {
          console.error(`Error calling ${contact.phone} (${globalIndex}/${contacts2.length}):`, callError);
          await storage.createCall({
            callFrom: bulkCall.callFrom,
            callTo: contact.phone,
            region: bulkCall.region,
            status: "failed",
            duration: null,
            callId: null,
            errorMessage: callError.message || "Network error",
            userId,
            creditsCost: 1
          });
          await storage.deductCredits(userId, 1);
          console.log(`Call failed to ${contact.phone} (${globalIndex}/${contacts2.length}). Credits deducted.`);
          return { success: false, contact, error: callError.message };
        }
      });
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          completedCalls++;
        } else {
          failedCalls++;
        }
      });
      await storage.updateBulkCall(bulkCallId, {
        completedCalls,
        failedCalls,
        updatedAt: /* @__PURE__ */ new Date()
      });
      console.log(`Batch ${batchIndex + 1}/${batches.length} completed. Total completed: ${completedCalls}, failed: ${failedCalls}`);
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    const finalBulkCall = await storage.getBulkCallById(bulkCallId);
    const finalStatus = finalBulkCall?.status === "cancelled" ? "cancelled" : "completed";
    await storage.updateBulkCall(bulkCallId, {
      status: finalStatus,
      completedCalls,
      failedCalls,
      updatedAt: /* @__PURE__ */ new Date()
    });
    await storage.setActiveCampaign(null, null);
    await storage.lockXmlUpdates(false);
    console.log(`Bulk call campaign "${bulkCall.name}" completed: ${completedCalls} successful, ${failedCalls} failed`);
  } catch (error) {
    console.error(`Bulk call campaign "${bulkCall.name}" failed:`, error);
    await storage.updateBulkCall(bulkCallId, {
      status: "failed",
      updatedAt: /* @__PURE__ */ new Date()
    });
    await storage.setActiveCampaign(null, null);
    await storage.lockXmlUpdates(false);
  }
}
var API_KEY = process.env.APIDAZE_API_KEY || process.env.API_KEY;
var API_SECRET = process.env.APIDAZE_API_SECRET || process.env.API_SECRET;
if (!API_KEY || !API_SECRET) {
  console.warn("Warning: APIDAZE_API_KEY and APIDAZE_API_SECRET environment variables are not set");
}
async function registerRoutes(app2) {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60
    // 7 days
  });
  app2.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    }
  }));
  const requireAuth = (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
  const requireAdmin = (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(loginData.username, loginData.password);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password"
        });
      }
      const safeUser = { ...user, password: void 0 };
      req.session.user = safeUser;
      res.json({
        success: true,
        user: safeUser,
        message: "Login successful"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Login failed"
      });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Logout failed"
        });
      }
      res.clearCookie("connect.sid");
      res.json({
        success: true,
        message: "Logout successful"
      });
    });
  });
  app2.get("/api/auth/me", (req, res) => {
    if (req.session?.user) {
      res.json({
        success: true,
        user: req.session.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }
  });
  app2.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json({ success: true, users: users2 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userData = adminCreateUserSchema.parse(req.body);
      const result = await storage.createUserByAdmin(userData);
      if (userData.credits && userData.credits > 0) {
        await storage.addCreditsToUser(result.user.id, userData.credits);
        result.user.credits = userData.credits;
      }
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: "user_created",
        details: JSON.stringify({
          createdUserId: result.user.id,
          username: result.user.username,
          initialCredits: userData.credits || 0
        }),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      res.status(201).json({
        success: true,
        user: { ...result.user, password: void 0 },
        generatedPassword: result.generatedPassword,
        message: "User created successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
  app2.post("/api/admin/users/:id/credits", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { credits } = req.body;
      if (!credits || credits <= 0) {
        return res.status(400).json({
          success: false,
          message: "Credits must be a positive number"
        });
      }
      const user = await storage.addCreditsToUser(userId, credits);
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: "credits_added",
        details: JSON.stringify({ targetUserId: userId, creditsAdded: credits }),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      res.json({
        success: true,
        user: { ...user, password: void 0 },
        message: `Added ${credits} credits to user`
      });
    } catch (error) {
      console.error("Add credits error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to add credits"
      });
    }
  });
  app2.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = adminUpdateUserSchema.parse(req.body);
      const user = await storage.updateUserByAdmin(id, updates);
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: "user_updated",
        details: JSON.stringify({ updatedUserId: id, updates }),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      res.json({
        success: true,
        user: { ...user, password: void 0 },
        message: "User updated successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
  app2.post("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.suspendUser(id);
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: "user_suspended",
        details: JSON.stringify({ suspendedUserId: id }),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      res.json({
        success: true,
        user: { ...user, password: void 0 },
        message: "User suspended successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
  app2.post("/api/admin/users/:id/unsuspend", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.unsuspendUser(id);
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: "user_unsuspended",
        details: JSON.stringify({ unsuspendedUserId: id }),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      });
      res.json({
        success: true,
        user: { ...user, password: void 0 },
        message: "User unsuspended successfully"
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
  app2.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      if (success) {
        await storage.createSystemLog({
          userId: req.session.user.id,
          action: "user_deleted",
          details: JSON.stringify({ deletedUserId: id }),
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        });
        res.json({ success: true, message: "User deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "User not found" });
      }
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/admin/calls", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const calls2 = await storage.getAllCalls(limit);
      res.json({ success: true, calls: calls2 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/admin/bulk-calls", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const bulkCalls2 = await storage.getBulkCalls(limit);
      res.json({ success: true, bulkCalls: bulkCalls2 });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/admin/webhook-responses", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const responses = await storage.getWebhookResponses(limit);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook responses" });
    }
  });
  app2.get("/api/admin/logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getSystemLogs();
      res.json({ success: true, logs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [userStats, callStats] = await Promise.all([
        storage.getUserStats(),
        storage.getCallStats()
      ]);
      res.json({
        success: true,
        stats: { ...userStats, ...callStats }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.post("/api/calls", requireAuth, async (req, res) => {
    try {
      const callData = makeCallSchema.parse(req.body);
      const userId = req.session.user.id;
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits <= 0) {
        return res.status(403).json({
          success: false,
          error: "Insufficient credits. Contact your administrator to add more credits.",
          credits: userCredits
        });
      }
      const campaignStatus2 = await storage.getActiveCampaign();
      if (campaignStatus2.campaignId !== null) {
        return res.status(423).json({
          success: false,
          error: "Another user has an active bulk calling campaign. Please wait until it completes.",
          activeCampaign: campaignStatus2.campaignId,
          activeUser: campaignStatus2.userId
        });
      }
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
        if (apiResult.failure || typeof apiResult === "object" && "failure" in apiResult) {
          throw new Error(`Apidaze call failed: ${apiResult.failure || "Unknown failure"}`);
        }
        if (!apiResult.ok && !apiResult.call_uuid && !apiResult.id) {
          throw new Error(`Apidaze call failed: No success indicators in response`);
        }
        const call = await storage.createCall({
          callFrom: callData.callFrom,
          callTo: callData.callTo,
          region: callData.region,
          status: "completed",
          callId: apiResult.call_uuid || apiResult.id || "unknown",
          duration: null,
          errorMessage: null,
          userId,
          creditsCost: 1
        });
        await storage.deductCredits(userId, 1);
        const remainingCredits = await storage.getUserCredits(userId);
        res.json({
          success: true,
          call_id: apiResult.call_uuid || apiResult.id,
          message: `Call initiated to ${callData.callTo}`,
          call,
          remainingCredits
        });
      } catch (apiError) {
        const call = await storage.createCall({
          callFrom: callData.callFrom,
          callTo: callData.callTo,
          region: callData.region,
          status: "failed",
          callId: null,
          duration: null,
          errorMessage: apiError.message,
          userId,
          creditsCost: 1
        });
        await storage.deductCredits(userId, 1);
        const remainingCredits = await storage.getUserCredits(userId);
        res.status(400).json({
          success: false,
          error: apiError.message || "Failed to initiate call",
          call,
          remainingCredits
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
  app2.get("/api/calls", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const calls2 = await storage.getUserCalls(userId, limit);
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
  app2.get("/api/mediafiles", async (req, res) => {
    try {
      if (!API_KEY || !API_SECRET) {
        return res.status(400).json({ error: "Apidaze credentials not configured" });
      }
      const apiUrl = `https://api.apidaze.io/${API_KEY}/mediafiles`;
      const params = new URLSearchParams({
        api_secret: API_SECRET
      });
      const response = await fetch(`${apiUrl}?${params}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apidaze API error: ${response.status} - ${errorText}`);
      }
      const mediaFiles = await response.json();
      res.json(mediaFiles);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch media files",
        details: error.message
      });
    }
  });
  app2.get("/api/xml-settings", async (req, res) => {
    try {
      const settings = await storage.getXmlSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch XML settings" });
    }
  });
  app2.put("/api/xml-settings", async (req, res) => {
    try {
      const settingsData = updateXmlSchema.parse(req.body);
      const updatedSettings = await storage.updateXmlSettings(settingsData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          error: "Invalid settings data",
          details: error.errors
        });
      } else {
        res.status(500).json({ error: "Failed to update XML settings" });
      }
    }
  });
  app2.get("/api/system-settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });
  app2.put("/api/system-settings", async (req, res) => {
    try {
      const settingsData = updateSystemSettingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSystemSettings(settingsData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          error: "Invalid settings data",
          details: error.errors
        });
      } else {
        res.status(500).json({ error: "Failed to update system settings" });
      }
    }
  });
  app2.post("/api/bulk-calls", requireAuth, async (req, res) => {
    try {
      const bulkData = bulkCallSchema.parse(req.body);
      const userId = req.session.user.id;
      const campaignStatus2 = await storage.getActiveCampaign();
      if (campaignStatus2.campaignId !== null) {
        return res.status(423).json({
          success: false,
          error: "Another user has an active bulk calling campaign. Please wait until it completes.",
          activeCampaign: campaignStatus2.campaignId,
          activeUser: campaignStatus2.userId
        });
      }
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits <= 0) {
        return res.status(403).json({
          success: false,
          error: "Insufficient credits. Contact your administrator to add more credits.",
          credits: userCredits
        });
      }
      const lines = bulkData.contacts.trim().split("\n").filter((line) => line.trim());
      const contacts2 = [];
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (trimmedLine.includes("|")) {
          const parts = trimmedLine.split("|").map((p) => p.trim());
          if (parts.length >= 3) {
            const [email, name, phone] = parts;
            const formattedPhone = formatPhoneNumber(phone);
            if (formattedPhone.length >= 10) {
              contacts2.push({
                email: email || null,
                name: name || null,
                phone: formattedPhone,
                originalPhone: phone
              });
            }
          }
        } else {
          const formattedPhone = formatPhoneNumber(trimmedLine);
          if (formattedPhone.length >= 10) {
            contacts2.push({
              email: null,
              name: null,
              phone: formattedPhone,
              originalPhone: trimmedLine
            });
          }
        }
      }
      if (contacts2.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid contacts found in the provided data"
        });
      }
      if (contacts2.length > 200) {
        return res.status(400).json({
          success: false,
          error: `Campaign cannot exceed 200 contacts. You provided ${contacts2.length} contacts.`
        });
      }
      const maxContactsFromCredits = Math.min(contacts2.length, userCredits);
      const contactsToProcess = contacts2.slice(0, maxContactsFromCredits);
      const bulkCall = await storage.createBulkCall({
        name: bulkData.name,
        totalContacts: contactsToProcess.length,
        completedCalls: 0,
        failedCalls: 0,
        status: "pending",
        region: bulkData.region,
        callFrom: bulkData.callFrom,
        userId,
        maxContacts: Math.min(200, contactsToProcess.length)
      });
      const contactsWithBulkCallId = contactsToProcess.map((contact) => ({
        ...contact,
        bulkCallId: bulkCall.id
      }));
      await storage.createMultipleContacts(contactsWithBulkCallId);
      const message = contactsToProcess.length < contacts2.length ? `Bulk call campaign "${bulkData.name}" created with ${contactsToProcess.length} contacts (limited by available credits: ${userCredits}). ${contacts2.length - contactsToProcess.length} contacts were excluded.` : `Bulk call campaign "${bulkData.name}" created with ${contactsToProcess.length} contacts`;
      res.json({
        success: true,
        bulkCall,
        contactsCreated: contactsToProcess.length,
        contactsExcluded: contacts2.length - contactsToProcess.length,
        userCredits,
        message
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid bulk call data",
          details: error.errors
        });
      } else {
        console.error("Bulk call creation error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to create bulk call campaign"
        });
      }
    }
  });
  app2.get("/api/bulk-calls", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const bulkCalls2 = await storage.getUserBulkCalls(userId, limit);
      res.json(bulkCalls2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bulk call campaigns" });
    }
  });
  app2.post("/api/bulk-calls/:id/start", requireAuth, async (req, res) => {
    try {
      const bulkCallId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const campaignStatus2 = await storage.getActiveCampaign();
      if (campaignStatus2.campaignId !== null && campaignStatus2.campaignId !== bulkCallId) {
        return res.status(423).json({
          success: false,
          error: "Another bulk calling campaign is already active. Please wait until it completes.",
          activeCampaign: campaignStatus2.campaignId,
          activeUser: campaignStatus2.userId
        });
      }
      const userBulkCalls = await storage.getUserBulkCalls(userId, 1e3);
      const targetCampaign = userBulkCalls.find((bc) => bc.id === bulkCallId);
      if (!targetCampaign) {
        return res.status(404).json({
          success: false,
          error: "Bulk call campaign not found"
        });
      }
      if (targetCampaign.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "You can only start your own campaigns"
        });
      }
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits < targetCampaign.totalContacts) {
        return res.status(403).json({
          success: false,
          error: `Insufficient credits. Campaign requires ${targetCampaign.totalContacts} credits, but you have ${userCredits}.`,
          required: targetCampaign.totalContacts,
          available: userCredits
        });
      }
      await storage.setActiveCampaign(bulkCallId, userId);
      await storage.lockXmlUpdates(true);
      const bulkCall = await storage.updateBulkCall(bulkCallId, {
        status: "in-progress",
        updatedAt: /* @__PURE__ */ new Date()
      });
      res.json({
        success: true,
        message: `Bulk call campaign "${bulkCall.name}" started`,
        bulkCall
      });
      executeBulkCalling(bulkCallId, bulkCall, userId);
    } catch (error) {
      console.error("Start bulk call error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start bulk call campaign"
      });
    }
  });
  app2.get("/api/contacts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const contacts2 = await storage.getContacts(limit);
      res.json(contacts2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });
  app2.get("/api/webhook-responses", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const responses = await storage.getUserWebhookResponses(userId, limit);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook responses" });
    }
  });
  app2.delete("/api/webhook-responses/:id", requireAuth, async (req, res) => {
    try {
      const responseId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const responses = await storage.getWebhookResponses(1e3);
      const response = responses.find((r) => r.id === responseId);
      if (!response) {
        return res.status(404).json({ success: false, message: "Response not found" });
      }
      if (response.userId !== userId) {
        return res.status(403).json({ success: false, message: "You can only delete your own response data" });
      }
      const deleted = await storage.deleteUserWebhookResponse(responseId, userId);
      if (deleted) {
        res.json({ success: true, message: "Response deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "Response not found" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete response" });
    }
  });
  app2.delete("/api/admin/webhook-responses/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const responseId = parseInt(req.params.id);
      const deleted = await storage.deleteWebhookResponse(responseId);
      if (deleted) {
        res.json({ success: true, message: "Response deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "Response not found" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete response" });
    }
  });
  app2.get("/call-script.xml", async (req, res) => {
    try {
      const settings = await storage.getXmlSettings();
      const xmlScript = `<?xml version="1.0" encoding="UTF-8"?>
<document>
 <work>
  <answer/>
  <wait>${settings.waitTime}</wait>
  <playback file="${settings.introFile}" input-timeout="${settings.inputTimeout}">
    <bind action="${settings.connectAction}">1</bind>
  </playback>
  <playback file="${settings.outroFile}"></playback>
 </work>
</document>`;
      res.set({
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache"
      });
      res.send(xmlScript);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate XML script" });
    }
  });
  app2.get("/api/call-script", async (req, res) => {
    try {
      const settings = await storage.getXmlSettings();
      const xmlScript = `<?xml version="1.0" encoding="UTF-8"?>
<document>
 <work>
  <answer/>
  <wait>${settings.waitTime}</wait>
  <playback file="${settings.introFile}" input-timeout="${settings.inputTimeout}">
    <bind action="${settings.connectAction}">1</bind>
  </playback>
  <playback file="${settings.outroFile}"></playback>
 </work>
</document>`;
      res.set({
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache"
      });
      res.send(xmlScript);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate XML script" });
    }
  });
  app2.get("/api/credits", requireAuth, async (req, res) => {
    try {
      const credits = await storage.getUserCredits(req.session.user.id);
      res.json({ success: true, credits });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/api/campaign-status", requireAuth, async (req, res) => {
    try {
      const status = await storage.getActiveCampaign();
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.post("/api/bulk-calls/:id/cancel", requireAuth, async (req, res) => {
    try {
      const bulkCallId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const userBulkCalls = await storage.getUserBulkCalls(userId, 1e3);
      const targetCampaign = userBulkCalls.find((bc) => bc.id === bulkCallId);
      if (!targetCampaign) {
        return res.status(404).json({
          success: false,
          error: "Bulk call campaign not found"
        });
      }
      if (targetCampaign.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: "You can only cancel your own campaigns"
        });
      }
      if (targetCampaign.status !== "in-progress") {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel campaign with status: ${targetCampaign.status}. Only in-progress campaigns can be cancelled.`
        });
      }
      const updatedCampaign = await storage.updateBulkCall(bulkCallId, {
        status: "cancelled",
        updatedAt: /* @__PURE__ */ new Date()
      });
      const campaignStatus2 = await storage.getActiveCampaign();
      if (campaignStatus2.campaignId === bulkCallId) {
        await storage.setActiveCampaign(null, null);
        await storage.lockXmlUpdates(false);
      }
      res.json({
        success: true,
        message: `Bulk call campaign "${updatedCampaign.name}" has been cancelled`,
        bulkCall: updatedCampaign
      });
    } catch (error) {
      console.error("Cancel bulk call error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cancel bulk call campaign"
      });
    }
  });
  app2.post("/api/admin/users/:id/credits", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { credits, action = "add" } = req.body;
      if (credits < 0) {
        return res.status(400).json({ success: false, message: "Credits cannot be negative" });
      }
      if (action === "set") {
        await storage.setUserCredits(userId, credits);
        res.json({ success: true, message: `Set credits to ${credits} successfully` });
      } else {
        if (credits <= 0) {
          return res.status(400).json({ success: false, message: "Credits to add must be positive" });
        }
        await storage.addUserCredits(userId, credits);
        res.json({ success: true, message: `Added ${credits} credits successfully` });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app2.get("/webhook", async (req, res) => {
    try {
      const phoneNumber = req.query.number;
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: "Phone number parameter is required"
        });
      }
      console.log(`Webhook received: Someone pressed 1 for number ${phoneNumber}`);
      const contacts2 = await storage.getContactsByPhoneNumber(phoneNumber);
      if (contacts2.length === 0) {
        console.log(`No campaigns found for phone number ${phoneNumber}`);
        return res.json({
          success: true,
          message: `Phone number ${phoneNumber} not found in any campaigns`,
          campaigns: []
        });
      }
      const campaignIds = Array.from(new Set(contacts2.map((c) => c.bulkCallId).filter((id) => id !== null)));
      const campaigns = [];
      for (const bulkCallId of campaignIds) {
        const bulkCalls3 = await storage.getBulkCalls(100);
        const campaign = bulkCalls3.find((bc) => bc.id === bulkCallId);
        if (campaign) {
          campaigns.push(campaign.name);
          console.log(`Phone number ${phoneNumber} pressed 1 in campaign: "${campaign.name}"`);
        }
      }
      const bulkCalls2 = await storage.getBulkCalls(100);
      for (const campaignId of campaignIds) {
        const campaign = bulkCalls2.find((bc) => bc.id === campaignId);
        const contact = contacts2.find((c) => c.bulkCallId === campaignId);
        if (campaign && contact) {
          await storage.createWebhookResponse({
            phoneNumber,
            buttonPressed: "1",
            bulkCallId: campaignId,
            contactId: contact.id || null,
            contactName: contact.name || null,
            contactEmail: contact.email || null,
            campaignName: campaign.name || null,
            userId: campaign.userId || null
          });
          console.log(`Stored webhook response for campaign "${campaign.name}" (user: ${campaign.userId})`);
          wsManager.broadcastWebhookNotification(campaign.userId, {
            phoneNumber,
            campaignName: campaign.name,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
      res.json({
        success: true,
        message: `Phone number ${phoneNumber} pressed 1`,
        phoneNumber,
        campaigns,
        contactsFound: contacts2.length
      });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process webhook"
      });
    }
  });
  app2.get("/connect", (req, res) => {
    res.set({
      "Content-Type": "application/xml",
      "Cache-Control": "no-cache"
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<document>
 <work>
  <dial>
   <sipaccount>sip:anything@23.254.230.253:5060</sipaccount>
  </dial>
  <hangup/>
 </work>
</document>`;
    res.send(xml);
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
import { nanoid as nanoid2 } from "nanoid";
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
        `src="/src/main.tsx?v=${nanoid2()}"`
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
  wsManager.init(server);
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
