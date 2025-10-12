import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  username?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthenticatedWebSocket> = new Set();

  init(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      console.log('New WebSocket connection');
      
      // Parse query parameters for authentication
      const { query } = parse(req.url || '', true);
      const userId = query.userId ? parseInt(query.userId as string) : undefined;
      const username = query.username as string;

      if (userId && username) {
        ws.userId = userId;
        ws.username = username;
        console.log(`WebSocket authenticated for user: ${username} (ID: ${userId})`);
      }

      this.clients.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to notification service',
        timestamp: new Date().toISOString()
      }));

      // Handle client messages
      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          console.log('WebSocket message received:', data);
          
          // Handle ping/pong for keep-alive
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log(`WebSocket disconnected for user: ${ws.username || 'unknown'}`);
        this.clients.delete(ws);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log('WebSocket server initialized on /ws');
  }

  // Broadcast webhook notification to specific user
  broadcastWebhookNotification(userId: number, notification: {
    phoneNumber: string;
    campaignName: string;
    timestamp: string;
  }) {
    const message = JSON.stringify({
      type: 'webhook_response',
      data: notification,
      timestamp: new Date().toISOString()
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
  broadcastToAll(message: any) {
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
  getConnectedUsersCount(): number {
    return Array.from(this.clients).filter(client => 
      client.readyState === WebSocket.OPEN && client.userId
    ).length;
  }

  // Get specific user's connection count
  getUserConnectionCount(userId: number): number {
    return Array.from(this.clients).filter(client => 
      client.readyState === WebSocket.OPEN && client.userId === userId
    ).length;
  }
}

export const wsManager = new WebSocketManager();