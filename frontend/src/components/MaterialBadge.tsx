import { FileText, FileCheck, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MaterialType } from '@/types';

interface MaterialBadgeProps {
  type: MaterialType;
  className?: string;
}

const typeConfig = {
  note: {
    icon: FileText,
    label: 'Note',
    className: 'study-badge-note',
  },
  summary: {
    icon: FileCheck,
    label: 'Summary',
    className: 'study-badge-summary',
  },
  flashcard_set: {
    icon: Layers,
    label: 'Flashcards',
    className: 'study-badge-flashcard',
  },
};

export function MaterialBadge({ type, className }: MaterialBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <span className={cn('study-badge', config.className, className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
}
