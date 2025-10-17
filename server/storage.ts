import {
  users,
  calls,
  xmlSettings,
  systemSettings,
  contacts,
  bulkCalls,
  webhookResponses,
  systemLogs,
  campaignStatus,
  type User,
  type InsertUser,
  type Call,
  type InsertCall,
  type XmlSettings,
  type UpdateXmlRequest,
  type SystemSettings,
  type UpdateSystemSettingsRequest,
  type Contact,
  type InsertContact,
  type BulkCall,
  type BulkCallRequest,
  type WebhookResponse,
  type InsertWebhookResponse,
  type LoginRequest,
  type RegisterRequest,
  type SystemLog,
  type AdminCreateUserRequest,
  type AdminUpdateUserRequest,
  type AdminAddCreditsRequest,
} from "@shared/schema.ts";
import { db } from "./db";
import { eq, desc, count, sql, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

export interface IStorage {
  // Authentication methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(username: string, password: string): Promise<User | null>;
  registerUser(userData: RegisterRequest): Promise<User>;

  // Call methods
  createCall(call: InsertCall): Promise<Call>;
  getCalls(limit?: number): Promise<Call[]>;
  getUserCalls(userId: number, limit?: number): Promise<Call[]>;
  getAllCalls(limit?: number): Promise<Call[]>;
  getCallsStats(): Promise<{ totalCalls: number; successfulCalls: number }>;

  // Contact methods
  createContact(contact: InsertContact): Promise<Contact>;
  createMultipleContacts(contacts: InsertContact[]): Promise<Contact[]>;
  getContacts(limit?: number): Promise<Contact[]>;
  getContactsByBulkCallId(bulkCallId: number): Promise<Contact[]>;

  // Bulk call methods
  createBulkCall(
    bulkCall: Omit<BulkCall, "id" | "createdAt" | "updatedAt">,
  ): Promise<BulkCall>;
  getBulkCalls(limit?: number): Promise<BulkCall[]>;
  getBulkCallById(id: number): Promise<BulkCall | undefined>;
  getUserBulkCalls(userId: number, limit?: number): Promise<BulkCall[]>;
  updateBulkCall(id: number, updates: Partial<BulkCall>): Promise<BulkCall>;

  // XML Settings methods
  getXmlSettings(): Promise<XmlSettings>;
  updateXmlSettings(settings: UpdateXmlRequest): Promise<XmlSettings>;

  // Webhook response methods
  createWebhookResponse(
    response: InsertWebhookResponse,
  ): Promise<WebhookResponse>;
  getContactsByPhoneNumber(phoneNumber: string): Promise<Contact[]>;
  getWebhookResponses(limit?: number): Promise<WebhookResponse[]>;
  getUserWebhookResponses(
    userId: number,
    limit?: number,
  ): Promise<WebhookResponse[]>;
  deleteWebhookResponse(id: number): Promise<boolean>;
  deleteUserWebhookResponse(id: number, userId: number): Promise<boolean>;

  // Credit system methods
  addCreditsToUser(userId: number, credits: number): Promise<User>;
  deductCredits(userId: number, amount: number): Promise<boolean>;
  getUserCredits(userId: number): Promise<number>;

  // Campaign status methods
  getActiveCampaign(): Promise<{
    campaignId: number | null;
    userId: number | null;
    isXmlLocked: boolean;
  }>;
  setActiveCampaign(
    campaignId: number | null,
    userId: number | null,
  ): Promise<void>;
  lockXmlUpdates(locked: boolean): Promise<void>;

  // Admin methods
  getAllUsers(limit?: number): Promise<User[]>;
  createUserByAdmin(
    userData: AdminCreateUserRequest,
  ): Promise<{ user: User; generatedPassword: string }>;
  updateUserByAdmin(id: number, updates: AdminUpdateUserRequest): Promise<User>;
  suspendUser(id: number): Promise<User>;
  unsuspendUser(id: number): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  getAllCalls(limit?: number): Promise<Call[]>;
  getSystemLogs(limit?: number): Promise<SystemLog[]>;
  createSystemLog(log: Omit<SystemLog, "id" | "timestamp">): Promise<SystemLog>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
  }>;
  getCallStats(): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    todayCalls: number;
  }>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Authentication methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async authenticateUser(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async registerUser(userData: RegisterRequest): Promise<User> {
    // Check if username or email already exists
    const existingUsername = await this.getUserByUsername(userData.username);
    if (existingUsername) {
      throw new Error("Username already exists");
    }

    const existingEmail = await this.getUserByEmail(userData.email);
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return this.createUser({
      ...userData,
      password: hashedPassword,
      role: "user",
      status: "active",
    });
  }

  // Call methods
  async createCall(callData: InsertCall): Promise<Call> {
    const [call] = await db
      .insert(calls)
      .values({
        ...callData,
        timestamp: new Date(),
      })
      .returning();
    return call;
  }

  async getCalls(limit: number = 50): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .orderBy(desc(calls.timestamp))
      .limit(limit);
  }

  async getUserCalls(userId: number, limit: number = 50): Promise<Call[]> {
    return await db
      .select()
      .from(calls)
      .where(eq(calls.userId, userId))
      .orderBy(desc(calls.timestamp))
      .limit(limit);
  }


  async getCallsStats(): Promise<{
    totalCalls: number;
    successfulCalls: number;
  }> {
    const allCalls = await db.select().from(calls);
    const totalCalls = allCalls.length;
    const successfulCalls = allCalls.filter(
      (call) => call.status === "completed",
    ).length;
    return { totalCalls, successfulCalls };
  }

  // Contact methods
  async createContact(contactData: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values({
        ...contactData,
        createdAt: new Date(),
      })
      .returning();
    return contact;
  }

  async createMultipleContacts(
    contactsData: InsertContact[],
  ): Promise<Contact[]> {
    const insertData = contactsData.map((contact) => ({
      ...contact,
      createdAt: new Date(),
    }));
    return await db.insert(contacts).values(insertData).returning();
  }

  async getContactsByBulkCallId(bulkCallId: number): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.bulkCallId, bulkCallId));
  }

  async getContacts(limit: number = 50): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .orderBy(desc(contacts.createdAt))
      .limit(limit);
  }

  async getContactsByPhoneNumber(phoneNumber: string): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, phoneNumber));
  }

  // Bulk call methods
  async createBulkCall(
    bulkCallData: Omit<BulkCall, "id" | "createdAt" | "updatedAt">,
  ): Promise<BulkCall> {
    const [bulkCall] = await db
      .insert(bulkCalls)
      .values({
        ...bulkCallData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return bulkCall;
  }

  async getBulkCalls(limit: number = 50): Promise<BulkCall[]> {
    return await db
      .select()
      .from(bulkCalls)
      .orderBy(desc(bulkCalls.createdAt))
      .limit(limit);
  }

  async getBulkCallById(id: number): Promise<BulkCall | undefined> {
    const [bulkCall] = await db
      .select()
      .from(bulkCalls)
      .where(eq(bulkCalls.id, id))
      .limit(1);
    return bulkCall;
  }

  async getUserBulkCalls(
    userId: number,
    limit: number = 50,
  ): Promise<BulkCall[]> {
    return await db
      .select()
      .from(bulkCalls)
      .where(eq(bulkCalls.userId, userId))
      .orderBy(desc(bulkCalls.createdAt))
      .limit(limit);
  }

  async updateBulkCall(
    id: number,
    updates: Partial<BulkCall>,
  ): Promise<BulkCall> {
    const [updatedBulkCall] = await db
      .update(bulkCalls)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(bulkCalls.id, id))
      .returning();

    if (!updatedBulkCall) {
      throw new Error(`Bulk call with id ${id} not found`);
    }
    return updatedBulkCall;
  }

  // XML Settings methods
  async getXmlSettings(): Promise<XmlSettings> {
    const [settings] = await db.select().from(xmlSettings).limit(1);

    // If no settings exist, create default ones
    if (!settings) {
      const [defaultSettings] = await db
        .insert(xmlSettings)
        .values({
          introFile: "intro.wav",
          outroFile: "outro.wav",
          connectAction: "https://vi-2-xeallrender.replit.app/connect",
          inputTimeout: 50000,
          waitTime: 2,
          updatedAt: new Date(),
        })
        .returning();
      return defaultSettings;
    }

    return settings;
  }

  async updateXmlSettings(
    settingsData: UpdateXmlRequest,
  ): Promise<XmlSettings> {
    // First ensure settings exist
    await this.getXmlSettings();

    const [updatedSettings] = await db
      .update(xmlSettings)
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .returning();

    return updatedSettings;
  }

  // System Settings methods
  async getSystemSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings).limit(1);

    // If no settings exist, create default ones
    if (!settings) {
      const [defaultSettings] = await db
        .insert(systemSettings)
        .values({
          concurrency: 100,
          delayBetweenBatches: 2000,
          delayBetweenCalls: 0,
          updatedAt: new Date(),
        })
        .returning();
      return defaultSettings;
    }

    return settings;
  }

  async updateSystemSettings(
    settingsData: UpdateSystemSettingsRequest,
  ): Promise<SystemSettings> {
    // First ensure settings exist
    await this.getSystemSettings();

    const [updatedSettings] = await db
      .update(systemSettings)
      .set({
        ...settingsData,
        updatedAt: new Date(),
      })
      .returning();

    return updatedSettings;
  }

  // Webhook response methods
  async createWebhookResponse(
    responseData: InsertWebhookResponse,
  ): Promise<WebhookResponse> {
    const [response] = await db
      .insert(webhookResponses)
      .values({
        ...responseData,
        timestamp: new Date(),
      })
      .returning();
    return response;
  }

  async getWebhookResponses(limit: number = 50): Promise<WebhookResponse[]> {
    return await db
      .select()
      .from(webhookResponses)
      .orderBy(desc(webhookResponses.timestamp))
      .limit(limit);
  }

  async getUserWebhookResponses(
    userId: number,
    limit: number = 50,
  ): Promise<WebhookResponse[]> {
    return await db
      .select()
      .from(webhookResponses)
      .where(eq(webhookResponses.userId, userId))
      .orderBy(desc(webhookResponses.timestamp))
      .limit(limit);
  }

  async deleteWebhookResponse(id: number): Promise<boolean> {
    const result = await db
      .delete(webhookResponses)
      .where(eq(webhookResponses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteUserWebhookResponse(
    id: number,
    userId: number,
  ): Promise<boolean> {
    const result = await db
      .delete(webhookResponses)
      .where(
        and(eq(webhookResponses.id, id), eq(webhookResponses.userId, userId)),
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Admin methods
  async getAllUsers(limit: number = 100): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
  }

  async createUserByAdmin(
    userData: AdminCreateUserRequest,
  ): Promise<{ user: User; generatedPassword: string }> {
    // Generate a random password
    const generatedPassword = nanoid(12);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "user",
        status: "active",
      })
      .returning();

    return { user, generatedPassword };
  }

  async updateUserByAdmin(
    id: number,
    updates: AdminUpdateUserRequest,
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async suspendUser(id: number): Promise<User> {
    return this.updateUserByAdmin(id, { status: "suspended" });
  }

  async unsuspendUser(id: number): Promise<User> {
    return this.updateUserByAdmin(id, { status: "active" });
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllCalls(limit: number = 100): Promise<Call[]> {
    return db.select().from(calls).orderBy(desc(calls.timestamp)).limit(limit);
  }

  async getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
    return db
      .select()
      .from(systemLogs)
      .orderBy(desc(systemLogs.timestamp))
      .limit(limit);
  }

  async createSystemLog(
    log: Omit<SystemLog, "id" | "timestamp">,
  ): Promise<SystemLog> {
    const [systemLog] = await db.insert(systemLogs).values(log).returning();
    return systemLog;
  }

  // Credit management methods
  async getUserCredits(userId: number): Promise<number> {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));
    return user?.credits || 0;
  }

  async addUserCredits(userId: number, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async setUserCredits(userId: number, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: credits,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async deductUserCredits(userId: number, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`GREATEST(0, ${users.credits} - ${credits})`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
  }> {
    const [stats] = await db
      .select({
        totalUsers: count(),
        activeUsers: sql<number>`count(*) filter (where ${users.status} = 'active')`,
        suspendedUsers: sql<number>`count(*) filter (where ${users.status} = 'suspended')`,
      })
      .from(users);

    return {
      totalUsers: Number(stats.totalUsers),
      activeUsers: Number(stats.activeUsers),
      suspendedUsers: Number(stats.suspendedUsers),
    };
  }

  async getCallStats(): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    todayCalls: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats] = await db
      .select({
        totalCalls: count(),
        successfulCalls: sql<number>`count(*) filter (where ${calls.status} = 'completed')`,
        failedCalls: sql<number>`count(*) filter (where ${calls.status} = 'failed')`,
        todayCalls: sql<number>`count(*) filter (where ${calls.timestamp} >= ${today})`,
      })
      .from(calls);

    return {
      totalCalls: Number(stats.totalCalls),
      successfulCalls: Number(stats.successfulCalls),
      failedCalls: Number(stats.failedCalls),
      todayCalls: Number(stats.todayCalls),
    };
  }

  // Credit system methods
  async addCreditsToUser(userId: number, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async deductCredits(userId: number, amount: number = 1): Promise<boolean> {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || (user.credits ?? 0) < amount) {
      return false; // Insufficient credits
    }

    await db
      .update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  }

  // Campaign status methods
  async getActiveCampaign(): Promise<{
    campaignId: number | null;
    userId: number | null;
    isXmlLocked: boolean;
  }> {
    const [status] = await db.select().from(campaignStatus).limit(1);

    if (!status) {
      // Initialize if not exists
      await db.insert(campaignStatus).values({
        activeCampaignId: null,
        activeUserId: null,
        isXmlLocked: 0,
      });
      return { campaignId: null, userId: null, isXmlLocked: false };
    }

    return {
      campaignId: status.activeCampaignId,
      userId: status.activeUserId,
      isXmlLocked: Boolean(status.isXmlLocked),
    };
  }

  async setActiveCampaign(
    campaignId: number | null,
    userId: number | null,
  ): Promise<void> {
    await db.update(campaignStatus).set({
      activeCampaignId: campaignId,
      activeUserId: userId,
      lastUpdated: new Date(),
    });
  }

  async lockXmlUpdates(locked: boolean): Promise<void> {
    await db.update(campaignStatus).set({
      isXmlLocked: locked ? 1 : 0,
      lastUpdated: new Date(),
    });
  }
}

export const storage = new DatabaseStorage();
