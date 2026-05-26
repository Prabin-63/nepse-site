import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowDown, ArrowUp, Briefcase, ChevronDown, ChevronUp, HelpCircle,
  Repeat, Search, Sparkles, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { formatNepaliNumber, formatNPR } from '../../utils';
import { PeriodFilter, type PeriodFilterValue } from './PeriodFilter';
import { useBrokerBreakdown, useBrokerProfile, useBrokers } from '../../hooks/useNepseData';

type Ctx = { filters: PeriodFilterValue; setFilters: (n: PeriodFilterValue) => void };
type SortKey = 'amount' | 'qty' | 'rate' | 'symbol';

interface StockRow {
  symbol: string;
  qty: number;
  amount: number;
  avgRate: number;
  trades: number;
  weight: number;
}

function SortHeader({
  label, currentKey, dir, k, onClick, align = 'right',
}: { label: string; currentKey: SortKey; dir: 'asc' | 'desc'; k: SortKey; onClick: () => void; align?: 'left' | 'right' }) {
  const active = currentKey === k;
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-secondary bg-bg-base border-b border-bg-border cursor-pointer select-none transition-colors hover:text-brand-cyan ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
      </span>
    </th>
  );
}

function StockTable({
  title,
  rows,
  tone,
  emptyMessage,
}: {
  title: string;
  rows: StockRow[];
  tone: 'bull' | 'bear';
  emptyMessage: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [rows, sortKey, sortDir]);

  const visible = showAll ? sorted : sorted.slice(0, 10);
  const toggle = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir(k === 'symbol' ? 'asc' : 'desc'); }
  };

  const headerBg = tone === 'bull' ? 'bg-bull-green' : 'bg-bear-red';
  const accent = tone === 'bull' ? 'text-bull-green' : 'text-bear-red';
  const barBg = tone === 'bull' ? 'bg-bull-green' : 'bg-bear-red';

  return (
    <div className="card overflow-hidden">
      <div className={`${headerBg} text-bg-base font-syne font-bold text-base py-3 px-5 flex items-center gap-2 uppercase tracking-wider`}>
        {tone === 'bull' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        {title}
        <span className="ml-auto text-xs opacity-80 font-jetbrains normal-case tracking-normal">
          {rows.length} {rows.length === 1 ? 'stock' : 'stocks'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr>
              <SortHeader label="Symbol" currentKey={sortKey} dir={sortDir} k="symbol" onClick={() => toggle('symbol')} align="left" />
              <SortHeader label="Qty" currentKey={sortKey} dir={sortDir} k="qty" onClick={() => toggle('qty')} />
              <SortHeader label="Avg Rate" currentKey={sortKey} dir={sortDir} k="rate" onClick={() => toggle('rate')} />
              <SortHeader label="Amount" currentKey={sortKey} dir={sortDir} k="amount" onClick={() => toggle('amount')} />
              <SortHeader label="% Share" currentKey={sortKey} dir={sortDir} k="amount" onClick={() => toggle('amount')} />
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.symbol} className="border-b border-bg-border/30 hover:bg-bg-elevated/40 transition-colors">
                <td className="px-4 py-3.5">
                  <span className="font-syne font-bold text-text-primary">{r.symbol}</span>
                </td>
                <td className="px-4 py-3.5 text-right font-jetbrains text-text-secondary">
                  {r.qty.toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-right font-jetbrains text-text-secondary">
                  {r.avgRate > 0 ? formatNepaliNumber(r.avgRate) : '—'}
                </td>
                <td className={`px-4 py-3.5 text-right font-jetbrains font-bold text-base ${accent}`}>
                  {formatNPR(r.amount, true)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <span className="font-jetbrains text-sm text-text-secondary w-10">{r.weight.toFixed(1)}%</span>
                    <span className="hidden md:inline-block w-14 h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <span className={`block h-full ${barBg}`} style={{ width: `${Math.min(100, r.weight)}%` }} />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-text-muted italic text-sm">{emptyMessage}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <div className="p-3 border-t border-bg-border/40 flex justify-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-sm font-medium text-brand-cyan hover:text-brand-cyan/80 transition-colors px-4 py-1.5 rounded-md hover:bg-brand-cyan/5"
          >
            {showAll ? 'Show top 10 only' : `Show all ${rows.length} stocks`}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, tone, icon: Icon,
}: { label: string; value: string; sub?: string; tone?: string; icon: any }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-text-secondary font-medium">{label}</div>
        <Icon size={18} className={tone || 'text-text-muted'} />
      </div>
      <div className={`font-jetbrains font-bold text-2xl leading-tight ${tone || 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1.5">{sub}</div>}
    </div>
  );
}

export default function BrokerTradeSummary() {
  const { filters, setFilters } = useOutletContext<Ctx>();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('broker') || '');
  const [active, setActive] = useState(params.get('broker') || '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: brokers } = useBrokers();
  const { data: breakdown } = useBrokerBreakdown(filters, 5);
  const { data, isLoading, isError, isFetching, refetch } = useBrokerProfile(active, filters);

  const suggestions = useMemo(() => {
    if (!brokers || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    return (brokers as any[])
      .filter(b => b.id.includes(q) || (b.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [brokers, query]);

  const quickPicks = useMemo<any[]>(() => {
    // Use the day's top traders (from breakdown) so first-time users have shortcuts.
    const rankings = breakdown?.rankings || [];
    return rankings.slice(0, 5);
  }, [breakdown]);

  const selectBroker = (id: string) => {
    setActive(id); setQuery(id); setOpen(false);
    const sp = new URLSearchParams(params); sp.set('broker', id); setParams(sp, { replace: true });
    inputRef.current?.blur();
  };

  const clearBroker = () => {
    setActive(''); setQuery('');
    const sp = new URLSearchParams(params); sp.delete('broker'); setParams(sp, { replace: true });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length) selectBroker(suggestions[highlight].id);
      else if (/^\d+$/.test(query.trim())) selectBroker(query.trim());
    } else if (open && suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => (h + 1) % suggestions.length); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => (h - 1 + suggestions.length) % suggestions.length); }
      else if (e.key === 'Escape')    setOpen(false);
    }
  };

  const stocks = (data?.stocks || []) as any[];
  const summary = data?.summary;

  const buyStocks = useMemo<StockRow[]>(() => {
    const totalBuy = summary?.totalBuy || 0;
    return stocks
      .filter(s => (s.buyAmount || 0) > 0)
      .map(s => ({
        symbol: s.symbol,
        qty: s.buyQty,
        amount: s.buyAmount,
        avgRate: s.avgBuyPrice || (s.buyQty ? s.buyAmount / s.buyQty : 0),
        trades: s.trades,
        weight: totalBuy ? (s.buyAmount / totalBuy) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [stocks, summary]);

  const sellStocks = useMemo<StockRow[]>(() => {
    const totalSell = summary?.totalSell || 0;
    return stocks
      .filter(s => (s.sellAmount || 0) > 0)
      .map(s => ({
        symbol: s.symbol,
        qty: s.sellQty,
        amount: s.sellAmount,
        avgRate: s.avgSellPrice || (s.sellQty ? s.sellAmount / s.sellQty : 0),
        trades: s.trades,
        weight: totalSell ? (s.sellAmount / totalSell) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [stocks, summary]);

  // Reset highlight when query changes
  useEffect(() => { setHighlight(0); }, [query]);

  return (
    <div className="space-y-6">
      <PeriodFilter
        value={filters}
        onChange={setFilters}
        onRefresh={() => active && refetch()}
        refreshing={isFetching}
        note={data?.range_note}
      />

      {/* Big, prominent search bar */}
      <div className="card p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-syne font-bold text-lg text-text-primary">Pick a broker</h2>
            <p className="text-sm text-text-secondary">Enter the broker code (like <span className="font-jetbrains text-brand-cyan">58</span>) or type a name. You'll see exactly what they bought and what they sold.</p>
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
            placeholder="Broker number or name..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKey}
            className="input-field w-full pl-12 pr-12 py-4 text-lg font-medium"
          />
          {query && (
            <button onClick={clearBroker} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-bg-elevated text-text-muted">
              <X size={18} />
            </button>
          )}
          {open && suggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 top-full mt-2 card overflow-hidden shadow-2xl max-h-80 overflow-y-auto">
              {suggestions.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={() => selectBroker(b.id)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-5 py-3 flex items-center gap-4 transition-colors
                    ${i === highlight ? 'bg-brand-cyan/10 text-brand-cyan' : 'hover:bg-bg-elevated/60'}`}
                >
                  <span className="font-jetbrains font-bold text-base w-14 shrink-0">#{b.id}</span>
                  <span className="text-text-secondary text-base truncate flex-1">{b.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick picks: top brokers today */}
        {!active && quickPicks.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3 text-sm text-text-secondary">
              <Sparkles size={14} className="text-brand-gold" />
              <span>Today's most active brokers — tap to view</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPicks.map((b: any) => (
                <button
                  key={b.id}
                  onClick={() => selectBroker(b.id)}
                  className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-bg-elevated/50 border border-bg-border hover:border-brand-cyan/50 hover:bg-bg-elevated transition-all"
                >
                  <span className="font-jetbrains font-bold text-brand-cyan">#{b.id}</span>
                  <span className="text-sm text-text-primary group-hover:text-brand-cyan transition-colors">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showHelp && (
          <div className="mt-5 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 text-sm text-text-secondary space-y-1.5 leading-relaxed">
            <p><strong className="text-text-primary">Bought:</strong> Stocks the broker purchased during the session — listed on the left.</p>
            <p><strong className="text-text-primary">Sold:</strong> Stocks the broker sold during the session — listed on the right.</p>
            <p><strong className="text-text-primary">% Share:</strong> What portion of the broker's total buy (or sell) that single stock represents.</p>
            <p><strong className="text-text-primary">Net Flow:</strong> <span className="text-bull-green">Positive</span> means they accumulated more than they sold; <span className="text-bear-red">negative</span> means they distributed.</p>
          </div>
        )}
      </div>

      {/* Selected broker view */}
      {!active && (
        <div className="card p-12 text-center">
          <Briefcase size={36} className="mx-auto mb-4 text-text-muted" />
          <p className="text-base text-text-secondary">Pick a broker above to see what they traded today.</p>
        </div>
      )}

      {active && isLoading && (
        <div className="card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-brand-cyan border-t-transparent" />
          <div className="mt-4 text-sm text-text-secondary">Loading broker #{active}'s trades…</div>
        </div>
      )}

      {active && isError && !isLoading && (
        <div className="card p-10 text-center text-bear-red text-base">Couldn't load broker data. Please try again.</div>
      )}

      {active && summary && data && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Broker header */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center font-syne font-bold text-brand-cyan text-2xl">
                  #{data.broker_id}
                </div>
                <div>
                  <div className="font-syne text-2xl font-bold text-text-primary leading-tight">{data.broker_name}</div>
                  <div className="text-sm text-text-secondary mt-0.5">
                    {summary.tradeCount.toLocaleString()} trades · {summary.uniqueStocks} stocks · {filters.period.toUpperCase()} window
                  </div>
                </div>
              </div>
              <button
                onClick={clearBroker}
                className="text-sm text-text-secondary hover:text-text-primary px-3 py-2 rounded-lg hover:bg-bg-elevated transition-colors flex items-center gap-1.5 self-start md:self-auto"
              >
                <X size={14} /> Change broker
              </button>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Bought today"
              value={formatNPR(summary.totalBuy, true)}
              sub={summary.topBuySymbol ? `Most bought: ${summary.topBuySymbol}` : undefined}
              tone="text-bull-green"
              icon={ArrowUp}
            />
            <StatCard
              label="Sold today"
              value={formatNPR(summary.totalSell, true)}
              sub={summary.topSellSymbol ? `Most sold: ${summary.topSellSymbol}` : undefined}
              tone="text-bear-red"
              icon={ArrowDown}
            />
            <StatCard
              label="Net flow"
              value={`${summary.netFlow >= 0 ? '+' : ''}${formatNPR(summary.netFlow, true)}`}
              sub={summary.netFlow >= 0 ? 'Accumulated more than sold' : 'Sold more than bought'}
              tone={summary.netFlow >= 0 ? 'text-bull-green' : 'text-bear-red'}
              icon={summary.netFlow >= 0 ? TrendingUp : TrendingDown}
            />
            <StatCard
              label="Matched volume"
              value={formatNPR(summary.matchingAmount, true)}
              sub="Where buys and sells overlap"
              tone="text-brand-gold"
              icon={Repeat}
            />
          </div>

          {/* TWO TABLES: BUYING + SELLING */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <StockTable
              title="Stocks they bought"
              rows={buyStocks}
              tone="bull"
              emptyMessage="This broker didn't buy anything in this window."
            />
            <StockTable
              title="Stocks they sold"
              rows={sellStocks}
              tone="bear"
              emptyMessage="This broker didn't sell anything in this window."
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
