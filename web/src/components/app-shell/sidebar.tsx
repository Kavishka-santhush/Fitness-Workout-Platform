'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Dumbbell, ClipboardList, Sparkles, Salad, LineChart,
  Users, UserCog, Video, Trophy, CalendarDays, Settings, ShieldCheck, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';

export const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workouts', label: 'Workouts', icon: ClipboardList },
  { href: '/exercises', label: 'Exercises', icon: Dumbbell },
  { href: '/programs', label: 'Programs', icon: Sparkles },
  { href: '/nutrition', label: 'Nutrition', icon: Salad },
  { href: '/progress', label: 'Progress', icon: LineChart },
  { href: '/classes', label: 'Live Classes', icon: Video },
  { href: '/challenges', label: 'Challenges', icon: Trophy },
  { href: '/social', label: 'Community', icon: Users },
  { href: '/trainers', label: 'Coaches', icon: UserCog },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/ai-coach', label: 'AI Coach', icon: Bot },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.metadata?.role as string) || 'MEMBER';

  const extra = [];
  if (role === 'TRAINER' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
    extra.push({ href: '/coach', label: 'Coach Studio', icon: UserCog });
  }
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    extra.push({ href: '/admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <aside className={cn('flex w-64 flex-col border-r bg-card', className)}>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        {extra.length > 0 && <div className="my-2 border-t" />}
        {extra.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/profile') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
