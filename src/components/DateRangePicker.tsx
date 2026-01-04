import { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { clsx } from 'clsx';
import 'react-day-picker/dist/style.css';

interface DateRangePickerProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  placeholder?: string;
  className?: string;
}

const presets = [
  { label: 'Today', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  {
    label: 'This Week',
    getValue: () => {
      const today = new Date();
      const start = startOfDay(new Date(today.setDate(today.getDate() - today.getDay())));
      const end = endOfDay(new Date(today.setDate(today.getDate() - today.getDay() + 6)));
      return { from: start, to: end };
    },
  },
  {
    label: 'This Month',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const today = new Date();
      return {
        from: startOfDay(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
        to: endOfDay(new Date()),
      };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<{ from: Date | undefined; to: Date | undefined }>(
    value || { from: undefined, to: undefined }
  );

  const handleSelect = (selectedRange: DateRange | undefined) => {
    if (selectedRange) {
      const normalizedRange = {
        from: selectedRange.from,
        to: selectedRange.to ?? undefined
      };
      setRange(normalizedRange);
      onChange?.(normalizedRange);
      if (selectedRange.from && selectedRange.to) {
        setIsOpen(false);
      }
    }
  };

  const handlePreset = (preset: typeof presets[0]) => {
    const presetRange = preset.getValue();
    setRange(presetRange);
    onChange?.(presetRange);
    setIsOpen(false);
  };

  const displayValue = range.from
    ? range.to
      ? `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
      : format(range.from, 'MMM d, yyyy')
    : placeholder;

  return (
    <div className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-2 border-gray-200',
          'rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-500 focus:outline-none',
          'focus:ring-2 focus:ring-indigo-500 transition-all',
          isOpen && 'border-indigo-500 ring-2 ring-indigo-500'
        )}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate">{displayValue}</span>
        </span>
        {range.from && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRange({ from: undefined, to: undefined });
              onChange?.({ from: undefined, to: undefined });
            }}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 animate-in fade-in zoom-in duration-200">
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Select</div>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              numberOfMonths={2}
              className="rdp"
            />
          </div>
        </>
      )}
    </div>
  );
}
