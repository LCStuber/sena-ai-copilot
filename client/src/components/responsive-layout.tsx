import { useResponsive } from "@/hooks/use-responsive";
import Sidebar from "./sidebar";
import MobileHeader from "./mobile-header";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { isMobile, isTouch } = useResponsive();
  
  // Show mobile layout for mobile screens or touch devices with small screens
  const showMobileLayout = isMobile || (isTouch && window.innerWidth <= 768);

  if (showMobileLayout) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}