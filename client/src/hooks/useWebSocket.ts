import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

interface WebhookNotification {
  phoneNumber: string;
  campaignName: string;
  timestamp: string;
}

interface WebSocketMessage {
  type: 'connection' | 'webhook_response' | 'pong';
  data?: WebhookNotification;
  message?: string;
  timestamp: string;
}

export function useWebSocket() {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<WebhookNotification | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!user || !isAuthenticated) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}&username=${encodeURIComponent(user.username)}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Start ping/pong for keep-alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30 seconds
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', message);

        if (message.type === 'webhook_response' && message.data) {
          console.log('🔔 Webhook notification received:', message.data);
          setLastNotification(message.data);
          
          // Trigger notification popup
          if ((window as any).addWebhookNotification) {
            console.log('📱 Triggering notification popup');
            (window as any).addWebhookNotification({
              phoneNumber: message.data.phoneNumber,
              campaignName: message.data.campaignName,
              timestamp: message.data.timestamp,
              type: 'webhook_response'
            });
          } else {
            console.warn('❌ addWebhookNotification function not available');
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Attempt to reconnect after 3 seconds if still authenticated
      if (isAuthenticated && user) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting WebSocket reconnection...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    setIsConnected(false);
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user?.id]);

  return {
    isConnected,
    lastNotification,
    connect,
    disconnect
  };
}