import Sidebar from "./sidebar";
import MobileHeader from "./mobile-header";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  // Single stable component tree with responsive chrome using Tailwind classes
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <Sidebar className="hidden md:flex" />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header - visible on mobile, hidden on desktop */}
        <MobileHeader className="md:hidden" />
        
        {/* Main content - children render only once */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}