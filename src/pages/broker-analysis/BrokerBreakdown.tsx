import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp, Layers, Repeat, Info, Search } from 'lucide-react';
import { formatNPR } from '../../utils';
import { useBrokerBreakdown } from '../../hooks/useNepseData';
import { PeriodFilter, type PeriodFilterValue } from './PeriodFilter';

type Ctx = { filters: PeriodFilterValue; setFilters: (n: PeriodFilterValue) => void };

const BULL = '#00C48C';
const BEAR = '#FF4D4F';
const GOLD = '#F2C94C';
const CYAN = '#00D4FF';

function compactAmount(value: number) {
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e7) return `${(value / 1e7).toFixed(1)}Cr`;
  if (Math.abs(value) >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

function ChartTooltip({ active, payload, label, accent }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="card p-2 text-xs space-y-0.5">
      <div className="font-syne font-bold text-text-primary">Broker #{label}</div>
      <div className="text-text-secondary">{p.payload?.name}</div>
      <div className="font-jetbrains font-bold" style={{ color: accent }}>
        {formatNPR(p.value, true)}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-text-secondary font-semibold">{label}</div>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="font-jetbrains text-2xl font-bold text-text-primary leading-tight">{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1.5">{sub}</div>}
    </div>
  );
}

export default function BrokerBreakdown() {
  const { filters, setFilters } = useOutletContext<Ctx>();
  const { data, isLoading, isError, refetch, isFetching } = useBrokerBreakdown(filters, 10);
  const [search, setSearch] = useState('');

  const buyers = data?.topBuyers || [];
  const sellers = data?.topSellers || [];
  const rankings = data?.rankings || [];
  const totals = data?.totals || { buy: 0, sell: 0, matching: 0, trades: 0 };

  const buyersChart = useMemo(
    () => buyers.map((b: any) => ({ id: b.id, name: b.name, value: b.buyAmount })),
    [buyers]
  );
  const sellersChart = useMemo(
    () => sellers.map((b: any) => ({ id: b.id, name: b.name, value: b.sellAmount })),
    [sellers]
  );
  // Share Y-axis scale so heights are visually comparable between BUY & SELL charts.
  // Round up to a clean number to avoid jitter on small differences.
  const sharedMax = useMemo(() => {
    const maxBuy = buyersChart.reduce((m: number, x: any) => Math.max(m, x.value), 0);
    const maxSell = sellersChart.reduce((m: number, x: any) => Math.max(m, x.value), 0);
    const raw = Math.max(maxBuy, maxSell);
    if (raw <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    return Math.ceil(raw / magnitude) * magnitude;
  }, [buyersChart, sellersChart]);

  const filteredRankings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rankings;
    return rankings.filter((r: any) =>
      r.name.toLowerCase().includes(q) || r.id.includes(q)
    );
  }, [rankings, search]);

  return (
    <div className="space-y-5">
      <PeriodFilter
        value={filters}
        onChange={setFilters}
        onRefresh={() => refetch()}
        refreshing={isFetching}
        note={data?.range_note}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total buying"   value={formatNPR(totals.buy, true)}      icon={TrendingUp}   color={BULL} sub="All brokers combined" />
        <StatCard label="Total selling"  value={formatNPR(totals.sell, true)}     icon={TrendingDown} color={BEAR} sub="All brokers combined" />
        <StatCard label="Matched volume" value={formatNPR(totals.matching, true)} icon={Repeat}       color={GOLD} sub="Trades where buys and sells overlap" />
        <StatCard label="Total trades"   value={totals.trades.toLocaleString()}   icon={Layers}       color={CYAN} sub={`${rankings.length} brokers active today`} />
      </div>

      {/* DUAL BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-bull-green animate-pulse" />
              <h3 className="font-syne font-bold text-base text-text-primary">Top buying brokers</h3>
            </div>
            <span className="badge-green text-xs">{buyers.length} brokers</span>
          </div>
          <div className="h-72">
            {isLoading ? (
              <div className="h-full rounded-lg skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buyersChart} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="rgba(123,141,176,0.08)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="id" tick={{ fill: '#7B8DB0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, sharedMax]} tickFormatter={compactAmount} tick={{ fill: '#7B8DB0', fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<ChartTooltip accent={BULL} />} cursor={{ fill: 'rgba(0,196,140,0.05)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={42}>
                    {buyersChart.map((_, i: number) => (
                      <Cell key={i} fill={BULL} fillOpacity={1 - i * 0.06} />
                    ))}
                    <LabelList dataKey="value" position="top" formatter={(v: any) => compactAmount(Number(v))} style={{ fill: '#E8EDF5', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-xs text-center text-text-muted mt-2">Broker codes shown on the bottom · same scale as the chart on the right</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-bear-red animate-pulse" />
              <h3 className="font-syne font-bold text-base text-text-primary">Top selling brokers</h3>
            </div>
            <span className="badge-red text-xs">{sellers.length} brokers</span>
          </div>
          <div className="h-72">
            {isLoading ? (
              <div className="h-full rounded-lg skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellersChart} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid stroke="rgba(123,141,176,0.08)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="id" tick={{ fill: '#7B8DB0', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, sharedMax]} tickFormatter={compactAmount} tick={{ fill: '#7B8DB0', fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<ChartTooltip accent={BEAR} />} cursor={{ fill: 'rgba(255,77,79,0.05)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={42}>
                    {sellersChart.map((_, i: number) => (
                      <Cell key={i} fill={BEAR} fillOpacity={1 - i * 0.06} />
                    ))}
                    <LabelList dataKey="value" position="top" formatter={(v: any) => compactAmount(Number(v))} style={{ fill: '#E8EDF5', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="text-xs text-center text-text-muted mt-2">Broker codes shown on the bottom · same scale as the chart on the left</div>
        </motion.div>
      </div>

      {/* COMBINED RANKINGS TABLE — purchase amt | sales amt | total | matching */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-bg-border bg-bg-base/30 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-syne font-bold text-lg">Broker rankings</h2>
            <p className="text-sm text-text-secondary mt-0.5">Sorted by total traded amount. Click any row to dig into that broker's stocks.</p>
          </div>
          <div className="relative w-full md:w-auto">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search broker name or code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10 py-2.5 text-sm w-full md:w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header w-12">Rank</th>
                <th className="table-header w-20">Code</th>
                <th className="table-header">Broker Name</th>
                <th className="table-header text-right">Purchase Amt</th>
                <th className="table-header text-right">Sales Amt</th>
                <th className="table-header text-right">Total Amt</th>
                <th className="table-header text-right">Matching Amt</th>
                <th className="table-header text-right">Net Flow</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="p-10 text-center text-text-muted">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-brand-cyan border-t-transparent" />
                  <div className="mt-3 text-xs">Aggregating floorsheet…</div>
                </td></tr>
              )}
              {isError && !isLoading && (
                <tr><td colSpan={8} className="p-10 text-center text-bear-red text-sm">Failed to load broker breakdown.</td></tr>
              )}
              {!isLoading && filteredRankings.map((r: any, idx: number) => (
                <tr key={r.id} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors table-row-zebra">
                  <td className="table-cell">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                      idx === 0 ? 'bg-brand-gold text-bg-base' :
                      idx === 1 ? 'bg-text-secondary text-bg-base' :
                      idx === 2 ? 'bg-brand-violet/70 text-white' :
                      'bg-bg-elevated text-text-muted'
                    }`}>{idx + 1}</span>
                  </td>
                  <td className="table-cell font-jetbrains text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-bg-elevated text-brand-cyan border border-brand-cyan/20">#{r.id}</span>
                  </td>
                  <td className="table-cell font-medium text-text-primary">{r.name}</td>
                  <td className="table-cell text-right font-jetbrains text-bull-green">{formatNPR(r.buyAmount, true)}</td>
                  <td className="table-cell text-right font-jetbrains text-bear-red">{formatNPR(r.sellAmount, true)}</td>
                  <td className="table-cell text-right font-jetbrains font-bold text-text-primary">{formatNPR(r.totalAmount, true)}</td>
                  <td className="table-cell text-right font-jetbrains text-brand-gold">{formatNPR(r.matchingAmount, true)}</td>
                  <td className={`table-cell text-right font-jetbrains font-bold ${r.netFlow >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                    {r.netFlow >= 0 ? '+' : ''}{formatNPR(r.netFlow, true)}
                  </td>
                </tr>
              ))}
              {!isLoading && filteredRankings.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-text-muted text-sm">
                  No brokers found{search ? ` matching "${search}"` : ''}.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2.5 text-sm text-text-secondary bg-bg-surface/60 border border-bg-border rounded-lg px-4 py-3">
        <Info size={16} className="shrink-0 mt-0.5 text-brand-cyan" />
        <span>
          <strong className="text-text-primary">Matched volume</strong> means the part of a broker's trades that came from the same broker on both sides
          (their buying overlaps their selling). High matched volume usually means market-making — that broker is providing liquidity rather than betting direction.
        </span>
      </div>
    </div>
  );
}
