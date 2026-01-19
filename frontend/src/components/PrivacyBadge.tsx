import { Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrivacyBadgeProps {
  privacy: 'private' | 'group';
  groupName?: string;
  className?: string;
}

export function PrivacyBadge({ privacy, groupName, className }: PrivacyBadgeProps) {
  if (privacy === 'private') {
    return (
      <span className={cn('study-badge study-badge-private', className)}>
        <Lock className="w-3 h-3 mr-1" />
        Private
      </span>
    );
  }

  return (
    <span className={cn('study-badge study-badge-group', className)}>
      <Users className="w-3 h-3 mr-1" />
      {groupName || 'Group'}
    </span>
  );
}
