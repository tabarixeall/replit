import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLogin from "./admin-login";
import AdminPanel from "./admin-panel";
import { type User } from "@shared/schema.ts";

export default function AdminWrapper() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check admin authentication
  const { data: userData } = useQuery<{ success: boolean; user: User }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  useEffect(() => {
    if (userData?.success && userData.user.role === 'admin') {
      setIsAdminAuthenticated(true);
    } else if (userData?.success) {
      // User is authenticated but not admin
      setIsAdminAuthenticated(false);
    }
    setIsCheckingAuth(false);
  }, [userData]);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show admin login if not authenticated as admin
  if (!isAdminAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAdminAuthenticated(true)} />;
  }

  // Show admin panel
  return <AdminPanel />;
}