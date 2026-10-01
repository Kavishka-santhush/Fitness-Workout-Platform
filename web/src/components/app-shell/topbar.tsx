'use client';
import * as React from 'react';
import Link from 'next/link';
import { Bell, Menu, Search, Dumbbell } from 'lucide-react';
import { UserButton, useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnreadCount } from '@/lib/hooks';

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: unread } = useUnreadCount();
  const count = (unread as any)?.unread ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>
      <Link href="/dashboard" className="flex items-center gap-2 font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Dumbbell className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">FitForge</span>
      </Link>

      <div className="relative ml-auto hidden w-full max-w-xs md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search exercises, food, people…" className="pl-9" readOnly onFocus={(e) => e.currentTarget.blur()} />
      </div>

      <Link href="/dashboard" className="ml-auto md:ml-0">
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {isLoaded && isSignedIn && count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </Link>

      {isLoaded && isSignedIn && <UserButton afterSignOutUrl="/" />}
    </header>
  );
}
