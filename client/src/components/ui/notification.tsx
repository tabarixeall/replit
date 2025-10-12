import { useState, useEffect } from "react";
import { Bell, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface NotificationData {
  id: string;
  phoneNumber: string;
  campaignName: string;
  timestamp: string;
  type: 'webhook_response';
}

interface NotificationProps {
  notification: NotificationData;
  onClose: () => void;
}

export function Notification({ notification, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldFade, setShouldFade] = useState(false);

  useEffect(() => {
    // Auto-fade after 5 seconds
    const fadeTimer = setTimeout(() => {
      setShouldFade(true);
    }, 5000);

    // Auto-close after 8 seconds
    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade animation
    }, 8000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <Card 
      className={`fixed top-4 right-4 w-80 z-50 border-l-4 border-l-green-500 bg-white shadow-lg transition-all duration-300 ${
        shouldFade ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      } animate-in slide-in-from-right-2`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm text-gray-900">
                  New Response
                </h4>
                <Badge variant="secondary" className="text-xs">
                  Pressed 1
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{notification.phoneNumber}</span> responded to campaign{" "}
                <span className="font-medium">"{notification.campaignName}"</span>
              </p>
              <p className="text-xs text-gray-400">
                {format(new Date(notification.timestamp), 'h:mm:ss a')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface NotificationManagerProps {
  children: React.ReactNode;
}

export function NotificationManager({ children }: NotificationManagerProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Function to add a new notification
  const addNotification = (notification: Omit<NotificationData, 'id'>) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36),
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 2)]); // Keep max 3 notifications
  };

  // Function to remove a notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Expose the addNotification function globally for webhook responses
  useEffect(() => {
    (window as any).addWebhookNotification = addNotification;
    
    return () => {
      delete (window as any).addWebhookNotification;
    };
  }, []);

  return (
    <>
      {children}
      <div className="fixed top-0 right-0 z-50 pointer-events-none">
        <div className="p-4 space-y-3 pointer-events-auto">
          {notifications.map((notification) => (
            <Notification
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}