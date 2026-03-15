import { cn } from '@/lib/utils';

interface CharCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharCounter({ current, max, className }: CharCounterProps) {
  const ratio = current / max;
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        ratio >= 1 ? 'text-destructive font-medium' : ratio >= 0.9 ? 'text-orange-500' : 'text-muted-foreground',
        className,
      )}
    >
      {current} / {max}
    </span>
  );
}
