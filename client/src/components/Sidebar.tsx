import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  BookOpen, 
  LayoutDashboard, 
  Book, 
  Users, 
  Database,
  LogOut,
  User,
  Settings,
  TrendingUp,
  MessageCircle,
  Sparkles
} from "lucide-react";
import type { WhiteLabelConfig } from "@/lib/whiteLabelUtils";

interface SidebarProps {
  onMobileClose?: () => void;
  isWhiteLabel?: boolean;
  whiteLabelConfig?: WhiteLabelConfig;
}

export function Sidebar({ onMobileClose, isWhiteLabel = false, whiteLabelConfig }: SidebarProps) {
  console.log('🟨 [SIDEBAR] Sidebar started, isWhiteLabel:', isWhiteLabel);
  const [location] = useLocation();
  
  // Only call useAuth if NOT in white-label mode
  const authResult = isWhiteLabel ? { user: null, isAuthenticated: false } : useAuth();
  const { user, isAuthenticated } = authResult;
  console.log('🟨 [SIDEBAR] Auth result:', { user: !!user, isAuthenticated, isWhiteLabel });

  // Get user's projects to determine role (skip in white-label mode)
  const { data: projects } = useQuery<Array<{id: number, userRole: string}>>(
    { queryKey: ["/api/projects"], enabled: isAuthenticated && !isWhiteLabel }
  );

  // Fetch project info for white-label mode
  const { data: whiteLabelProject } = useQuery<{id: number, name: string, description?: string, isActive: boolean}>({
    queryKey: ["/api-public/projects", whiteLabelConfig?.projectId],
    enabled: isWhiteLabel && !!whiteLabelConfig?.projectId
  });

  // For now, use the first project's role (can be enhanced for multi-project context)
  const userRole = projects?.[0]?.userRole || 'user';

  // Determine display name for the app
  const appDisplayName = isWhiteLabel ? (whiteLabelProject?.name || "onboardMe") : "onboardMe";

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // Define navigation items based on user role or white-label mode
  const getNavItems = () => {
    // White-label mode: Show navigation based on feature configuration
    if (isWhiteLabel) {
      const feature = whiteLabelConfig?.feature || 'guides';
      
      if (feature === 'guides') {
        return [{ href: "/guides", icon: Book, label: "Guides" }];
      } else if (feature === 'chat') {
        return [{ href: "/chat", icon: MessageCircle, label: "Chat" }];
      } else if (feature === 'both') {
        return [
          { href: "/guides", icon: Book, label: "Guides" },
          { href: "/chat", icon: MessageCircle, label: "Chat" }
        ];
      }
      
      // Fallback to guides only
      return [{ href: "/guides", icon: Book, label: "Guides" }];
    }

    // Regular mode: Role-based navigation
    const baseItems = [
      { href: "/guides", icon: Book, label: "Guides" },
      { href: "/chat", icon: MessageCircle, label: "Chat" },
      { href: "/ai-generator", icon: Sparkles, label: "AI Generator" },
      { href: "/my-progress", icon: TrendingUp, label: "My Progress" }
    ];

    if (userRole === 'user') {
      // Users can see guides and their progress
      return baseItems;
    }

    if (userRole === 'creator') {
      // Creators can see dashboard, guides, and their progress
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard" },
        ...baseItems
      ];
    }

    if (userRole === 'admin') {
      // Admins can see everything
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard" },
        ...baseItems,
        { href: "/users", icon: Users, label: "Metrics" },
        { href: "/admin/1", icon: Settings, label: "Admin" }
      ];
    }

    // Default fallback
    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{appDisplayName}</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
                         (item.href === "/admin/1" && location.startsWith("/admin"));
          
          return (
            <Link key={item.href} href={item.href}>
              <button 
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-accent text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onMobileClose?.()}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

      {/* Hide user profile section in white-label mode */}
      {!isWhiteLabel && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName || user?.email || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || "admin@example.com"}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
