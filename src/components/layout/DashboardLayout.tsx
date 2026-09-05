'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Database, 
  Camera, 
  LineChart, 
  Bot, 
  FileOutput, 
  ShieldCheck, 
  Server, 
  Settings,
  LogOut,
  Menu,
  BrainCircuit,
  Network,
  ChevronDown,
  ChevronRight,
  Users,
  Terminal
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navigationGroups = [
  {
    title: 'Workspace',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredLevel: 1 },
      { name: 'AI Workbench', href: '/assistant', icon: Bot, requiredLevel: 1 },
      { name: 'Code Studio', href: '/code-studio', icon: Terminal, requiredLevel: 2 },
      { name: 'Data Analysis', href: '/analysis', icon: LineChart, requiredLevel: 2 },
      { name: 'Vision Analysis', href: '/vision', icon: Camera, requiredLevel: 2 },
    ]
  },
  {
    title: 'Data & Documents',
    items: [
      { name: 'Knowledge Base', href: '/knowledge-base', icon: Database, requiredLevel: 2 },
      { name: 'Data Sources', href: '/data-sources', icon: Network, requiredLevel: 3 },
      { name: 'Files', href: '/documents', icon: FileText, requiredLevel: 2 },
    ]
  },
  {
    title: 'Models & Intelligence',
    items: [
      { name: 'Models', href: '/models', icon: Server, requiredLevel: 4 },
    ]
  },
  {
    title: 'Administration',
    items: [
      { name: 'Users / RBAC', href: '/users', icon: Users, requiredLevel: 4 },
      { name: 'Audit Logs', href: '/audit', icon: ShieldCheck, requiredLevel: 4 },
      { name: 'Settings', href: '/settings', icon: Settings, requiredLevel: 4 },
    ]
  }
];

const ROLE_LEVELS: Record<string, number> = {
  ADMIN: 4,
  MANAGER: 3,
  USER: 2,
  VIEWER: 1,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);

  const userRole = (session?.user as any)?.role?.toUpperCase() || 'VIEWER';
  const userLevel = ROLE_LEVELS[userRole] || 1;

  const renderNavGroups = (groups: typeof navigationGroups) => {
    return groups.map((group) => {
      const groupItems = group.items.filter(item => userLevel >= item.requiredLevel);
      if (groupItems.length === 0) return null;
      
      return (
        <div key={group.title} className="px-3 mb-4">
          <h3 className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            {group.title}
          </h3>
          <nav className="space-y-1">
            {groupItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive ? 'bg-primary/10 text-primary shadow-[inset_2px_0_0_0_rgba(var(--primary),1)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                      'flex-shrink-0 mr-3 h-5 w-5 transition-colors'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      );
    });
  };

  // Removed unused hasAdminAccess
  return (
    <div className="flex h-screen bg-transparent text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
          <ShieldCheck className="w-8 h-8 text-primary mr-2" />
          <span className="text-lg font-bold tracking-tight">Sovereign AI</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          
          {/* Grouped Navigation */}
          <div className="py-2">
            {renderNavGroups(navigationGroups)}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center mb-4">
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">{session?.user?.name || 'User'}</p>
              <p className="text-xs font-medium text-muted-foreground capitalize">
                {((session?.user as any)?.role || 'Engineer').toLowerCase()}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-x-4 bg-background border-b border-border px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 sticky top-0 z-40">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Close mobile menu overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 z-40 bg-zinc-950/80 lg:hidden" 
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center">
             <div className="text-sm font-semibold text-foreground/80 tracking-wide">
                Sovereign Environment
             </div>
             <div className="ml-auto flex items-center space-x-4">
                <div className="flex items-center text-xs text-green-400 border border-green-400/20 bg-green-400/10 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
                  Local Mode Active
                </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
