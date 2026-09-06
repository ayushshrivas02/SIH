import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'online' | 'offline' | 'processing' | 'warning';
  text?: string;
  pulse?: boolean;
}

export function StatusBadge({ status, text, pulse = true, className, ...props }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400',
          glow: 'shadow-[0_0_10px_rgba(52,211,153,0.3)]',
          defaultText: 'Online',
        };
      case 'offline':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          text: 'text-rose-400',
          dot: 'bg-rose-400',
          glow: 'shadow-[0_0_10px_rgba(244,63,94,0.3)]',
          defaultText: 'Offline',
        };
      case 'processing':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          text: 'text-blue-400',
          dot: 'bg-blue-400',
          glow: 'shadow-[0_0_10px_rgba(96,165,250,0.3)]',
          defaultText: 'Processing',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          text: 'text-amber-400',
          dot: 'bg-amber-400',
          glow: 'shadow-[0_0_10px_rgba(251,191,36,0.3)]',
          defaultText: 'Warning',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      variant="outline"
      className={cn(
        'relative flex items-center gap-1.5 px-2 py-0.5 font-medium tracking-wide',
        config.bg,
        config.border,
        config.text,
        config.glow,
        className
      )}
      {...props}
    >
      <div className="relative flex h-2 w-2 items-center justify-center">
        {pulse && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', config.dot)} />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', config.dot)} />
      </div>
      <span className="text-[10px] uppercase">{text || config.defaultText}</span>
    </Badge>
  );
}
