'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Ticket, 
  LogOut, 
  Users, 
  Building, 
  X, 
  User,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Incidents', href: '/incidents', icon: Ticket },
  { label: 'Staff Board', href: '/staff/dashboard', icon: Shield, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { label: 'Admin Console', href: '/admin', icon: ShieldAlert, role: 'ADMIN' },
  { label: 'Profile', href: '/profile', icon: User },
];

interface SidebarProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-sidebar border-r border-primary/10 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary/10">
          <Link href="/dashboard" className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight hover:text-primary transition-colors uppercase">
              ServiceNow
            </h1>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-muted-foreground hover:text-primary" 
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const hasRole = !item.role && !item.roles || 
                           (item.role && user?.role === item.role) || 
                           (item.roles && item.roles.includes(user?.role));
            
            if (!hasRole) return null;
            const isActive = pathname === item.href;

            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={cn(
                  "flex items-center space-x-3 px-4 py-2.5 rounded-md transition-all relative group text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary/10">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
