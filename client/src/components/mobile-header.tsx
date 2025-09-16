import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  Search, 
  BookOpen, 
  CheckSquare, 
  Database,
  Users,
  LogOut,
  Menu
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Company Research", href: "/research", icon: Search },
  { name: "Playbook Notes Studio", href: "/playbook", icon: BookOpen },
  { name: "Next Best Actions", href: "/nbas", icon: CheckSquare },
  { name: "CRM Integration", href: "/artifacts", icon: Database },
];

interface MobileHeaderProps {
  className?: string;
}

export default function MobileHeader({ className = "" }: MobileHeaderProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsOpen(false);
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  if (!user) return null;

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return user.username?.[0]?.toUpperCase() || "U";
  };

  return (
    <header className={`w-full bg-card shadow-sm border-b border-border ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground" data-testid="text-sena-title-mobile">SENA</h1>
          </div>
        </div>

        {/* User Info & Menu */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground" data-testid="text-user-initials-mobile">
              {getInitials(user.firstName || undefined, user.lastName || undefined)}
            </span>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground p-2"
                data-testid="button-mobile-menu"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span>SENA Navigation</span>
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-1">
                {/* Navigation Links */}
                {navigation.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      onClick={handleNavClick}
                      className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? "text-accent-foreground bg-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                      data-testid={`link-mobile-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}

                {/* User Section */}
                <div className="border-t border-border pt-4 mt-6">
                  <div className="flex items-center space-x-3 px-3 py-2">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {getInitials(user.firstName || undefined, user.lastName || undefined)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" data-testid="text-mobile-user-name">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.username}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-mobile-user-role">
                        {user.role === 'sdr' ? 'Senior SDR' : user.role}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="w-full justify-start text-muted-foreground hover:text-foreground mt-2"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}