import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ChevronRight, Sparkles, Search, ShieldCheck, HelpCircle,
} from 'lucide-react';
import { formatNepaliNumber, formatPercent, getPriceColorClass } from '../../utils';
import { PeriodFilter, type PeriodFilterValue } from './PeriodFilter';
import { useAccumulationDistribution } from '../../hooks/useNepseData';

type Ctx = { filters: PeriodFilterValue; setFilters: (n: PeriodFilterValue) => void };
type Mode = 'accumulation' | 'distribution';

const MOMENTUM_BADGE: Record<string, string> = {
  strong_up: 'bg-bull-green/20 text-bull-green border-bull-green/30',
  up: 'bg-bull-green/10 text-bull-green border-bull-green/20',
  neutral: 'bg-text-muted/15 text-text-secondary border-text-muted/30',
  down: 'bg-bear-red/10 text-bear-red border-bear-red/20',
  strong_down: 'bg-bear-red/20 text-bear-red border-bear-red/30',
};
const MOMENTUM_LABEL: Record<string, string> = {
  strong_up: 'Strong up', up: 'Rising', neutral: 'Flat', down: 'Sliding', strong_down: 'Strong down',
};

function MomentumBadge({ momentum, percent }: { momentum: string; percent: number }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${MOMENTUM_BADGE[momentum] || MOMENTUM_BADGE.neutral}`}>
      {percent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      <span>{MOMENTUM_LABEL[momentum] || 'Flat'}</span>
      <span className="opacity-70 font-jetbrains">{formatPercent(percent)}</span>
    </span>
  );
}

function RangeBar({ position }: { position: number | null }) {
  if (position == null) return <span className="text-text-muted text-xs">—</span>;
  const clamped = Math.max(0, Math.min(100, position));
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-bg-elevated rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-bear-red via-neutral-yellow to-bull-green opacity-60" style={{ width: '100%' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-1 h-3.5 bg-text-primary rounded shadow" style={{ left: `${clamped}%` }} />
      </div>
      <span className="text-xs font-jetbrains text-text-secondary">{clamped.toFixed(0)}%</span>
    </div>
  );
}

export default function AccumulationDistribution() {
  const { filters, setFilters } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('accumulation');
  const [search, setSearch] = useState('');
  const [onlyStealth, setOnlyStealth] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { data, isLoading, isError, isFetching, refetch } = useAccumulationDistribution(filters, 'both', 30);

  const rawList = useMemo<any[]>(() => {
    return ((data?.[mode] || []) as any[]);
  }, [data, mode]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = rawList;
    if (q) arr = arr.filter(it => it.symbol.toLowerCase().includes(q));
    if (mode === 'accumulation' && onlyStealth) arr = arr.filter(it => it.stealth);
    return arr;
  }, [rawList, search, mode, onlyStealth]);

  const isBull = mode === 'accumulation';
  const accent = isBull ? 'text-bull-green' : 'text-bear-red';
  const accentBg = isBull ? 'bg-bull-green/10' : 'bg-bear-red/10';
  const accentBorder = isBull ? 'border-bull-green/30' : 'border-bear-red/30';

  return (
    <div className="space-y-6">
      <PeriodFilter value={filters} onChange={setFilters} onRefresh={() => refetch()} refreshing={isFetching} note={data?.range_note} />

      {/* Mode toggle + filters */}
      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1.5 bg-bg-base border border-bg-border rounded-xl self-start">
            <button
              onClick={() => setMode('accumulation')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                ${mode === 'accumulation' ? 'bg-bull-green text-bg-base shadow-glow-green' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <TrendingUp size={16} /> Accumulation
            </button>
            <button
              onClick={() => setMode('distribution')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
                ${mode === 'distribution' ? 'bg-bear-red text-bg-base shadow-glow-red' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <TrendingDown size={16} /> Distribution
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Filter symbol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-10 py-2.5 text-sm w-56"
              />
            </div>
            {mode === 'accumulation' && (
              <button
                onClick={() => setOnlyStealth(v => !v)}
                className={`px-3.5 py-2.5 rounded-lg text-sm font-semibold border transition-all flex items-center gap-1.5
                  ${onlyStealth ? 'bg-brand-violet/15 text-brand-violet border-brand-violet/40' : 'border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted'}`}
              >
                <Sparkles size={14} /> Stealth only
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowHelp(v => !v)}
              className="px-3.5 py-2.5 rounded-lg text-sm border border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors flex items-center gap-1.5"
            >
              <HelpCircle size={14} /> {showHelp ? 'Hide help' : 'How does this work?'}
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="mt-5 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 text-sm text-text-secondary space-y-1.5 leading-relaxed">
            <p><strong className="text-text-primary">Accumulation:</strong> Stocks where brokers are quietly building positions — net buying outweighs net selling.</p>
            <p><strong className="text-text-primary">Distribution:</strong> Stocks where brokers are reducing exposure — net selling outweighs net buying.</p>
            <p><strong className="text-text-primary">Stealth:</strong> High broker concentration with a small price move — the classic "smart money loading quietly" pattern.</p>
            <p className="pt-1 text-xs flex items-start gap-2">
              <ShieldCheck size={14} className="text-bull-green shrink-0 mt-0.5" />
              <span>This screen only shows <strong className="text-text-primary">tradable equities</strong>. Promoter shares, mutual fund units, debentures, and bonds are filtered out automatically.</span>
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-brand-cyan border-t-transparent" />
          <div className="mt-4 text-sm text-text-secondary">Scanning floorsheet for {mode}…</div>
        </div>
      )}

      {isError && !isLoading && (
        <div className="card p-10 text-center text-bear-red text-base">Couldn't load {mode} data.</div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Headline */}
          <div className={`card p-5 ${accentBg} ${accentBorder} border`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${isBull ? 'bg-bull-green/20' : 'bg-bear-red/20'} flex items-center justify-center`}>
                {isBull ? <TrendingUp className="text-bull-green" size={22} /> : <TrendingDown className="text-bear-red" size={22} />}
              </div>
              <div className="flex-1">
                <div className={`font-syne font-bold text-xl ${accent}`}>
                  {isBull ? 'Where smart money is buying' : 'Where smart money is offloading'}
                </div>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  Ranked by how much one or two brokers dominate the {isBull ? 'buying' : 'selling'} side, weighted with {isBull ? 'price strength' : 'price weakness'}.
                  {isBull && onlyStealth && ' Filtered to stealth accumulation only — high concentration with a calm price.'}
                  {' '}Promoter shares and mutual fund units are excluded.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">Stocks found</div>
                <div className={`font-jetbrains text-3xl font-bold ${accent}`}>{list.length}</div>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((item: any, idx: number) => (
              <motion.div
                key={item.symbol}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                className={`card p-5 relative overflow-hidden border-l-4 ${isBull ? 'border-l-bull-green' : 'border-l-bear-red'} hover:border-l-brand-cyan cursor-pointer group transition-all`}
                onClick={() => navigate(`/broker-analysis/holdings?symbol=${item.symbol}&period=${filters.period}`)}
              >
                {item.stealth && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-brand-violet/15 text-brand-violet border border-brand-violet/30 rounded-full px-2.5 py-1">
                    <Sparkles size={11} /> Stealth
                  </span>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-syne text-2xl font-bold text-text-primary group-hover:text-brand-cyan transition-colors leading-tight">
                      {item.symbol}
                    </div>
                    <div className="text-xs text-text-muted mt-1">Rank #{idx + 1}</div>
                  </div>
                  <MomentumBadge momentum={item.momentum} percent={item.priceChangePercent || 0} />
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">{isBull ? 'Net bought' : 'Net sold'}</div>
                    <div className={`font-jetbrains font-bold text-lg mt-1 ${accent}`}>{item.dominantNet.toLocaleString()}</div>
                    <div className="text-xs text-text-muted">shares</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-text-muted font-semibold">Avg rate</div>
                    <div className="font-jetbrains font-bold text-lg mt-1 text-text-primary">{formatNepaliNumber(item.avgRate)}</div>
                    <div className="text-xs text-text-muted">
                      LTP: <span className={`font-jetbrains ${getPriceColorClass(item.priceChangePercent || 0)}`}>{item.ltp ? formatNepaliNumber(item.ltp) : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-bg-border/40 pt-3 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-text-muted font-semibold flex items-center justify-between">
                    <span>Top {isBull ? 'buying' : 'selling'} brokers</span>
                    <span className="text-text-secondary normal-case font-normal">{item.concentration.toFixed(0)}% concentrated</span>
                  </div>
                  {(item.topBrokers || []).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`px-2 py-0.5 rounded font-jetbrains text-xs font-bold bg-bg-elevated ${accent} border border-current/30 shrink-0`}>#{b.id}</span>
                        <span className="text-text-secondary truncate" title={b.name}>{b.name}</span>
                      </div>
                      <span className={`font-jetbrains font-bold ${accent} shrink-0`}>
                        {Math.abs(b.netQty).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-bg-border/40">
                  <div className="text-xs text-text-secondary">52-week range:</div>
                  <RangeBar position={item.rangePosition} />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                  <span className="font-jetbrains">Volume: {item.totalVolume.toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1 text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                    See brokers <ChevronRight size={14} />
                  </span>
                </div>
              </motion.div>
            ))}
            {list.length === 0 && (
              <div className="card p-12 text-center text-text-muted text-base md:col-span-2 xl:col-span-3">
                No stocks match the current filter.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
