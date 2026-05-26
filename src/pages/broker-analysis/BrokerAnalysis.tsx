import { useEffect, useMemo } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2, BarChart3, FileSpreadsheet, Search, Briefcase,
  Activity, Layers,
} from 'lucide-react';
import { rangeForPeriod, type PeriodFilterValue } from './PeriodFilter';
import { nepseApi } from '../../lib/api';

const TABS = [
  { to: 'breakdown',     label: 'Breakdown',                icon: BarChart3,       description: 'Top buyers / sellers chart + ranked totals' },
  { to: 'summary',       label: 'Trade Summary',            icon: Briefcase,       description: 'Enter a broker code → stocks they bought and sold' },
  { to: 'traded-stocks', label: 'Stocks Traded by Brokers', icon: Search,          description: 'Enter a stock — see which brokers bought and sold it' },
  { to: 'holdings',      label: 'Holdings',                 icon: Layers,          description: 'Net broker positions in a stock + average accumulation price' },
  { to: 'accum-dist',    label: 'Accum / Dist',             icon: Activity,        description: 'Most accumulated and most distributed stocks (equity only)' },
  { to: 'floorsheet',    label: 'Floorsheet',               icon: FileSpreadsheet, description: 'Raw trade-by-trade transaction log' },
];

export interface BrokerAnalysisContext {
  filters: PeriodFilterValue;
  setFilters: (next: PeriodFilterValue) => void;
}

export default function BrokerAnalysis() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();

  const filters = useMemo<PeriodFilterValue>(() => {
    const period = params.get('period') || '1d';
    const fromQ = params.get('from') || undefined;
    const toQ = params.get('to') || undefined;
    if (fromQ && toQ) return { period, from: fromQ, to: toQ };
    const { from, to } = rangeForPeriod(period);
    return { period, from, to };
  }, [params]);

  // Warm the heaviest queries the moment the user enters Broker Analysis
  useEffect(() => {
    qc.prefetchQuery({
      queryKey: ['broker-breakdown', filters.period, filters.from, filters.to, 10],
      queryFn: () => nepseApi.getBrokerBreakdown({ ...filters, top: 10 }),
    });
    qc.prefetchQuery({
      queryKey: ['accumulation-distribution', 'both', 20, filters.period, filters.from, filters.to],
      queryFn: () => nepseApi.getAccumulationDistribution({ ...filters, type: 'both', limit: 20 }),
    });
  }, [qc, filters.period, filters.from, filters.to]);

  const setFilters = (next: PeriodFilterValue) => {
    const sp = new URLSearchParams(params);
    sp.set('period', next.period);
    if (next.from) sp.set('from', next.from); else sp.delete('from');
    if (next.to) sp.set('to', next.to); else sp.delete('to');
    setParams(sp, { replace: true });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center">
            <Building2 className="text-brand-cyan" size={26} />
          </div>
          <div>
            <h1 className="font-syne text-3xl font-bold leading-tight">Broker Analysis</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              See what every broker is buying and selling, on every stock — in plain English.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-2 border-b border-bg-border pb-1.5">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={{ pathname: t.to, search: params.toString() }}
              title={t.description}
              className={({ isActive }) =>
                `group inline-flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all duration-200
                ${isActive
                  ? 'text-brand-cyan bg-brand-cyan/10 border-b-2 border-brand-cyan -mb-[1.5px]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/60 border-b-2 border-transparent'}`
              }
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>

      <Outlet context={{ filters, setFilters }} />
    </div>
  );
}
