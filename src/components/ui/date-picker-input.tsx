import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function DatePickerInput({
  value,
  onValueChange,
  min,
  max,
  placeholder = 'dd/mm/aaaa',
  className,
  disabled,
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 justify-between rounded-xl border-input bg-white px-3 text-left text-sm font-normal shadow-sm hover:border-primary/50 hover:bg-white',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          {selected ? format(selected, 'dd/MM/yyyy') : placeholder}
          <CalendarIcon className="ml-3 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={8} className="w-auto max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border-0 p-0 shadow-lg">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected || maxDate || new Date()}
          fromDate={minDate}
          toDate={maxDate}
          onSelect={(date) => {
            if (!date) return;
            onValueChange(format(date, 'yyyy-MM-dd'));
            setOpen(false);
          }}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
