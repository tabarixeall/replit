import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationManager } from "@/components/ui/notification";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import NotFound from "@/pages/not-found";
import CallCenter from "@/pages/call-center";
import XmlSettings from "@/pages/xml-settings";
import BulkCalls from "@/pages/bulk-calls";
import WebhookDashboard from "@/pages/webhook-dashboard";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AdminWrapper from "@/pages/admin-wrapper";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Initialize WebSocket connection for real-time notifications
  useWebSocket();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  // Check if we're on admin route
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminWrapper />;
  }

  return (
    <Switch>
      <Route path="/" component={CallCenter} />
      <Route path="/xml-settings" component={XmlSettings} />
      <Route path="/bulk-calls" component={BulkCalls} />
      <Route path="/webhook-dashboard" component={WebhookDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationManager>
          <Toaster />
          <Router />
        </NotificationManager>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
