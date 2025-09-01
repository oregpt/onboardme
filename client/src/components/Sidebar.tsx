import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  BookOpen, 
  LayoutDashboard, 
  Book, 
  GitBranch, 
  Users, 
  Database,
  LogOut,
  User,
  Settings
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Get user's projects to determine role
  const { data: projects } = useQuery<Array<{id: number, userRole: string}>>(
    { queryKey: ["/api/projects"], enabled: isAuthenticated }
  );

  // For now, use the first project's role (can be enhanced for multi-project context)
  const userRole = projects?.[0]?.userRole || 'user';

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  // Define navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { href: "/guides", icon: Book, label: "Guides" }
    ];

    if (userRole === 'user') {
      // Users can only see guides
      return baseItems;
    }

    if (userRole === 'creator') {
      // Creators can see dashboard, guides, and flow editor
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard" },
        ...baseItems,
        { href: "/editor", icon: GitBranch, label: "Flow Editor" }
      ];
    }

    if (userRole === 'admin') {
      // Admins can see everything
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard" },
        ...baseItems,
        { href: "/editor", icon: GitBranch, label: "Flow Editor" },
        { href: "/users", icon: Users, label: "User Progress" },
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
            <h1 className="text-lg font-semibold text-foreground">Guide Builder</h1>
            <p className="text-sm text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
                         (item.href === "/editor" && location.startsWith("/editor")) ||
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
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </nav>

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
    </div>
  );
}
