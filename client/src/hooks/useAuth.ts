import { useQuery } from "@tanstack/react-query";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import type { User } from "@shared/schema";

export function useAuth() {
  const { isWhiteLabel } = useWhiteLabel();
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !isWhiteLabel, // Skip auth query in white-label mode
  });

  // In white-label mode, assume authenticated for functionality like progress tracking and tips
  const isAuthenticated = isWhiteLabel ? true : !!user;

  return {
    user: isWhiteLabel ? null : user, // No user profile in white-label mode
    isLoading: isWhiteLabel ? false : isLoading,
    isAuthenticated,
  };
}
