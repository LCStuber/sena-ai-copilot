import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Search, 
  BookOpen, 
  CheckSquare, 
  Database,
  Users,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Company Research", href: "/research", icon: Search },
  { name: "Playbook Notes Studio", href: "/playbook", icon: BookOpen },
  { name: "Next Best Actions", href: "/nbas", icon: CheckSquare },
  { name: "CRM Integration", href: "/artifacts", icon: Database },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return user.username?.[0]?.toUpperCase() || "U";
  };

  return (
    <nav className="w-64 bg-card shadow-sm border-r border-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-sena-title">SENA</h1>
            <p className="text-xs text-muted-foreground">Sales Enablement AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href} className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "text-accent-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`} data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
            </Link>
          );
        })}
      </div>

      {/* User Section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground" data-testid="text-user-initials">
              {getInitials(user.firstName || undefined, user.lastName || undefined)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-role">
              {user.role === 'sdr' ? 'Senior SDR' : user.role}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="text-muted-foreground hover:text-foreground p-1"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
