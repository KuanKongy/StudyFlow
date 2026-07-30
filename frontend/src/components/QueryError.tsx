import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';

interface QueryErrorProps {
  title?: string;
  description?: string;
  onRetry: () => void;
  className?: string;
}

/** Retryable error state for failed queries — pages should never render an
 *  empty list as if a failed fetch had succeeded. */
export function QueryError({
  title = "Couldn't load this page",
  description = 'Something went wrong while fetching your data. Check your connection and try again.',
  onRetry,
  className,
}: QueryErrorProps) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      className={className}
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
