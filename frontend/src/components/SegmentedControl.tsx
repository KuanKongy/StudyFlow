import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

/** A single pill-shaped switch with two (or more) sides, used for view-mode
 *  toggles. Built on Tabs because Radix never deselects the active segment. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)}>
      <TabsList className="h-9">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value} className="gap-1">
            <option.icon className="w-4 h-4" />
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
