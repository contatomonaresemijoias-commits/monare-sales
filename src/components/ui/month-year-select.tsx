import { useId } from 'react';
import { format, startOfMonth, type Locale } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MonthYearSelectProps = {
  value: Date;
  onValueChange: (month: Date) => void;
  fromDate?: Date;
  toDate?: Date;
  today?: Date;
  locale?: Locale;
  disabled?: boolean;
  className?: string;
};

export function MonthYearSelect({
  value,
  onValueChange,
  fromDate,
  toDate,
  today = new Date(),
  locale = ptBR,
  disabled,
  className,
}: MonthYearSelectProps) {
  const monthId = useId();
  const yearId = useId();
  const year = value.getFullYear();
  const firstMonth = fromDate && startOfMonth(fromDate);
  const lastMonth = toDate && startOfMonth(toDate);
  const firstYear = fromDate?.getFullYear() ?? Math.min(today.getFullYear() - 120, year);
  const lastYear = toDate?.getFullYear() ?? Math.max(today.getFullYear() + 10, year);
  const years = Array.from({ length: Math.max(0, lastYear - firstYear + 1) }, (_, index) => lastYear - index);

  function selectMonth(month: Date) {
    // Ao trocar o ano, preserva o mês sempre que estiver dentro dos limites.
    if (firstMonth && month < firstMonth) month = firstMonth;
    if (lastMonth && month > lastMonth) month = lastMonth;
    onValueChange(month);
  }

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_6rem] gap-2', className)}>
      <div className="min-w-0">
        <label htmlFor={monthId} className="mb-1 block text-[11px] font-medium text-ink-soft">Mês</label>
        <Select
          value={String(value.getMonth())}
          onValueChange={(month) => selectMonth(new Date(year, Number(month), 1))}
          disabled={disabled}
        >
          <SelectTrigger id={monthId} className="h-11 bg-white capitalize">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {Array.from({ length: 12 }, (_, month) => {
              const date = new Date(year, month, 1);
              const outsideBounds = (firstMonth && date < firstMonth) || (lastMonth && date > lastMonth);
              return (
                <SelectItem key={month} value={String(month)} disabled={!!outsideBounds} className="min-h-10 capitalize">
                  {format(date, 'LLLL', { locale })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor={yearId} className="mb-1 block text-[11px] font-medium text-ink-soft">Ano</label>
        <Select
          value={String(year)}
          onValueChange={(nextYear) => selectMonth(new Date(Number(nextYear), value.getMonth(), 1))}
          disabled={disabled}
        >
          <SelectTrigger id={yearId} className="h-11 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {years.map((nextYear) => (
              <SelectItem key={nextYear} value={String(nextYear)} className="min-h-10">{nextYear}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
