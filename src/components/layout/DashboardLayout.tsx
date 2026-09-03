'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Database, 
  Network,
  Camera, 
  LineChart, 
  Bot, 
  FileOutput, 
  ShieldCheck, 
  Server, 
  Settings,
  LogOut,
  Menu,
  BrainCircuit
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Assistant', href: '/assistant', icon: MessageSquare },
  { name: 'Multimodal Intelligence', href: '/intelligence', icon: BrainCircuit },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: Database },
  { name: 'Data Sources', href: '/data-sources', icon: Network },
  { name: 'Vision Inspection', href: '/vision', icon: Camera },
  { name: 'Data Analysis', href: '/analysis', icon: LineChart },
  { name: 'Agents', href: '/agents', icon: Bot },
  { name: 'Reports', href: '/reports', icon: FileOutput },
  { name: 'Audit & Security', href: '/audit', icon: ShieldCheck },
  { name: 'Model Manager', href: '/models', icon: Server },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-800">
          <ShieldCheck className="w-8 h-8 text-blue-500 mr-2" />
          <span className="text-lg font-semibold tracking-tight">Sovereign AI</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white',
                      'flex-shrink-0 mr-3 h-5 w-5'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center mb-4">
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{session?.user?.name || 'User'}</p>
              <p className="text-xs font-medium text-zinc-400 capitalize">
                {((session?.user as any)?.role || 'Engineer').toLowerCase()}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-800 bg-zinc-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-zinc-400 lg:hidden"
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
             <div className="text-sm font-semibold text-zinc-300">
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

        <main className="flex-1 overflow-y-auto bg-zinc-950 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
