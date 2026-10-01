import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
}

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(({ className, src, name, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted items-center justify-center text-sm font-medium text-muted-foreground', className)}
    {...props}
  >
    {src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name || 'avatar'} className="h-full w-full object-cover" />
    ) : (
      children || initials(name)
    )}
  </div>
));
Avatar.displayName = 'Avatar';

export { Avatar };
