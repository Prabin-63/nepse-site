import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, BarChart3, Volume2, Banknote,
  Calendar, Zap, Activity, Flame, ChevronRight, Sparkles, Eye
} from 'lucide-react';
import { useDashboard } from '../hooks/useNepseData';
import { formatNPR, formatPercent, formatVolume, getPriceColorClass, formatNepaliNumber } from '../utils';
import { seedEvents } from '../data/seed';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

/* ── Market Mood Gauge ─────────────────────────── */
function MarketMood({ advancing, declining, indexChange }: { advancing: number; declining: number; indexChange: number }) {
  const hasBreadth = advancing > 0 || declining > 0;
  
  let score = 0.5;
  if (hasBreadth) {
    const total = advancing + declining;
    const ratio = advancing / total;
    const raw = ratio * 0.7 + (indexChange > 0 ? 0.15 : indexChange < 0 ? -0.15 : 0) + 0.15;
    score = Math.max(0, Math.min(1, raw));
  } else {
    // Purely index based fallback
    score = indexChange > 1 ? 0.8 : indexChange > 0 ? 0.6 : indexChange < -1 ? 0.2 : indexChange < 0 ? 0.4 : 0.5;
  }

  let mood = 'Neutral', emoji = '⚖️', color = 'text-neutral-yellow', bg = 'bg-neutral-yellow/10', border = 'border-neutral-yellow/30';
  if (score > 0.65) { mood = 'Very Bullish'; emoji = '🔥'; color = 'text-bull-green'; bg = 'bg-bull-green/10'; border = 'border-bull-green/30'; }
  else if (score > 0.55) { mood = 'Bullish'; emoji = '🐂'; color = 'text-bull-green'; bg = 'bg-bull-green/10'; border = 'border-bull-green/30'; }
  else if (score < 0.35) { mood = 'Very Bearish'; emoji = '💀'; color = 'text-bear-red'; bg = 'bg-bear-red/10'; border = 'border-bear-red/30'; }
  else if (score < 0.45) { mood = 'Bearish'; emoji = '🐻'; color = 'text-bear-red'; bg = 'bg-bear-red/10'; border = 'border-bear-red/30'; }

  return (
    <div className={`flex flex-col items-center gap-3 p-5 rounded-2xl border ${border} ${bg} w-full max-w-[260px]`}>
      <span className="text-4xl leading-none">{emoji}</span>
      <span className={`font-syne text-lg font-bold ${color}`}>{mood}</span>
      <div className="w-full">
        <div className="h-2 rounded-full bg-bg-base overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-bear-red via-neutral-yellow to-bull-green opacity-30" />
          <motion.div
            className="absolute top-0 h-full w-1 bg-text-primary rounded-full shadow-lg"
            initial={{ left: '50%' }}
            animate={{ left: `${score * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
      {hasBreadth ? (
        <div className="flex gap-4 text-xs">
          <span className="text-bull-green font-jetbrains font-bold">{advancing} ↑</span>
          <span className="text-text-muted">vs</span>
          <span className="text-bear-red font-jetbrains font-bold">{declining} ↓</span>
        </div>
      ) : (
        <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
          Market Status
        </div>
      )}
    </div>
  );
}

/* ── Skeleton Loader ───────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-bg-surface border border-bg-border h-52 skeleton" />
      <div className="flex gap-3">
        {[1, 2, 3].map(i => <div key={i} className="h-9 rounded-full skeleton flex-1" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="rounded-xl skeleton h-72 border border-bg-border" />)}
      </div>
    </div>
  );
}

/* ── Mover Card ────────────────────────────────── */
function MoverCard({ stock, rank, type, onClick }: { stock: any; rank: number; type: 'gainer' | 'loser' | 'volume' | 'turnover'; onClick: () => void }) {
  const borderColor = type === 'gainer' ? 'border-l-bull-green' : type === 'loser' ? 'border-l-bear-red' : type === 'turnover' ? 'border-l-brand-gold' : 'border-l-brand-cyan';
  const rankColors = ['bg-brand-gold text-bg-base', 'bg-text-secondary text-bg-base', 'bg-brand-violet/60 text-white'];
  const rankBg = rank <= 3 ? rankColors[rank - 1] : 'bg-bg-border text-text-muted';

  return (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-xl bg-bg-base/50 border-l-[3px] ${borderColor}
        hover:bg-bg-elevated/80 cursor-pointer transition-all duration-200 group`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankBg}`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-text-primary text-sm group-hover:text-brand-cyan transition-colors truncate">
          {stock.symbol}
        </div>
        <div className="text-[10px] text-text-muted truncate">{stock.securityName || stock.companyName || ''}</div>
      </div>
      <div className="text-right shrink-0">
        {type === 'volume' ? (
          <div className="font-jetbrains text-sm font-bold text-brand-cyan">{formatVolume(stock.shareTraded || stock.totalTradeQuantity || 0)}</div>
        ) : type === 'turnover' ? (
          <div className="font-jetbrains text-sm font-bold text-brand-gold">{formatNPR(stock.turnover || stock.totalTradeValue || 0, true)}</div>
        ) : (
          <>
            <div className="font-jetbrains text-sm font-medium text-text-primary">Rs. {formatNepaliNumber(stock.ltp || stock.lastTradedPrice || 0)}</div>
            <div className={`font-jetbrains text-xs font-bold ${getPriceColorClass(stock.percentageChange || 0)}`}>
              {formatPercent(stock.percentageChange || 0)}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Event Type Config ─────────────────────────── */
const eventStyles: Record<string, string> = {
  ipo: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
  agm: 'border-brand-violet bg-brand-violet/10 text-brand-violet',
  dividend: 'border-bull-green bg-bull-green/10 text-bull-green',
  bonus: 'border-brand-gold bg-brand-gold/10 text-brand-gold',
  book_closure: 'border-neutral-yellow bg-neutral-yellow/10 text-neutral-yellow',
  rights: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
};

/* ── Main Dashboard ────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  const derived = useMemo(() => {
    if (!data) return null;
    const { nepse_index, market_summary, top_gainers, top_losers, top_turnover, top_volume, sector_indices, live_market, events: apiEvents } = data;
    const nepseIdx = nepse_index?.find((i: any) => i.index === 'NEPSE Index') || { currentValue: 0, change: 0, perChange: 0 };
    const summary = market_summary || [];
    const findSummary = (key: string) => {
      const val = summary.find((s: any) => s.detail?.includes(key))?.value || 0;
      if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
      return val;
    };

    const liveMarketData = live_market || [];
    const advancing = liveMarketData.filter((s: any) => s.percentageChange > 0).length;
    const declining = liveMarketData.filter((s: any) => s.percentageChange < 0).length;
    const unchanged = liveMarketData.filter((s: any) => s.percentageChange === 0).length;

    const turnover = findSummary('Turnover');
    const sharesTraded = findSummary('Traded Shares');
    const transactions = findSummary('Transactions');
    const sectors = (sector_indices || []).slice().sort((a: any, b: any) => (b.perChange || 0) - (a.perChange || 0));
    const leadingSector = sectors[0];
    const events = apiEvents || seedEvents;

    // Smart insights
    const insights: { emoji: string; text: string; color: string }[] = [];
    const hasBreadth = advancing > 0 || declining > 0;
    
    if (hasBreadth) {
      if (advancing > declining) {
        insights.push({ emoji: '🟢', text: `Bullish day — ${advancing} stocks advancing vs ${declining} declining`, color: 'bull-green' });
      } else if (declining > advancing) {
        insights.push({ emoji: '🔴', text: `Bearish day — ${declining} stocks declining vs ${advancing} advancing`, color: 'bear-red' });
      } else {
        insights.push({ emoji: '🟡', text: `Flat market — ${advancing} advancing, ${declining} declining`, color: 'neutral-yellow' });
      }
    } else {
      if (nepseIdx.perChange > 0) insights.push({ emoji: '🟢', text: `Market closed up by ${formatPercent(nepseIdx.perChange)}`, color: 'bull-green' });
      else if (nepseIdx.perChange < 0) insights.push({ emoji: '🔴', text: `Market closed down by ${formatPercent(nepseIdx.perChange)}`, color: 'bear-red' });
    }
    const tg = (top_gainers || [])[0];
    if (tg) insights.push({ emoji: '🔥', text: `${tg.symbol} leads gainers at ${formatPercent(tg.percentageChange)}`, color: 'bull-green' });
    if (leadingSector) insights.push({ emoji: '📊', text: `${leadingSector.index} sector strongest at ${formatPercent(leadingSector.perChange || 0)}`, color: 'brand-cyan' });
    if (turnover > 0) insights.push({ emoji: '💰', text: `Turnover Rs. ${(turnover / 1e9).toFixed(2)} Arba today`, color: 'brand-gold' });

    return { nepseIdx, advancing, declining, unchanged, turnover, sharesTraded, transactions, sectors, insights, events, topGainers: top_gainers || [], topLosers: top_losers || [], topVolume: top_volume || [], topTurnover: top_turnover || [] };
  }, [data]);

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !derived) return (
    <div className="card p-8 text-center border-bear-red/30">
      <AlertTriangleIcon />
      <p className="text-bear-red mt-2">Could not load live market data. Check your connection.</p>
    </div>
  );

  const { nepseIdx, advancing, declining, turnover, sharesTraded, transactions, sectors, insights, events, topGainers, topLosers, topVolume } = derived;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

      {/* ═══ HERO CARD ═══ */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-surface via-bg-surface to-bg-elevated border border-bg-border/80 p-6 lg:p-8">
        {/* Ambient glows */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-cyan/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-brand-violet/[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {/* NEPSE Index */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
              <span className="text-[11px] text-text-secondary uppercase tracking-[0.15em] font-medium">NEPSE Index</span>
            </div>
            <motion.div
              className="font-jetbrains text-5xl lg:text-6xl font-black text-text-primary tracking-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {formatNepaliNumber(nepseIdx.currentValue)}
            </motion.div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`font-jetbrains text-xl font-bold ${getPriceColorClass(nepseIdx.change)}`}>
                {nepseIdx.change >= 0 ? '+' : ''}{(nepseIdx.change || 0).toFixed(2)}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold font-jetbrains ${
                (nepseIdx.perChange || 0) >= 0 ? 'bg-bull-green/15 text-bull-green' : 'bg-bear-red/15 text-bear-red'
              }`}>
                {(nepseIdx.perChange || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatPercent(nepseIdx.perChange || 0)}
              </span>
            </div>
          </div>

          {/* Market Mood */}
          <div className="flex justify-center">
            <MarketMood advancing={advancing} declining={declining} indexChange={nepseIdx.perChange || 0} />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Turnover', value: formatNPR(turnover, true), icon: Banknote, color: 'text-brand-gold' },
              { label: 'Volume', value: formatVolume(sharesTraded), icon: Volume2, color: 'text-brand-cyan' },
              { label: 'Transactions', value: formatNepaliNumber(transactions, 0), icon: Activity, color: 'text-brand-violet' },
              { label: 'Breadth', value: (advancing > 0 || declining > 0) ? `${advancing}↑ ${declining}↓` : 'N/A', icon: BarChart3, color: 'text-text-primary' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-bg-base/60 border border-bg-border/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon size={12} className={stat.color} />
                  <span className="text-[10px] text-text-muted uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className={`font-jetbrains text-sm font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══ SMART INSIGHTS ═══ */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 mr-1">
          <Sparkles size={14} className="text-brand-gold" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Insights</span>
        </div>
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              bg-${ins.color}/10 text-${ins.color} border border-${ins.color}/20`}
          >
            <span>{ins.emoji}</span>
            <span>{ins.text}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ MARKET MOVERS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Gainers */}
        <motion.div variants={fadeUp} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne text-base font-bold flex items-center gap-2">
              <TrendingUp size={16} className="text-bull-green" /> Top Gainers
            </h2>
            <button onClick={() => navigate('/live-market')} className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <motion.div variants={stagger} className="space-y-2">
            {topGainers.slice(0, 5).map((s: any, i: number) => (
              <MoverCard key={s.symbol} stock={s} rank={i + 1} type="gainer" onClick={() => navigate(`/stock/${s.symbol}`)} />
            ))}
            {topGainers.length === 0 && <p className="text-sm text-text-muted text-center py-8">No data available</p>}
          </motion.div>
        </motion.div>

        {/* Losers */}
        <motion.div variants={fadeUp} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne text-base font-bold flex items-center gap-2">
              <TrendingDown size={16} className="text-bear-red" /> Top Losers
            </h2>
            <button onClick={() => navigate('/live-market')} className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <motion.div variants={stagger} className="space-y-2">
            {topLosers.slice(0, 5).map((s: any, i: number) => (
              <MoverCard key={s.symbol} stock={s} rank={i + 1} type="loser" onClick={() => navigate(`/stock/${s.symbol}`)} />
            ))}
            {topLosers.length === 0 && <p className="text-sm text-text-muted text-center py-8">No data available</p>}
          </motion.div>
        </motion.div>

        {/* Most Active */}
        <motion.div variants={fadeUp} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne text-base font-bold flex items-center gap-2">
              <Flame size={16} className="text-brand-cyan" /> Most Active
            </h2>
            <button onClick={() => navigate('/live-market')} className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <motion.div variants={stagger} className="space-y-2">
            {topVolume.slice(0, 5).map((s: any, i: number) => (
              <MoverCard key={s.symbol} stock={s} rank={i + 1} type="volume" onClick={() => navigate(`/stock/${s.symbol}`)} />
            ))}
            {topVolume.length === 0 && <p className="text-sm text-text-muted text-center py-8">No data available</p>}
          </motion.div>
        </motion.div>

        {/* Highest Turnover */}
        <motion.div variants={fadeUp} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-syne text-base font-bold flex items-center gap-2">
              <Banknote size={16} className="text-brand-gold" /> Top Turnover
            </h2>
            <button onClick={() => navigate('/live-market')} className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <motion.div variants={stagger} className="space-y-2">
            {derived.topTurnover.slice(0, 5).map((s: any, i: number) => (
              <MoverCard key={s.symbol} stock={s} rank={i + 1} type="turnover" onClick={() => navigate(`/stock/${s.symbol}`)} />
            ))}
            {derived.topTurnover.length === 0 && <p className="text-sm text-text-muted text-center py-8">No data available</p>}
          </motion.div>
        </motion.div>
      </div>

      {/* ═══ SECTOR HEATMAP ═══ */}
      <motion.div variants={fadeUp} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-syne text-base font-bold flex items-center gap-2">
            <Zap size={16} className="text-brand-cyan" /> Sector Performance
          </h2>
          <button onClick={() => navigate('/sector')} className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
            Details <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {sectors.map((sector: any) => {
            const pc = sector.perChange || 0;
            const intensity = Math.min(Math.abs(pc) / 3, 1);
            const bg = pc >= 0
              ? `rgba(0,196,140,${0.08 + intensity * 0.3})`
              : `rgba(255,77,79,${0.08 + intensity * 0.3})`;
            
            // Try to compute breadth if liveMarket is available
            const sectorStocks = (data?.live_market || []).filter((s: any) => s.sector === sector.index || s.sectorName === sector.index || s.sector_name === sector.index);
            let up = sector.stocksUp;
            let down = sector.stocksDown;
            if (up === undefined && sectorStocks.length > 0) {
              up = sectorStocks.filter((s: any) => s.percentageChange > 0).length;
              down = sectorStocks.filter((s: any) => s.percentageChange < 0).length;
            }

            const hasBreadth = up !== undefined && down !== undefined;

            return (
              <motion.div
                key={sector.id || sector.index}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/sector')}
                className="rounded-xl p-3 border border-bg-border/50 cursor-pointer transition-shadow hover:shadow-lg flex flex-col justify-between"
                style={{ background: bg, minHeight: '84px' }}
              >
                <div>
                  <div className="text-xs font-semibold text-text-primary truncate" title={sector.index}>{sector.index}</div>
                  <div className={`font-jetbrains text-lg font-black mt-1 ${getPriceColorClass(pc)}`}>
                    {formatPercent(pc)}
                  </div>
                </div>
                {hasBreadth && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] bg-bg-surface/30 w-max px-1.5 py-0.5 rounded">
                    <span className="text-bull-green font-bold">{up}↑</span>
                    <span className="text-text-muted">/</span>
                    <span className="text-bear-red font-bold">{down}↓</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ STATS + EVENTS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="lg:col-span-2 card p-5">
          <h2 className="font-syne text-base font-bold mb-4 flex items-center gap-2">
            <Eye size={16} className="text-brand-violet" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Live Market', desc: 'All stocks & prices', path: '/live-market', color: 'from-brand-cyan/20 to-brand-cyan/5', icon: Activity },
              { label: 'Screener', desc: 'Filter & find stocks', path: '/screener', color: 'from-brand-violet/20 to-brand-violet/5', icon: BarChart3 },
              { label: 'Portfolio', desc: 'Track your holdings', path: '/portfolio', color: 'from-bull-green/20 to-bull-green/5', icon: TrendingUp },
              { label: 'Calculators', desc: 'Profit & fee calc', path: '/calculators', color: 'from-brand-gold/20 to-brand-gold/5', icon: Banknote },
            ].map((action) => (
              <motion.button
                key={action.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                className={`rounded-xl p-4 bg-gradient-to-br ${action.color} border border-bg-border/50
                  text-left hover:border-bg-border transition-all group`}
              >
                <action.icon size={20} className="text-text-secondary group-hover:text-text-primary transition-colors mb-2" />
                <div className="font-semibold text-sm text-text-primary">{action.label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{action.desc}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div variants={fadeUp} className="lg:col-span-3 card p-5">
          <h2 className="font-syne text-base font-bold mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-brand-gold" /> Upcoming Events
          </h2>
          <div className="space-y-2">
            {events.slice(0, 5).map((evt: any) => (
              <div
                key={evt.id}
                className={`rounded-xl p-3 border ${eventStyles[evt.type] || 'border-bg-border bg-bg-base/30'} cursor-pointer
                  hover:scale-[1.01] transition-all`}
                onClick={() => evt.symbol && navigate(`/stock/${evt.symbol}`)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold">{evt.type.replace('_', ' ')}</span>
                  <span className="text-[10px] text-text-muted font-jetbrains">{evt.date}</span>
                </div>
                <div className="text-sm font-medium text-text-primary">{evt.title}</div>
                {evt.description && <div className="text-xs text-text-secondary mt-0.5">{evt.description}</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function AlertTriangleIcon() {
  return <div className="text-bear-red flex justify-center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>;
}
