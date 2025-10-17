import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema.js";

interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: data?.user,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}