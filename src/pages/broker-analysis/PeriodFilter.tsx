import { useEffect, useRef, useState } from 'react';
import { Calendar, Info, RotateCw, X } from 'lucide-react';

export const PERIOD_OPTIONS: { code: string; label: string; tooltip: string; days: number }[] = [
  { code: '1d',  label: '1D',  tooltip: '1 Day',     days: 1 },
  { code: '3d',  label: '3D',  tooltip: '3 Days',    days: 3 },
  { code: '1w',  label: '1W',  tooltip: '1 Week',    days: 7 },
  { code: '15d', label: '15D', tooltip: '15 Days',   days: 15 },
  { code: '1m',  label: '1M',  tooltip: '1 Month',   days: 30 },
  { code: '3m',  label: '3M',  tooltip: '3 Months',  days: 90 },
  { code: '6m',  label: '6M',  tooltip: '6 Months',  days: 180 },
  { code: '1y',  label: '1Y',  tooltip: '1 Year',    days: 365 },
  { code: '2y',  label: '2Y',  tooltip: '2 Years',   days: 730 },
  { code: '3y',  label: '3Y',  tooltip: '3 Years',   days: 1095 },
];

export interface PeriodFilterValue {
  period: string;
  from?: string;
  to?: string;
}

interface Props {
  value: PeriodFilterValue;
  onChange: (next: PeriodFilterValue) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  note?: string | null;
}

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPeriod(code: string): { from: string; to: string } {
  const today = new Date();
  const to = formatISODate(today);
  const opt = PERIOD_OPTIONS.find(p => p.code === code);
  const days = opt?.days ?? 1;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { from: formatISODate(start), to };
}

export function PeriodFilter({ value, onChange, onRefresh, refreshing, note }: Props) {
  const [showCustom, setShowCustom] = useState(value.period === 'custom');
  const [customFrom, setCustomFrom] = useState(value.from || '');
  const [customTo, setCustomTo] = useState(value.to || '');
  const fromRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.period === 'custom') setShowCustom(true);
  }, [value.period]);

  const selectPeriod = (code: string) => {
    const { from, to } = rangeForPeriod(code);
    onChange({ period: code, from, to });
    setShowCustom(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) {
      fromRef.current?.focus();
      return;
    }
    onChange({ period: 'custom', from: customFrom, to: customTo });
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-text-secondary mr-1 hidden md:inline">Time range:</span>
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {PERIOD_OPTIONS.map(opt => {
            const active = value.period === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                title={opt.tooltip}
                onClick={() => selectPeriod(opt.code)}
                className={`px-3.5 py-2 rounded-lg font-jetbrains text-sm font-bold tracking-wide border transition-all min-w-[44px]
                  ${active
                    ? 'bg-brand-cyan text-bg-base border-brand-cyan shadow-glow-cyan'
                    : 'bg-bg-base text-text-secondary border-bg-border hover:border-brand-cyan/40 hover:text-brand-cyan'}`}
              >
                {opt.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCustom(v => !v)}
            className={`px-3.5 py-2 rounded-lg font-jetbrains text-sm font-bold tracking-wide border transition-all flex items-center gap-1.5
              ${value.period === 'custom'
                ? 'bg-brand-violet text-white border-brand-violet'
                : 'bg-bg-base text-text-secondary border-bg-border hover:border-brand-violet/50 hover:text-brand-violet'}`}
          >
            <Calendar size={14} />
            Custom
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-secondary py-2 px-4 flex items-center gap-1.5 text-sm"
          >
            <RotateCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-bg-border/60">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wider font-semibold">From date</label>
            <input
              ref={fromRef}
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={e => setCustomFrom(e.target.value)}
              className="input-field py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted uppercase tracking-wider font-semibold">To date</label>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              max={formatISODate(new Date())}
              onChange={e => setCustomTo(e.target.value)}
              className="input-field py-2.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="btn-primary py-2.5 px-5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply Range
          </button>
          {value.period === 'custom' && (
            <button
              type="button"
              onClick={() => selectPeriod('1d')}
              className="btn-ghost py-2.5 px-4 text-sm flex items-center gap-1.5"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {note && (
        <div className="flex items-start gap-2 text-sm text-brand-gold bg-brand-gold/5 border border-brand-gold/20 rounded-lg px-4 py-2.5">
          <Info size={15} className="shrink-0 mt-0.5" />
          <span className="leading-relaxed">{note}</span>
        </div>
      )}
    </div>
  );
}

export { rangeForPeriod, formatISODate };
