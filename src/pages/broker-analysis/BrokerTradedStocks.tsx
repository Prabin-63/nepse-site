import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRightLeft, HelpCircle, Search, Sparkles, X } from 'lucide-react';
import { formatNepaliNumber, formatNPR, formatPercent, getPriceColorClass } from '../../utils';
import { useBrokerTradedStock, useCompanyList, useLiveTrading } from '../../hooks/useNepseData';
import { PeriodFilter, type PeriodFilterValue } from './PeriodFilter';

type Ctx = { filters: PeriodFilterValue; setFilters: (n: PeriodFilterValue) => void };

interface BrokerRow {
  id: string;
  name: string;
  qty: number;
  amount: number;
  rate: number;
  weight: number;
  trades: number;
}

function BrokerTable({
  title,
  color,
  rows,
  rowsToShow,
  onLoadMore,
  emptyText,
}: {
  title: string;
  color: 'bull' | 'bear';
  rows: BrokerRow[];
  rowsToShow: number;
  onLoadMore: () => void;
  emptyText: string;
}) {
  const isBull = color === 'bull';
  const headerBg = isBull ? 'bg-bull-green' : 'bg-bear-red';
  const accent = isBull ? 'text-bull-green' : 'text-bear-red';
  const barBg = isBull ? 'bg-bull-green' : 'bg-bear-red';
  const visible = rows.slice(0, rowsToShow);
  return (
    <div className="card overflow-hidden">
      <div className={`${headerBg} text-bg-base font-syne font-bold text-base py-3 px-5 flex items-center justify-between uppercase tracking-wider`}>
        <span>{title}</span>
        <span className="text-xs opacity-90 font-jetbrains normal-case tracking-normal">
          {rows.length} {rows.length === 1 ? 'broker' : 'brokers'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-bg-base/40">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-secondary">{isBull ? 'Buyer' : 'Seller'}</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">Avg rate</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-text-secondary">% share</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded font-jetbrains text-sm font-bold bg-bg-elevated ${accent} border border-current/30`}>#{r.id}</span>
                    <span className="text-sm text-text-primary truncate" title={r.name}>{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-right font-jetbrains text-text-secondary">{r.qty.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-jetbrains text-text-secondary">{formatNepaliNumber(r.rate)}</td>
                <td className={`px-4 py-3.5 text-right font-jetbrains font-bold ${accent}`}>{formatNPR(r.amount, true)}</td>
                <td className="px-4 py-3.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <span className="font-jetbrains text-sm text-text-secondary w-12">{r.weight.toFixed(1)}%</span>
                    <span className="hidden sm:inline-block w-14 h-2 rounded-full bg-bg-elevated overflow-hidden">
                      <span className={`block h-full ${barBg}`} style={{ width: `${Math.min(100, r.weight)}%` }} />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="p-10 text-center text-text-muted text-sm italic">{emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > rowsToShow && (
        <div className="p-3 border-t border-bg-border/40 flex justify-center">
          <button
            onClick={onLoadMore}
            className="text-sm font-medium text-brand-cyan hover:text-brand-cyan/80 transition-colors px-4 py-1.5 rounded-md hover:bg-brand-cyan/5"
          >
            Show {rows.length - rowsToShow} more
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">{label}</div>
      <div className={`font-jetbrains font-bold text-xl mt-1 ${tone || 'text-text-primary'}`}>{value}</div>
      {sub && <div className={`text-xs font-jetbrains mt-0.5 ${tone || 'text-text-secondary'}`}>{sub}</div>}
    </div>
  );
}

export default function BrokerTradedStocks() {
  const { filters, setFilters } = useOutletContext<Ctx>();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('symbol') || '');
  const [active, setActive] = useState(params.get('symbol') || '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [buyShow, setBuyShow] = useState(10);
  const [sellShow, setSellShow] = useState(10);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companies } = useCompanyList();
  const { data: liveData } = useLiveTrading();
  const { data, isLoading, isError, refetch, isFetching } = useBrokerTradedStock(active, filters);

  useEffect(() => { setBuyShow(10); setSellShow(10); }, [active, filters.period, filters.from, filters.to]);

  const matches = useMemo(() => {
    if (!query.trim() || !companies) return [];
    const q = query.trim().toLowerCase();
    return (companies as any[])
      .filter(c => (c.symbol || '').toLowerCase().includes(q) || (c.companyName || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, companies]);

  const quickPicks = useMemo<any[]>(() => {
    const live = (liveData as any[]) || [];
    return [...live]
      .sort((a, b) => (b.amount || b.turnover || 0) - (a.amount || a.turnover || 0))
      .slice(0, 6);
  }, [liveData]);

  const selectSymbol = (symbol: string) => {
    const sym = symbol.toUpperCase();
    setActive(sym); setQuery(sym); setOpen(false); setHighlight(0);
    const sp = new URLSearchParams(params); sp.set('symbol', sym); setParams(sp, { replace: true });
    inputRef.current?.blur();
  };

  const clearSymbol = () => {
    setActive(''); setQuery('');
    const sp = new URLSearchParams(params); sp.delete('symbol'); setParams(sp, { replace: true });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) return;
    if (e.key === 'ArrowDown')      { e.preventDefault(); setHighlight(h => (h + 1) % matches.length); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => (h - 1 + matches.length) % matches.length); }
    else if (e.key === 'Enter')     { e.preventDefault(); selectSymbol(matches[highlight].symbol); }
    else if (e.key === 'Escape')    { setOpen(false); }
  };

  const summary = data?.summary;
  const buyers = (data?.buyers || []) as BrokerRow[];
  const sellers = (data?.sellers || []) as BrokerRow[];

  return (
    <div className="space-y-6">
      <PeriodFilter value={filters} onChange={setFilters} onRefresh={() => active && refetch()} refreshing={isFetching} note={data?.range_note} />

      <div className="card p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-syne font-bold text-lg text-text-primary">Pick a stock</h2>
            <p className="text-sm text-text-secondary">Enter the stock symbol (like <span className="font-jetbrains text-brand-cyan">NABIL</span>) or company name. You'll see exactly which brokers bought it and which sold it.</p>
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
            onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0); }}
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
              <span>Today's most-traded stocks — tap to view</span>
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
            <p><strong className="text-text-primary">Buy side (green):</strong> Brokers who bought this stock — listed left, ranked by amount.</p>
            <p><strong className="text-text-primary">Sell side (red):</strong> Brokers who sold this stock — listed right, ranked by amount.</p>
            <p><strong className="text-text-primary">Avg rate:</strong> The weighted average price that broker paid (or received) for this stock today.</p>
            <p><strong className="text-text-primary">% share:</strong> What slice of all the buying (or selling) volume that single broker accounts for. Big shares = concentrated activity.</p>
          </div>
        )}
      </div>

      {!active && (
        <div className="card p-12 text-center">
          <ArrowRightLeft size={36} className="mx-auto mb-4 text-text-muted" />
          <p className="text-base text-text-secondary">Pick a stock above to see who bought it and who sold it today.</p>
        </div>
      )}

      {active && isLoading && (
        <div className="card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-brand-cyan border-t-transparent" />
          <div className="mt-4 text-sm text-text-secondary">Reading {active}'s floorsheet…</div>
        </div>
      )}

      {active && isError && !isLoading && (
        <div className="card p-10 text-center text-bear-red text-base">Couldn't load broker breakdown for {active}.</div>
      )}

      {active && summary && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Stock header card */}
          <div className="card p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-violet/20 border border-brand-cyan/30 flex items-center justify-center font-syne font-bold text-brand-cyan text-base">
                  {summary.symbol.slice(0, 4)}
                </div>
                <div>
                  <div className="font-syne font-bold text-2xl text-text-primary leading-tight">{summary.symbol}</div>
                  <div className="text-sm text-text-secondary mt-0.5">
                    {summary.tradeCount.toLocaleString()} trades · {filters.period.toUpperCase()} window
                  </div>
                </div>
              </div>
              {summary.priceChangePercent != null && (
                <div className={`font-jetbrains font-bold text-2xl ${getPriceColorClass(summary.priceChangePercent)}`}>
                  {formatPercent(summary.priceChangePercent)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              <Stat label="Close price"  value={summary.closePrice != null ? formatNepaliNumber(summary.closePrice) : '—'} />
              <Stat
                label="Price change"
                value={summary.priceChange != null ? formatNepaliNumber(summary.priceChange) : '—'}
                tone={summary.priceChange != null ? getPriceColorClass(summary.priceChange) : ''}
              />
              <Stat label="Average rate"   value={formatNepaliNumber(summary.avgRate)} />
              <Stat label="Total quantity" value={summary.totalQty.toLocaleString()} />
              <Stat label="Total turnover" value={formatNPR(summary.totalAmount, true)} tone="text-brand-gold" />
            </div>
          </div>

          {/* TWO TABLES: BUY / SELL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BrokerTable
              title="Buying brokers"
              color="bull"
              rows={buyers}
              rowsToShow={buyShow}
              onLoadMore={() => setBuyShow(s => s + 10)}
              emptyText={`No buy-side trades recorded for ${summary.symbol} yet.`}
            />
            <BrokerTable
              title="Selling brokers"
              color="bear"
              rows={sellers}
              rowsToShow={sellShow}
              onLoadMore={() => setSellShow(s => s + 10)}
              emptyText={`No sell-side trades recorded for ${summary.symbol} yet.`}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
