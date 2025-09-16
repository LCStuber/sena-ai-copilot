import { useResponsive } from "@/hooks/use-responsive";
import Sidebar from "./sidebar";
import MobileHeader from "./mobile-header";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const { isMobile, isTouch, screenWidth } = useResponsive();
  
  // Show mobile layout for mobile screens or touch devices with small screens
  const showMobileLayout = isMobile || (isTouch && screenWidth <= 768);

  // Keep a stable component tree to prevent state loss during breakpoint changes
  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header - shown only on mobile */}
      <div className={showMobileLayout ? "flex flex-col w-full" : "hidden"}>
        <MobileHeader />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* Desktop Sidebar - shown only on desktop */}
      <div className={showMobileLayout ? "hidden" : "flex w-full"}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}