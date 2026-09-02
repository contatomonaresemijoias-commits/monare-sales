import type { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const EMPTY_VALUE = '__empty__';

type AppSelectOption = {
  value: string;
  label: ReactNode;
};

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
};

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione...',
  className,
  contentClassName,
  disabled,
}: AppSelectProps) {
  return (
    <Select
      value={value || EMPTY_VALUE}
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE ? '' : nextValue)}
      disabled={disabled}
    >
      <SelectTrigger className={cn('rounded-xl bg-white', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn('rounded-xl', contentClassName)}>
        {options.map((option) => (
          <SelectItem key={option.value || EMPTY_VALUE} value={option.value || EMPTY_VALUE}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
