'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, LogOut, Users, Building, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Incidents', href: '/incidents', icon: Ticket },
  { label: 'Staff Board', href: '/staff/dashboard', icon: Ticket, roles: ['STAFF', 'MANAGER', 'ADMIN'] },
  { label: 'Departments', href: '/admin/departments', icon: Building, role: 'ADMIN' },
  { label: 'Users', href: '/admin/users', icon: Users, role: 'ADMIN' },
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
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-gray-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold hover:text-primary transition-colors cursor-pointer">ServiceNow</h1>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-gray-400 hover:text-white" 
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

              <nav className="flex-1 px-4 space-y-2">

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
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive ? "bg-primary text-white" : "hover:bg-gray-800 text-gray-400"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
