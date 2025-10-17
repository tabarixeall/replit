"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignStatusRelations = exports.systemLogsRelations = exports.webhookResponsesRelations = exports.contactsRelations = exports.bulkCallsRelations = exports.callsRelations = exports.usersRelations = exports.insertWebhookResponseSchema = exports.formatPhoneNumber = exports.bulkCallSchema = exports.insertContactSchema = exports.updateSystemSettingsSchema = exports.updateXmlSchema = exports.webhookResponses = exports.systemSettings = exports.xmlSettings = exports.bulkCalls = exports.contacts = exports.makeCallSchema = exports.insertCallSchema = exports.adminUpdateUserSchema = exports.adminAddCreditsSchema = exports.adminCreateUserSchema = exports.registerSchema = exports.loginSchema = exports.insertUserSchema = exports.campaignStatus = exports.systemLogs = exports.calls = exports.users = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
var drizzle_zod_1 = require("drizzle-zod");
var zod_1 = require("zod");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    firstName: (0, pg_core_1.text)("first_name"),
    lastName: (0, pg_core_1.text)("last_name"),
    role: (0, pg_core_1.text)("role").default("user"), // 'admin', 'user'
    status: (0, pg_core_1.text)("status").default("active"), // 'active', 'suspended', 'deleted'
    credits: (0, pg_core_1.integer)("credits").default(0), // Call credits
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at"),
    totalCalls: (0, pg_core_1.integer)("total_calls").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.calls = (0, pg_core_1.pgTable)("calls", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    callFrom: (0, pg_core_1.text)("call_from").notNull(),
    callTo: (0, pg_core_1.text)("call_to").notNull(),
    region: (0, pg_core_1.text)("region").notNull(),
    status: (0, pg_core_1.text)("status").notNull(), // 'completed', 'failed', 'in-progress'
    duration: (0, pg_core_1.text)("duration"), // formatted duration like "2:34"
    callId: (0, pg_core_1.text)("call_id"), // API response call ID
    errorMessage: (0, pg_core_1.text)("error_message"),
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
    userId: (0, pg_core_1.integer)("user_id"), // Track which user made the call
    creditsCost: (0, pg_core_1.integer)("credits_cost").default(1), // Credits deducted for this call
});
// System logs for admin monitoring
exports.systemLogs = (0, pg_core_1.pgTable)("system_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id"),
    action: (0, pg_core_1.text)("action").notNull(), // 'login', 'logout', 'call_made', 'user_created', etc.
    details: (0, pg_core_1.text)("details"), // JSON string with additional info
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
});
// System-wide campaign status - only one active campaign allowed
exports.campaignStatus = (0, pg_core_1.pgTable)("campaign_status", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    activeCampaignId: (0, pg_core_1.integer)("active_campaign_id"), // null if no campaign running
    activeUserId: (0, pg_core_1.integer)("active_user_id"), // which user owns the active campaign
    isXmlLocked: (0, pg_core_1.integer)("is_xml_locked").default(0), // 1 if XML updates are blocked
    lastUpdated: (0, pg_core_1.timestamp)("last_updated").defaultNow().notNull(),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, "Username is required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
});
exports.registerSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"),
    email: zod_1.z.string().email("Valid email is required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
});
// Admin schemas
exports.adminCreateUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(3, "Username must be at least 3 characters"),
    email: zod_1.z.string().email("Valid email is required"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    role: zod_1.z.enum(["user", "admin"]).default("user"),
    credits: zod_1.z.number().int().min(0).optional(),
});
exports.adminAddCreditsSchema = zod_1.z.object({
    userId: zod_1.z.number().int().min(1),
    credits: zod_1.z.number().int().min(1, "Credits must be at least 1"),
});
exports.adminUpdateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, "First name is required").optional(),
    lastName: zod_1.z.string().min(1, "Last name is required").optional(),
    email: zod_1.z.string().email("Valid email is required").optional(),
    role: zod_1.z.enum(["user", "admin"]).optional(),
    status: zod_1.z.enum(["active", "suspended", "deleted"]).optional(),
});
exports.insertCallSchema = (0, drizzle_zod_1.createInsertSchema)(exports.calls).omit({
    id: true,
    timestamp: true,
});
exports.makeCallSchema = zod_1.z.object({
    callFrom: zod_1.z.string().min(10, "Call from number is required"),
    callTo: zod_1.z.string().min(10, "Call to number is required"),
    region: zod_1.z.enum(["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"]),
});
exports.contacts = (0, pg_core_1.pgTable)("contacts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name"),
    email: (0, pg_core_1.text)("email"),
    phone: (0, pg_core_1.text)("phone").notNull(),
    originalPhone: (0, pg_core_1.text)("original_phone").notNull(), // Store original input
    bulkCallId: (0, pg_core_1.integer)("bulk_call_id"), // Link to bulk call campaign
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.bulkCalls = (0, pg_core_1.pgTable)("bulk_calls", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    totalContacts: (0, pg_core_1.integer)("total_contacts").notNull(),
    completedCalls: (0, pg_core_1.integer)("completed_calls").default(0),
    failedCalls: (0, pg_core_1.integer)("failed_calls").default(0),
    status: (0, pg_core_1.text)("status").notNull(), // 'pending', 'in-progress', 'completed', 'cancelled'
    region: (0, pg_core_1.text)("region").notNull(),
    callFrom: (0, pg_core_1.text)("call_from").notNull(),
    userId: (0, pg_core_1.integer)("user_id").notNull(), // Track which user owns this campaign
    maxContacts: (0, pg_core_1.integer)("max_contacts").notNull(), // Limited by user credits
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.xmlSettings = (0, pg_core_1.pgTable)("xml_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    introFile: (0, pg_core_1.text)("intro_file").default("intro.wav"),
    outroFile: (0, pg_core_1.text)("outro_file").default("outro.wav"),
    connectAction: (0, pg_core_1.text)("connect_action").default("https://vi-2-xeallrender.replit.app/connect"),
    inputTimeout: (0, pg_core_1.integer)("input_timeout").default(50000),
    waitTime: (0, pg_core_1.integer)("wait_time").default(2),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.systemSettings = (0, pg_core_1.pgTable)("system_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    concurrency: (0, pg_core_1.integer)("concurrency").default(100), // Maximum concurrent calls per batch
    delayBetweenBatches: (0, pg_core_1.integer)("delay_between_batches").default(2000), // Delay in milliseconds between batches
    delayBetweenCalls: (0, pg_core_1.integer)("delay_between_calls").default(0), // Delay in milliseconds between individual calls within a batch
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.webhookResponses = (0, pg_core_1.pgTable)("webhook_responses", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    phoneNumber: (0, pg_core_1.text)("phone_number").notNull(),
    buttonPressed: (0, pg_core_1.text)("button_pressed").notNull(), // '1', '2', etc.
    bulkCallId: (0, pg_core_1.integer)("bulk_call_id"), // Link to bulk call campaign if found
    contactId: (0, pg_core_1.integer)("contact_id"), // Link to specific contact if found
    contactName: (0, pg_core_1.text)("contact_name"), // Store contact name if available
    contactEmail: (0, pg_core_1.text)("contact_email"), // Store contact email if available
    campaignName: (0, pg_core_1.text)("campaign_name"), // Store campaign name for easy reference
    userId: (0, pg_core_1.integer)("user_id"), // Track which user owns this response data
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
});
exports.updateXmlSchema = zod_1.z.object({
    introFile: zod_1.z.string().min(1, "Intro file is required"),
    outroFile: zod_1.z.string().min(1, "Outro file is required"),
    connectAction: zod_1.z.string().url("Connect action must be a valid URL").optional(),
    inputTimeout: zod_1.z.number().int().min(1000).max(300000).optional(),
    waitTime: zod_1.z.number().int().min(1).max(30).optional(),
});
exports.updateSystemSettingsSchema = zod_1.z.object({
    concurrency: zod_1.z.number().int().min(1).max(1000).optional(),
    delayBetweenBatches: zod_1.z.number().int().min(0).max(60000).optional(),
    delayBetweenCalls: zod_1.z.number().int().min(0).max(10000).optional(),
});
exports.insertContactSchema = (0, drizzle_zod_1.createInsertSchema)(exports.contacts).omit({
    id: true,
    createdAt: true,
});
exports.bulkCallSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Campaign name is required"),
    callFrom: zod_1.z.string().min(10, "Call from number is required"),
    region: zod_1.z.enum(["US-EAST", "US-WEST", "EU-CENTRAL", "ASIA-PACIFIC"]),
    contacts: zod_1.z.string().min(1, "Contact data is required"),
});
var formatPhoneNumber = function (phone) {
    // Remove all non-digit characters
    var digits = phone.replace(/\D/g, '');
    // If 10 digits, add "1" prefix
    if (digits.length === 10) {
        return "1".concat(digits);
    }
    // If 11 digits and starts with 1, use as-is
    if (digits.length === 11 && digits.startsWith('1')) {
        return digits;
    }
    // Otherwise, use as-is (might be international)
    return digits;
};
exports.formatPhoneNumber = formatPhoneNumber;
exports.insertWebhookResponseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.webhookResponses).omit({
    id: true,
    timestamp: true,
});
// Define database relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, function (_a) {
    var many = _a.many;
    return ({
        calls: many(exports.calls),
        bulkCalls: many(exports.bulkCalls),
        webhookResponses: many(exports.webhookResponses),
        systemLogs: many(exports.systemLogs),
    });
});
exports.callsRelations = (0, drizzle_orm_1.relations)(exports.calls, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.calls.userId],
            references: [exports.users.id],
        }),
    });
});
exports.bulkCallsRelations = (0, drizzle_orm_1.relations)(exports.bulkCalls, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, {
            fields: [exports.bulkCalls.userId],
            references: [exports.users.id],
        }),
        contacts: many(exports.contacts),
        webhookResponses: many(exports.webhookResponses),
    });
});
exports.contactsRelations = (0, drizzle_orm_1.relations)(exports.contacts, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        bulkCall: one(exports.bulkCalls, {
            fields: [exports.contacts.bulkCallId],
            references: [exports.bulkCalls.id],
        }),
        webhookResponses: many(exports.webhookResponses),
    });
});
exports.webhookResponsesRelations = (0, drizzle_orm_1.relations)(exports.webhookResponses, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.webhookResponses.userId],
            references: [exports.users.id],
        }),
        bulkCall: one(exports.bulkCalls, {
            fields: [exports.webhookResponses.bulkCallId],
            references: [exports.bulkCalls.id],
        }),
        contact: one(exports.contacts, {
            fields: [exports.webhookResponses.contactId],
            references: [exports.contacts.id],
        }),
    });
});
exports.systemLogsRelations = (0, drizzle_orm_1.relations)(exports.systemLogs, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.systemLogs.userId],
            references: [exports.users.id],
        }),
    });
});
exports.campaignStatusRelations = (0, drizzle_orm_1.relations)(exports.campaignStatus, function (_a) {
    var one = _a.one;
    return ({
        activeCampaign: one(exports.bulkCalls, {
            fields: [exports.campaignStatus.activeCampaignId],
            references: [exports.bulkCalls.id],
        }),
        activeUser: one(exports.users, {
            fields: [exports.campaignStatus.activeUserId],
            references: [exports.users.id],
        }),
    });
});
