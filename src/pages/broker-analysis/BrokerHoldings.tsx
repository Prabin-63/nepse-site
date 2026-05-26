import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import { Layers, Search, X, Info, ArrowUpRight, ArrowDownRight, HelpCircle, Sparkles } from 'lucide-react';
import { formatNepaliNumber, formatNPR, formatPercent, getPriceColorClass } from '../../utils';
import { PeriodFilter, type PeriodFilterValue } from './PeriodFilter';
import { useBrokerHoldings, useCompanyList, useLiveTrading } from '../../hooks/useNepseData';

type Ctx = { filters: PeriodFilterValue; setFilters: (n: PeriodFilterValue) => void };

function compactNum(value: number) {
  if (Math.abs(value) >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`;
  if (Math.abs(value) >= 1e5) return `${(value / 1e5).toFixed(2)}L`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function BrokerHoldings() {
  const { filters, setFilters } = useOutletContext<Ctx>();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('symbol') || '');
  const [active, setActive] = useState(params.get('symbol') || '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companies } = useCompanyList();
  const { data: liveData } = useLiveTrading();
  const { data, isLoading, isError, isFetching, refetch } = useBrokerHoldings(active, filters);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => { setHighlight(0); }, [query]);

  const quickPicks = useMemo<any[]>(() => {
    const live = (liveData as any[]) || [];
    return [...live]
      .sort((a, b) => (b.amount || b.turnover || 0) - (a.amount || a.turnover || 0))
      .slice(0, 6);
  }, [liveData]);

  const matches = useMemo(() => {
    if (!query.trim() || !companies) return [];
    const q = query.trim().toLowerCase();
    return (companies as any[])
      .filter(c => (c.symbol || '').toLowerCase().includes(q) || (c.companyName || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, companies]);

  const selectSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    setActive(sym); setQuery(sym); setOpen(false);
    const sp = new URLSearchParams(params); sp.set('symbol', sym); setParams(sp, { replace: true });
    inputRef.current?.blur();
  };

  const clearSymbol = () => {
    setActive(''); setQuery('');
    const sp = new URLSearchParams(params); sp.delete('symbol'); setParams(sp, { replace: true });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) {
      if (e.key === 'Enter') selectSymbol(query.trim());
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => (h - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter') { e.preventDefault(); selectSymbol(matches[highlight].symbol); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const summary = data?.summary;
  const holders = (data?.holders || []) as any[];
  const reducers = (data?.reducers || []) as any[];

  const chartData = useMemo(
    () => holders.slice(0, 12).map(h => ({ id: h.id, name: h.name, netQty: h.netQty, avgBuyPrice: h.avgBuyPrice })),
    [holders]
  );

  const ltp = summary?.closePrice;

  return (
    <div className="space-y-6">
      <PeriodFilter value={filters} onChange={setFilters} onRefresh={() => active && refetch()} refreshing={isFetching} note={data?.range_note} />

      {/* Search */}
      <div className="card p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-syne font-bold text-lg text-text-primary">Pick a stock</h2>
            <p className="text-sm text-text-secondary">See which brokers built up a position today — and at what average price.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHelp(v => !v)}
            className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <HelpCircle size={14} /> {showHelp ? 'Hide help' : 'How do I read this?'}
          </button>
        </div>
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Stock symbol or company name..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKey}
            className="input-field w-full pl-12 pr-12 py-4 text-lg font-medium"
          />
          {query && (
            <button onClick={clearSymbol} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-bg-elevated text-text-muted">
              <X size={18} />
            </button>
          )}
          {open && matches.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-2 card overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
              {matches.map((m, i) => (
                <button
                  key={m.symbol}
                  type="button"
                  onMouseDown={() => selectSymbol(m.symbol)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-5 py-3 flex items-center justify-between gap-3 transition-colors
                    ${i === highlight ? 'bg-brand-cyan/10 text-brand-cyan' : 'hover:bg-bg-elevated/60'}`}
                >
                  <span className="font-jetbrains font-bold text-base w-24 shrink-0">{m.symbol}</span>
                  <span className="text-sm text-text-secondary truncate flex-1">{m.companyName}</span>
                  <span className="text-xs text-text-muted hidden md:inline">{m.sectorName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!active && quickPicks.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3 text-sm text-text-secondary">
              <Sparkles size={14} className="text-brand-gold" />
              <span>Most-traded stocks today — tap to inspect</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPicks.map((s: any) => (
                <button
                  key={s.symbol}
                  onClick={() => selectSymbol(s.symbol)}
                  className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-bg-elevated/50 border border-bg-border hover:border-brand-cyan/50 hover:bg-bg-elevated transition-all"
                >
                  <span className="font-jetbrains font-bold text-brand-cyan">{s.symbol}</span>
                  <span className={`text-sm font-jetbrains ${getPriceColorClass(s.percentageChange ?? s.change ?? 0)}`}>
                    {formatPercent(s.percentageChange ?? s.change ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showHelp && (
          <div className="mt-5 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 text-sm text-text-secondary space-y-1.5 leading-relaxed">
            <p><strong className="text-text-primary">Accumulators:</strong> Brokers whose buying exceeded their selling for this stock today. They built a net long position.</p>
            <p><strong className="text-text-primary">Distributors:</strong> Brokers whose selling exceeded their buying. They reduced exposure.</p>
            <p><strong className="text-text-primary">Avg price:</strong> Average rate the broker paid (for buyers) or received (for sellers) for that net position today.</p>
            <p><strong className="text-text-primary">P/L vs LTP:</strong> Where the position sits today — green if in profit, red if underwater versus the last traded price.</p>
          </div>
        )}
      </div>

      {!active && (
        <div className="card p-12 text-center">
          <Layers size={36} className="mx-auto mb-4 text-text-muted" />
          <p className="text-base text-text-secondary">Pick a stock above to see which brokers built positions today.</p>
        </div>
      )}

      {active && isLoading && (
        <div className="card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-brand-cyan border-t-transparent" />
          <div className="mt-4 text-sm text-text-secondary">Computing {active} holdings…</div>
        </div>
      )}

      {active && isError && !isLoading && (
        <div className="card p-10 text-center text-bear-red text-base">Couldn't load holdings.</div>
      )}

      {active && summary && data && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Stock header */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center font-syne font-bold text-brand-cyan text-base">
                  {summary.symbol.slice(0, 4)}
                </div>
                <div>
                  <div className="font-syne font-bold text-2xl text-text-primary leading-tight">{summary.symbol}</div>
                  <div className="text-sm text-text-secondary mt-0.5">
                    {summary.uniqueBrokers} brokers active · {summary.netHolders} accumulating · {summary.netReducers} reducing
                  </div>
                </div>
              </div>
              {summary.priceChangePercent != null && (
                <div className={`font-jetbrains font-bold text-2xl ${getPriceColorClass(summary.priceChangePercent)}`}>
                  {formatPercent(summary.priceChangePercent)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <Stat label="Last traded price" value={ltp != null ? formatNepaliNumber(ltp) : '—'} />
              <Stat label="Total volume" value={summary.totalVolume.toLocaleString()} tone="text-brand-cyan" />
              <Stat label="Total turnover" value={formatNPR(summary.totalAmount, true)} tone="text-brand-gold" />
              <Stat label="Net flow" value={`${summary.netHolders} buyers · ${summary.netReducers} sellers`} />
            </div>
          </div>

          {/* Bar chart of top net holders */}
          {chartData.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-syne font-bold text-base text-text-primary">Top brokers building a position</h3>
                <span className="text-xs text-text-secondary">Net qty = bought − sold today</span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke="rgba(123,141,176,0.08)" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="id" tick={{ fill: '#7B8DB0', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={compactNum} tick={{ fill: '#7B8DB0', fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,196,140,0.05)' }}
                      contentStyle={{ background: 'rgb(13,20,33)', border: '1px solid rgb(28,38,64)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any, k: any, p: any) => {
                        if (k === 'netQty') return [`${Number(v).toLocaleString()} shares`, 'Net Qty'];
                        return [v, k];
                      }}
                      labelFormatter={(label, payload) => {
                        const item = (payload?.[0] as any)?.payload;
                        return `Broker #${label}${item ? ` · ${item.name}` : ''}`;
                      }}
                    />
                    <Bar dataKey="netQty" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="#00C48C" fillOpacity={1 - i * 0.05} />
                      ))}
                      <LabelList
                        dataKey="netQty"
                        position="top"
                        formatter={(v: any) => compactNum(Number(v))}
                        style={{ fill: '#E8EDF5', fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-center text-text-muted mt-2">Broker codes shown on the bottom · sorted by net accumulated quantity</div>
            </div>
          )}

          {/* Two tables: holders (net buy) and reducers (net sell) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <HoldersTable
              title="Accumulators · building position"
              tone="bull"
              rows={holders}
              ltp={ltp}
              labelQty="Net bought"
            />
            <HoldersTable
              title="Distributors · reducing position"
              tone="bear"
              rows={reducers.map(r => ({ ...r, _absNet: Math.abs(r.netQty) }))}
              ltp={ltp}
              labelQty="Net sold"
              useAbsNet
            />
          </div>

          <div className="flex items-start gap-2.5 text-sm text-text-secondary bg-bg-surface/60 border border-bg-border rounded-lg px-4 py-3">
            <Info size={16} className="shrink-0 mt-0.5 text-brand-cyan" />
            <span>
              Net positions are calculated from <strong className="text-text-primary">today's session only</strong> — they show how much inventory each broker accumulated or distributed during the day.
              Use these as a flow indicator (smart money tells), not a permanent holdings record.
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: any) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">{label}</div>
      <div className={`font-jetbrains font-bold text-xl mt-1 ${tone || 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

function HoldersTable({ title, tone, rows, ltp, labelQty, useAbsNet }: any) {
  const accent = tone === 'bull' ? 'text-bull-green' : 'text-bear-red';
  const head = tone === 'bull' ? 'bg-bull-green' : 'bg-bear-red';
  return (
    <div className="card overflow-hidden">
      <div className={`${head} text-bg-base font-syne font-bold text-base py-3 px-5 flex items-center justify-between uppercase tracking-wider`}>
        <span className="flex items-center gap-2">
          {tone === 'bull' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
          {title}
        </span>
        <span className="text-xs opacity-90 font-jetbrains normal-case tracking-normal">
          {rows.length} {rows.length === 1 ? 'broker' : 'brokers'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-bg-base/40">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">Broker</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">{labelQty}</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">Avg price</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">P/L vs LTP</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const avgPrice = tone === 'bull' ? r.avgBuyPrice : r.avgSellPrice;
              const showQty = useAbsNet ? r._absNet : r.netQty;
              const pl = ltp != null && avgPrice > 0
                ? (tone === 'bull' ? (ltp - avgPrice) / avgPrice : (avgPrice - ltp) / avgPrice) * 100
                : null;
              return (
                <tr key={r.id} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded font-jetbrains text-sm font-bold bg-bg-elevated ${accent} border border-current/30`}>#{r.id}</span>
                      <span className="text-sm text-text-primary truncate" title={r.name}>{r.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 text-right font-jetbrains font-bold ${accent}`}>{Number(showQty).toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-jetbrains text-text-secondary">{avgPrice ? formatNepaliNumber(avgPrice) : '—'}</td>
                  <td className={`px-4 py-3.5 text-right font-jetbrains font-bold ${pl == null ? 'text-text-muted' : (pl >= 0 ? 'text-bull-green' : 'text-bear-red')}`}>
                    {pl == null ? '—' : `${pl >= 0 ? '+' : ''}${pl.toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-3.5 text-right font-jetbrains text-text-secondary">{r.concentration.toFixed(1)}%</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-text-muted text-sm italic">No brokers in this bucket.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
