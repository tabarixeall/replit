import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").default("user"), // 'admin', 'user'
  status: text("status").default("active"), // 'active', 'suspended', 'deleted'
  credits: integer("credits").default(0), // Call credits
  lastLoginAt: timestamp("last_login_at"),
  totalCalls: integer("total_calls").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  callFrom: text("call_from").notNull(),
  callTo: text("call_to").notNull(),
  region: text("region").notNull(),
  status: text("status").notNull(), // 'completed', 'failed', 'in-progress'
  duration: text("duration"), // formatted duration like "2:34"
  callId: text("call_id"), // API response call ID
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: integer("user_id"), // Track which user made the call
  creditsCost: integer("credits_cost").default(1), // Credits deducted for this call
});

// System logs for admin monitoring
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(), // 'login', 'logout', 'call_made', 'user_created', etc.
  details: text("details"), // JSON string with additional info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// System-wide campaign status - only one active campaign allowed
export const campaignStatus = pgTable("campaign_status", {
  id: serial("id").primaryKey(),
  activeCampaignId: integer("active_campaign_id"), // null if no campaign running
  activeUserId: integer("active_user_id"), // which user owns the active campaign
  isXmlLocked: integer("is_xml_locked").default(0), // 1 if XML updates are blocked
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

// Admin schemas
export const adminCreateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["user", "admin"]).default("user"),
  credits: z.number().int().min(0).optional(),
});

export const adminAddCreditsSchema = z.object({
  userId: z.number().int().min(1),
  credits: z.number().int().min(1, "Credits must be at least 1"),
});

export const adminUpdateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email("Valid email is required").optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  timestamp: true,
});

export const makeCallSchema = z.object({
  callFrom: z.string().min(10, "Call from number is required"),
  callTo: z.string().min(10, "Call to number is required"),
  region: z.enum(["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"]),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  phone: text("phone").notNull(),
  originalPhone: text("original_phone").notNull(), // Store original input
  bulkCallId: integer("bulk_call_id"), // Link to bulk call campaign
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bulkCalls = pgTable("bulk_calls", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalContacts: integer("total_contacts").notNull(),
  completedCalls: integer("completed_calls").default(0),
  failedCalls: integer("failed_calls").default(0),
  status: text("status").notNull(), // 'pending', 'in-progress', 'completed', 'cancelled'
  region: text("region").notNull(),
  callFrom: text("call_from").notNull(),
  userId: integer("user_id").notNull(), // Track which user owns this campaign
  maxContacts: integer("max_contacts").notNull(), // Limited by user credits
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const xmlSettings = pgTable("xml_settings", {
  id: serial("id").primaryKey(),
  introFile: text("intro_file").default("intro.wav"),
  outroFile: text("outro_file").default("outro.wav"),
  connectAction: text("connect_action").default("https://vi-2-xeallrender.replit.app/connect"),
  inputTimeout: integer("input_timeout").default(50000),
  waitTime: integer("wait_time").default(2),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  concurrency: integer("concurrency").default(100), // Maximum concurrent calls per batch
  delayBetweenBatches: integer("delay_between_batches").default(2000), // Delay in milliseconds between batches
  delayBetweenCalls: integer("delay_between_calls").default(0), // Delay in milliseconds between individual calls within a batch
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookResponses = pgTable("webhook_responses", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  buttonPressed: text("button_pressed").notNull(), // '1', '2', etc.
  bulkCallId: integer("bulk_call_id"), // Link to bulk call campaign if found
  contactId: integer("contact_id"), // Link to specific contact if found
  contactName: text("contact_name"), // Store contact name if available
  contactEmail: text("contact_email"), // Store contact email if available
  campaignName: text("campaign_name"), // Store campaign name for easy reference
  userId: integer("user_id"), // Track which user owns this response data
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const updateXmlSchema = z.object({
  introFile: z.string().min(1, "Intro file is required"),
  outroFile: z.string().min(1, "Outro file is required"),
  connectAction: z.string().url("Connect action must be a valid URL").optional(),
  inputTimeout: z.number().int().min(1000).max(300000).optional(),
  waitTime: z.number().int().min(1).max(30).optional(),
});

export const updateSystemSettingsSchema = z.object({
  concurrency: z.number().int().min(1).max(1000).optional(),
  delayBetweenBatches: z.number().int().min(0).max(60000).optional(),
  delayBetweenCalls: z.number().int().min(0).max(10000).optional(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const bulkCallSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  callFrom: z.string().min(10, "Call from number is required"),
  region: z.enum(["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"]),
  contacts: z.string().min(1, "Contact data is required"),
});

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If 10 digits, add "1" prefix
  if (digits.length === 10) {
    return `1${digits}`;
  }
  
  // If 11 digits and starts with 1, use as-is
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }
  
  // Otherwise, use as-is (might be international)
  return digits;
};

export const insertWebhookResponseSchema = createInsertSchema(webhookResponses).omit({
  id: true,
  timestamp: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type AdminCreateUserRequest = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserRequest = z.infer<typeof adminUpdateUserSchema>;
export type AdminAddCreditsRequest = z.infer<typeof adminAddCreditsSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type BulkCall = typeof bulkCalls.$inferSelect;
export type WebhookResponse = typeof webhookResponses.$inferSelect;
export type XmlSettings = typeof xmlSettings.$inferSelect;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type MakeCallRequest = z.infer<typeof makeCallSchema>;
export type UpdateXmlRequest = z.infer<typeof updateXmlSchema>;
export type UpdateSystemSettingsRequest = z.infer<typeof updateSystemSettingsSchema>;
export type BulkCallRequest = z.infer<typeof bulkCallSchema>;

export type InsertCall = z.infer<typeof insertCallSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertWebhookResponse = z.infer<typeof insertWebhookResponseSchema>;

// Define database relations
export const usersRelations = relations(users, ({ many }) => ({
  calls: many(calls),
  bulkCalls: many(bulkCalls),
  webhookResponses: many(webhookResponses),
  systemLogs: many(systemLogs),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  user: one(users, {
    fields: [calls.userId],
    references: [users.id],
  }),
}));

export const bulkCallsRelations = relations(bulkCalls, ({ one, many }) => ({
  user: one(users, {
    fields: [bulkCalls.userId],
    references: [users.id],
  }),
  contacts: many(contacts),
  webhookResponses: many(webhookResponses),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  bulkCall: one(bulkCalls, {
    fields: [contacts.bulkCallId],
    references: [bulkCalls.id],
  }),
  webhookResponses: many(webhookResponses),
}));

export const webhookResponsesRelations = relations(webhookResponses, ({ one }) => ({
  user: one(users, {
    fields: [webhookResponses.userId],
    references: [users.id],
  }),
  bulkCall: one(bulkCalls, {
    fields: [webhookResponses.bulkCallId],
    references: [bulkCalls.id],
  }),
  contact: one(contacts, {
    fields: [webhookResponses.contactId],
    references: [contacts.id],
  }),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  user: one(users, {
    fields: [systemLogs.userId],
    references: [users.id],
  }),
}));

export const campaignStatusRelations = relations(campaignStatus, ({ one }) => ({
  activeCampaign: one(bulkCalls, {
    fields: [campaignStatus.activeCampaignId],
    references: [bulkCalls.id],
  }),
  activeUser: one(users, {
    fields: [campaignStatus.activeUserId],
    references: [users.id],
  }),
}));
