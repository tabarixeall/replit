import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { wsManager } from "./websocket";
import { makeCallSchema, updateXmlSchema, updateSystemSettingsSchema, bulkCallSchema, formatPhoneNumber, loginSchema, registerSchema, adminCreateUserSchema, adminUpdateUserSchema, type MakeCallRequest, type UpdateXmlRequest, type UpdateSystemSettingsRequest, type BulkCallRequest, type LoginRequest, type RegisterRequest, type AdminCreateUserRequest, type AdminUpdateUserRequest } from "@shared/schema.ts";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import dotenv from 'dotenv';
dotenv.config();

// Async function to execute bulk calling
async function executeBulkCalling(bulkCallId: number, bulkCall: any, userId: number) {
  try {
    console.log(`Starting bulk call campaign: ${bulkCall.name} for user ${userId}`);
    
    // Get system settings for dynamic configuration
    const systemSettings = await storage.getSystemSettings();
    const BATCH_SIZE = systemSettings.concurrency || 100;
    const DELAY_BETWEEN_BATCHES = systemSettings.delayBetweenBatches || 2000;
    const DELAY_BETWEEN_CALLS = systemSettings.delayBetweenCalls || 0;
    
    console.log(`Using system settings - Concurrency: ${BATCH_SIZE}, Batch Delay: ${DELAY_BETWEEN_BATCHES}ms, Call Delay: ${DELAY_BETWEEN_CALLS}ms`);
    
    // Get contacts specifically linked to this bulk call campaign
    const contacts = await storage.getContactsByBulkCallId(bulkCallId);
    let completedCalls = 0;
    let failedCalls = 0;
    
    // Process contacts with controlled concurrency
    console.log(`Total contacts to process: ${contacts.length}`);
    
    const batches = [];
    
    // Split contacts into batches
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      batches.push(contacts.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${contacts.length} contacts in ${batches.length} batch(es) of up to ${BATCH_SIZE} concurrent calls`);
    
    // Process each batch concurrently
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} contacts`);
      
      // Check if campaign was cancelled
      const updatedBulkCall = await storage.getBulkCallById(bulkCallId);
      if (updatedBulkCall?.status === 'cancelled') {
        console.log(`Campaign ${bulkCallId} was cancelled. Stopping execution.`);
        break;
      }
      
      // Check if user still has credits before processing batch
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits <= 0) {
        console.log(`User ${userId} ran out of credits. Stopping campaign.`);
        break;
      }
      
      // Process all contacts in this batch concurrently
      const batchPromises = batch.map(async (contact, contactIndex) => {
        const globalIndex = batchIndex * BATCH_SIZE + contactIndex + 1;
        console.log(`Processing call ${globalIndex}/${contacts.length} to ${contact.phone}`);
        
        try {
          // Make the API call using the same logic as single calls
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
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Apidaze API error: ${response.status} - ${errorText}`);
          }

          const result = await response.json();

          // Check if the call actually succeeded based on response content
          // Apidaze returns 202 for both success and failure, but response body differs
          if (result.failure || (typeof result === 'object' && 'failure' in result)) {
            // This is actually a failed call despite 202 status
            throw new Error(`Apidaze call failed: ${result.failure || 'Unknown failure'}`);
          }

          // Check for success indicators (ok field or call_uuid/id)
          if (!result.ok && !result.call_uuid && !result.id) {
            throw new Error(`Apidaze call failed: No success indicators in response`);
          }

          // Call was successful - create call record
          await storage.createCall({
            callFrom: bulkCall.callFrom,
            callTo: contact.phone,
            region: bulkCall.region,
            status: 'completed',
            duration: null,
            callId: result.call_uuid || result.id || 'unknown',
            errorMessage: null,
            userId: userId,
            creditsCost: 1
          });
          
          // Deduct credits for successful call
          await storage.deductCredits(userId, 1);
          console.log(`Call successful to ${contact.phone} (${globalIndex}/${contacts.length}). Credits deducted.`);
          return { success: true, contact };

        } catch (callError: any) {
          console.error(`Error calling ${contact.phone} (${globalIndex}/${contacts.length}):`, callError);
          
          // Create failed call record
          await storage.createCall({
            callFrom: bulkCall.callFrom,
            callTo: contact.phone,
            region: bulkCall.region,
            status: 'failed',
            duration: null,
            callId: null,
            errorMessage: callError.message || 'Network error',
            userId: userId,
            creditsCost: 1
          });
          
          // Deduct credits even for failed calls
          await storage.deductCredits(userId, 1);
          console.log(`Call failed to ${contact.phone} (${globalIndex}/${contacts.length}). Credits deducted.`);
          return { success: false, contact, error: callError.message };
        }
      });
      
      // Wait for all calls in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Count results from this batch
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          completedCalls++;
        } else {
          failedCalls++;
        }
      });
      
      // Update progress after each batch
      await storage.updateBulkCall(bulkCallId, {
        completedCalls,
        failedCalls,
        updatedAt: new Date()
      });
      
      console.log(`Batch ${batchIndex + 1}/${batches.length} completed. Total completed: ${completedCalls}, failed: ${failedCalls}`);
      
      // Delay between batches as configured in system settings
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Update bulk call campaign with final results and clear campaign status
    const finalBulkCall = await storage.getBulkCallById(bulkCallId);
    const finalStatus = finalBulkCall?.status === 'cancelled' ? 'cancelled' : 'completed';
    
    await storage.updateBulkCall(bulkCallId, {
      status: finalStatus,
      completedCalls,
      failedCalls,
      updatedAt: new Date()
    });

    // Clear active campaign and unlock XML updates
    await storage.setActiveCampaign(null, null);
    await storage.lockXmlUpdates(false);

    console.log(`Bulk call campaign "${bulkCall.name}" completed: ${completedCalls} successful, ${failedCalls} failed`);

  } catch (error) {
    console.error(`Bulk call campaign "${bulkCall.name}" failed:`, error);
    
    // Mark campaign as failed and clear active status
    await storage.updateBulkCall(bulkCallId, {
      status: 'failed',
      updatedAt: new Date()
    });

    // Clear active campaign and unlock XML updates
    await storage.setActiveCampaign(null, null);
    await storage.lockXmlUpdates(false);
  }
}

const API_KEY = process.env.APIDAZE_API_KEY || process.env.API_KEY;
const API_SECRET = process.env.APIDAZE_API_SECRET || process.env.API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.warn("Warning: APIDAZE_API_KEY and APIDAZE_API_SECRET environment variables are not set");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60, // 7 days
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Admin authentication middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Registration disabled for normal users - only admins can create users

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(loginData.username, loginData.password);
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid username or password" 
        });
      }
      
      // Don't send password back
      const safeUser = { ...user, password: undefined };
      req.session.user = safeUser;
      
      res.json({ 
        success: true, 
        user: safeUser,
        message: "Login successful" 
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false,
        message: error.message || "Login failed" 
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          message: "Logout failed" 
        });
      }
      res.clearCookie('connect.sid');
      res.json({ 
        success: true,
        message: "Logout successful" 
      });
    });
  });

  app.get("/api/auth/me", (req, res) => {
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

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ success: true, users });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const userData = adminCreateUserSchema.parse(req.body);
      const result = await storage.createUserByAdmin(userData);
      
      // If credits are specified, add them to the user
      if (userData.credits && userData.credits > 0) {
        await storage.addCreditsToUser(result.user.id, userData.credits);
        result.user.credits = userData.credits;
      }
      
      // Log admin action
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: 'user_created',
        details: JSON.stringify({ 
          createdUserId: result.user.id, 
          username: result.user.username,
          initialCredits: userData.credits || 0
        }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(201).json({ 
        success: true, 
        user: { ...result.user, password: undefined },
        generatedPassword: result.generatedPassword,
        message: "User created successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  // Add credits to user
  app.post("/api/admin/users/:id/credits", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { credits } = req.body;
      
      if (!credits || credits <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Credits must be a positive number'
        });
      }

      const user = await storage.addCreditsToUser(userId, credits);
      
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: 'credits_added',
        details: JSON.stringify({ targetUserId: userId, creditsAdded: credits }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        user: { ...user, password: undefined },
        message: `Added ${credits} credits to user`
      });
    } catch (error: any) {
      console.error('Add credits error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add credits'
      });
    }
  });

  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = adminUpdateUserSchema.parse(req.body);
      const user = await storage.updateUserByAdmin(id, updates);
      
      // Log admin action
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: 'user_updated',
        details: JSON.stringify({ updatedUserId: id, updates }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ 
        success: true, 
        user: { ...user, password: undefined },
        message: "User updated successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post("/api/admin/users/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.suspendUser(id);
      
      // Log admin action
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: 'user_suspended',
        details: JSON.stringify({ suspendedUserId: id }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ 
        success: true, 
        user: { ...user, password: undefined },
        message: "User suspended successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post("/api/admin/users/:id/unsuspend", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.unsuspendUser(id);
      
      // Log admin action
      await storage.createSystemLog({
        userId: req.session.user.id,
        action: 'user_unsuspended',
        details: JSON.stringify({ unsuspendedUserId: id }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.json({ 
        success: true, 
        user: { ...user, password: undefined },
        message: "User unsuspended successfully" 
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      
      if (success) {
        // Log admin action
        await storage.createSystemLog({
          userId: req.session.user.id,
          action: 'user_deleted',
          details: JSON.stringify({ deletedUserId: id }),
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });
        
        res.json({ success: true, message: "User deleted successfully" });
      } else {
        res.status(404).json({ success: false, message: "User not found" });
      }
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get("/api/admin/calls", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const calls = await storage.getAllCalls(limit);
      res.json({ success: true, calls });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin bulk calls (all campaigns)
  app.get("/api/admin/bulk-calls", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const bulkCalls = await storage.getBulkCalls(limit);
      res.json({ success: true, bulkCalls });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Admin webhook responses (all responses)
  app.get("/api/admin/webhook-responses", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const responses = await storage.getWebhookResponses(limit);
      res.json(responses);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch webhook responses' });
    }
  });

  app.get("/api/admin/logs", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getSystemLogs();
      res.json({ success: true, logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [userStats, callStats] = await Promise.all([
        storage.getUserStats(),
        storage.getCallStats()
      ]);
      
      res.json({ 
        success: true, 
        stats: { ...userStats, ...callStats }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Make a call (protected route)
  app.post("/api/calls", requireAuth, async (req, res) => {
    try {
      const callData = makeCallSchema.parse(req.body);
      const userId = req.session.user.id;
      
      // Check if user has sufficient credits
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits <= 0) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient credits. Contact your administrator to add more credits.',
          credits: userCredits
        });
      }

      // Check if any campaign is currently active
      const campaignStatus = await storage.getActiveCampaign();
      if (campaignStatus.campaignId !== null) {
        return res.status(423).json({
          success: false,
          error: 'Another user has an active bulk calling campaign. Please wait until it completes.',
          activeCampaign: campaignStatus.campaignId,
          activeUser: campaignStatus.userId
        });
      }
      
      // Prepare Apidaze API request
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
        // Make actual API call to Apidaze
        const response = await fetch(`${apiUrl}?${params}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Apidaze API error: ${response.status} - ${errorText}`);
        }

        const apiResult = await response.json();
        
        // Check if the call actually succeeded based on response content
        // Apidaze returns 202 for both success and failure, but response body differs
        if (apiResult.failure || (typeof apiResult === 'object' && 'failure' in apiResult)) {
          // This is actually a failed call despite 202 status
          throw new Error(`Apidaze call failed: ${apiResult.failure || 'Unknown failure'}`);
        }

        // Check for success indicators (ok field or call_uuid/id)
        if (!apiResult.ok && !apiResult.call_uuid && !apiResult.id) {
          throw new Error(`Apidaze call failed: No success indicators in response`);
        }
        
        // Store successful call in history
        const call = await storage.createCall({
          callFrom: callData.callFrom,
          callTo: callData.callTo,
          region: callData.region,
          status: 'completed',
          callId: apiResult.call_uuid || apiResult.id || 'unknown',
          duration: null,
          errorMessage: null,
          userId: userId,
          creditsCost: 1
        });

        // Deduct credits after successful call creation
        await storage.deductCredits(userId, 1);
        const remainingCredits = await storage.getUserCredits(userId);

        res.json({
          success: true,
          call_id: apiResult.call_uuid || apiResult.id,
          message: `Call initiated to ${callData.callTo}`,
          call,
          remainingCredits
        });

      } catch (apiError: any) {
        // Store failed call in history
        const call = await storage.createCall({
          callFrom: callData.callFrom,
          callTo: callData.callTo,
          region: callData.region,
          status: 'failed',
          callId: null,
          duration: null,
          errorMessage: apiError.message,
          userId: userId,
          creditsCost: 1
        });

        // Deduct credits even for failed calls
        await storage.deductCredits(userId, 1);
        const remainingCredits = await storage.getUserCredits(userId);

        res.status(400).json({
          success: false,
          error: apiError.message || 'Failed to initiate call',
          call,
          remainingCredits
        });
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  });

  // Get call history
  app.get("/api/calls", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const calls = await storage.getUserCalls(userId, limit);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch call history' });
    }
  });

  // Get call stats
  app.get("/api/calls/stats", async (req, res) => {
    try {
      const stats = await storage.getCallsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch call stats' });
    }
  });

  // Get available media files from Apidaze
  app.get("/api/mediafiles", async (req, res) => {
    try {
      if (!API_KEY || !API_SECRET) {
        return res.status(400).json({ error: 'Apidaze credentials not configured' });
      }

      const apiUrl = `https://api.apidaze.io/${API_KEY}/mediafiles`;
      const params = new URLSearchParams({
        api_secret: API_SECRET
      });

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Apidaze API error: ${response.status} - ${errorText}`);
      }

      const mediaFiles = await response.json();
      res.json(mediaFiles);
    } catch (error: any) {
      res.status(500).json({ 
        error: 'Failed to fetch media files', 
        details: error.message 
      });
    }
  });

  // Get XML settings
  app.get("/api/xml-settings", async (req, res) => {
    try {
      const settings = await storage.getXmlSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch XML settings' });
    }
  });

  // Update XML settings
  app.put("/api/xml-settings", async (req, res) => {
    try {
      const settingsData = updateXmlSchema.parse(req.body);
      const updatedSettings = await storage.updateXmlSettings(settingsData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid settings data',
          details: error.errors
        });
      } else {
        res.status(500).json({ error: 'Failed to update XML settings' });
      }
    }
  });

  // Get System settings
  app.get("/api/system-settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch system settings' });
    }
  });

  // Update System settings
  app.put("/api/system-settings", async (req, res) => {
    try {
      const settingsData = updateSystemSettingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSystemSettings(settingsData);
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid settings data',
          details: error.errors
        });
      } else {
        res.status(500).json({ error: 'Failed to update system settings' });
      }
    }
  });

  // Parse and create bulk call campaign
  app.post("/api/bulk-calls", requireAuth, async (req, res) => {
    try {
      const bulkData = bulkCallSchema.parse(req.body);
      const userId = req.session.user.id;
      
      // Check if another campaign is currently active
      const campaignStatus = await storage.getActiveCampaign();
      if (campaignStatus.campaignId !== null) {
        return res.status(423).json({
          success: false,
          error: 'Another user has an active bulk calling campaign. Please wait until it completes.',
          activeCampaign: campaignStatus.campaignId,
          activeUser: campaignStatus.userId
        });
      }

      // Check user credits
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits <= 0) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient credits. Contact your administrator to add more credits.',
          credits: userCredits
        });
      }
      
      // Parse contact data (supports Email|Name|Phone or just Phone per line)
      const lines = bulkData.contacts.trim().split('\n').filter(line => line.trim());
      const contacts = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        if (trimmedLine.includes('|')) {
          // Format: Email|Name|Phone
          const parts = trimmedLine.split('|').map(p => p.trim());
          if (parts.length >= 3) {
            const [email, name, phone] = parts;
            const formattedPhone = formatPhoneNumber(phone);
            if (formattedPhone.length >= 10) {
              contacts.push({
                email: email || null,
                name: name || null,
                phone: formattedPhone,
                originalPhone: phone
              });
            }
          }
        } else {
          // Format: Just phone number
          const formattedPhone = formatPhoneNumber(trimmedLine);
          if (formattedPhone.length >= 10) {
            contacts.push({
              email: null,
              name: null,
              phone: formattedPhone,
              originalPhone: trimmedLine
            });
          }
        }
      }
      
      if (contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid contacts found in the provided data'
        });
      }

      // Enforce 200 contact limit per campaign
      if (contacts.length > 200) {
        return res.status(400).json({
          success: false,
          error: `Campaign cannot exceed 200 contacts. You provided ${contacts.length} contacts.`
        });
      }

      // Limit contacts based on available credits
      const maxContactsFromCredits = Math.min(contacts.length, userCredits);
      const contactsToProcess = contacts.slice(0, maxContactsFromCredits);
      
      // Create bulk call campaign first to get the ID
      const bulkCall = await storage.createBulkCall({
        name: bulkData.name,
        totalContacts: contactsToProcess.length,
        completedCalls: 0,
        failedCalls: 0,
        status: 'pending',
        region: bulkData.region,
        callFrom: bulkData.callFrom,
        userId: userId,
        maxContacts: Math.min(200, contactsToProcess.length)
      });

      // Create contacts linked to this bulk call campaign
      const contactsWithBulkCallId = contactsToProcess.map(contact => ({
        ...contact,
        bulkCallId: bulkCall.id
      }));
      await storage.createMultipleContacts(contactsWithBulkCallId);
      
      const message = contactsToProcess.length < contacts.length 
        ? `Bulk call campaign "${bulkData.name}" created with ${contactsToProcess.length} contacts (limited by available credits: ${userCredits}). ${contacts.length - contactsToProcess.length} contacts were excluded.`
        : `Bulk call campaign "${bulkData.name}" created with ${contactsToProcess.length} contacts`;

      res.json({
        success: true,
        bulkCall,
        contactsCreated: contactsToProcess.length,
        contactsExcluded: contacts.length - contactsToProcess.length,
        userCredits: userCredits,
        message
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid bulk call data',
          details: error.errors
        });
      } else {
        console.error('Bulk call creation error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create bulk call campaign'
        });
      }
    }
  });

  // Get bulk call campaigns
  app.get("/api/bulk-calls", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const bulkCalls = await storage.getUserBulkCalls(userId, limit);
      res.json(bulkCalls);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bulk call campaigns' });
    }
  });

  // Start bulk calling process
  app.post("/api/bulk-calls/:id/start", requireAuth, async (req, res) => {
    try {
      const bulkCallId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
      // Check if another campaign is currently active
      const campaignStatus = await storage.getActiveCampaign();
      if (campaignStatus.campaignId !== null && campaignStatus.campaignId !== bulkCallId) {
        return res.status(423).json({
          success: false,
          error: 'Another bulk calling campaign is already active. Please wait until it completes.',
          activeCampaign: campaignStatus.campaignId,
          activeUser: campaignStatus.userId
        });
      }

      // Get the bulk call to verify ownership
      const userBulkCalls = await storage.getUserBulkCalls(userId, 1000);
      const targetCampaign = userBulkCalls.find(bc => bc.id === bulkCallId);
      
      if (!targetCampaign) {
        return res.status(404).json({
          success: false,
          error: 'Bulk call campaign not found'
        });
      }

      if (targetCampaign.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only start your own campaigns'
        });
      }

      // Check user credits
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits < targetCampaign.totalContacts) {
        return res.status(403).json({
          success: false,
          error: `Insufficient credits. Campaign requires ${targetCampaign.totalContacts} credits, but you have ${userCredits}.`,
          required: targetCampaign.totalContacts,
          available: userCredits
        });
      }

      // Set this campaign as active
      await storage.setActiveCampaign(bulkCallId, userId);
      await storage.lockXmlUpdates(true);
      
      const bulkCall = await storage.updateBulkCall(bulkCallId, { 
        status: 'in-progress',
        updatedAt: new Date()
      });
      
      // Respond immediately to the client
      res.json({
        success: true,
        message: `Bulk call campaign "${bulkCall.name}" started`,
        bulkCall
      });
      
      // Start the async bulk calling process
      executeBulkCalling(bulkCallId, bulkCall, userId);
      
    } catch (error) {
      console.error('Start bulk call error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start bulk call campaign'
      });
    }
  });

  // Get contacts
  app.get("/api/contacts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const contacts = await storage.getContacts(limit);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // Get webhook responses (button presses) - user-specific
  app.get("/api/webhook-responses", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const responses = await storage.getUserWebhookResponses(userId, limit);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook responses' });
    }
  });

  // Delete webhook response (for users - only their own data)
  app.delete("/api/webhook-responses/:id", requireAuth, async (req, res) => {
    try {
      const responseId = parseInt(req.params.id);
      const userId = req.session.user.id;

      // First check if the response belongs to this user
      const responses = await storage.getWebhookResponses(1000);
      const response = responses.find(r => r.id === responseId);
      
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

  // Admin delete webhook response (can delete any response)
  app.delete("/api/admin/webhook-responses/:id", requireAuth, requireAdmin, async (req, res) => {
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

  // Serve XML script for Apidaze call flow (now using dynamic settings)
  app.get("/call-script.xml", async (req, res) => {
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
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache'
      });
      res.send(xmlScript);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate XML script' });
    }
  });

  // Alternative endpoint for redundancy
  app.get("/api/call-script", async (req, res) => {
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
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache'
      });
      res.send(xmlScript);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate XML script' });
    }
  });

  // Get user credits
  app.get("/api/credits", requireAuth, async (req, res) => {
    try {
      const credits = await storage.getUserCredits(req.session.user.id);
      res.json({ success: true, credits });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get campaign status
  app.get("/api/campaign-status", requireAuth, async (req, res) => {
    try {
      const status = await storage.getActiveCampaign();
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Cancel bulk call campaign
  app.post("/api/bulk-calls/:id/cancel", requireAuth, async (req, res) => {
    try {
      const bulkCallId = parseInt(req.params.id);
      const userId = req.session.user.id;
      
      // Get the bulk call to verify ownership
      const userBulkCalls = await storage.getUserBulkCalls(userId, 1000);
      const targetCampaign = userBulkCalls.find(bc => bc.id === bulkCallId);
      
      if (!targetCampaign) {
        return res.status(404).json({
          success: false,
          error: 'Bulk call campaign not found'
        });
      }

      if (targetCampaign.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You can only cancel your own campaigns'
        });
      }

      // Only allow cancellation of in-progress campaigns
      if (targetCampaign.status !== 'in-progress') {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel campaign with status: ${targetCampaign.status}. Only in-progress campaigns can be cancelled.`
        });
      }

      // Update campaign status to cancelled
      const updatedCampaign = await storage.updateBulkCall(bulkCallId, {
        status: 'cancelled',
        updatedAt: new Date()
      });

      // Clear active campaign status if this was the active one
      const campaignStatus = await storage.getActiveCampaign();
      if (campaignStatus.campaignId === bulkCallId) {
        await storage.setActiveCampaign(null, null);
        await storage.lockXmlUpdates(false);
      }

      res.json({
        success: true,
        message: `Bulk call campaign "${updatedCampaign.name}" has been cancelled`,
        bulkCall: updatedCampaign
      });

    } catch (error) {
      console.error('Cancel bulk call error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel bulk call campaign'
      });
    }
  });

  // Admin routes for credit management
  app.post("/api/admin/users/:id/credits", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { credits, action = 'add' } = req.body;

      if (credits < 0) {
        return res.status(400).json({ success: false, message: "Credits cannot be negative" });
      }

      if (action === 'set') {
        await storage.setUserCredits(userId, credits);
        res.json({ success: true, message: `Set credits to ${credits} successfully` });
      } else {
        if (credits <= 0) {
          return res.status(400).json({ success: false, message: "Credits to add must be positive" });
        }
        await storage.addUserCredits(userId, credits);
        res.json({ success: true, message: `Added ${credits} credits successfully` });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Webhook endpoint to track button presses
  app.get("/webhook", async (req, res) => {
    try {
      const phoneNumber = req.query.number as string;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          error: 'Phone number parameter is required'
        });
      }

      console.log(`Webhook received: Someone pressed 1 for number ${phoneNumber}`);

      // Find contacts with this phone number
      const contacts = await storage.getContactsByPhoneNumber(phoneNumber);
      
      if (contacts.length === 0) {
        console.log(`No campaigns found for phone number ${phoneNumber}`);
        return res.json({
          success: true,
          message: `Phone number ${phoneNumber} not found in any campaigns`,
          campaigns: []
        });
      }

      // Get all bulk call campaigns this number belongs to
      const campaignIds = Array.from(new Set(contacts.map(c => c.bulkCallId).filter((id): id is number => id !== null)));
      const campaigns: string[] = [];
      
      for (const bulkCallId of campaignIds) {
        const bulkCalls = await storage.getBulkCalls(100);
        const campaign = bulkCalls.find(bc => bc.id === bulkCallId);
        if (campaign) {
          campaigns.push(campaign.name);
          console.log(`Phone number ${phoneNumber} pressed 1 in campaign: "${campaign.name}"`);
        }
      }

      // Store webhook response for each campaign this phone number belongs to
      const bulkCalls = await storage.getBulkCalls(100);
      
      for (const campaignId of campaignIds) {
        const campaign = bulkCalls.find(bc => bc.id === campaignId);
        const contact = contacts.find(c => c.bulkCallId === campaignId);
        
        if (campaign && contact) {
          await storage.createWebhookResponse({
            phoneNumber,
            buttonPressed: '1',
            bulkCallId: campaignId,
            contactId: contact.id || null,
            contactName: contact.name || null,
            contactEmail: contact.email || null,
            campaignName: campaign.name || null,
            userId: campaign.userId || null
          });
          
          console.log(`Stored webhook response for campaign "${campaign.name}" (user: ${campaign.userId})`);
          
          // Send real-time notification to user
          wsManager.broadcastWebhookNotification(campaign.userId, {
            phoneNumber,
            campaignName: campaign.name,
            timestamp: new Date().toISOString()
          });
        }
      }

      res.json({
        success: true,
        message: `Phone number ${phoneNumber} pressed 1`,
        phoneNumber,
        campaigns,
        contactsFound: contacts.length
      });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook'
      });
    }
  });

  // Serve static connect XML for dial action
  app.get("/connect", (req, res) => {
    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-cache'
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

  const httpServer = createServer(app);
  return httpServer;
}
