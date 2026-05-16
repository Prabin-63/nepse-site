import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight, Volume2, DollarSign, Calendar, Zap, Activity } from 'lucide-react';
import { useMarketStore } from '../store';
import { seedCompanies, seedSectors, seedEvents } from '../data/seed';
import { formatNPR, formatPercent, formatVolume, getPriceColorClass, formatNepaliNumber } from '../utils';
import { fetchTodayPrices, fetchTopGainers, fetchTopLosers, fetchTopVolume, fetchTopTurnover, fetchSectors } from '../services/api';

import { useDashboard } from '../hooks/useNepseData';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading, isError } = useDashboard();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="bg-bear-red/10 border border-bear-red text-bear-red p-4 rounded-lg">
        Could not load live dashboard data.
      </div>
    );
  }

  const {
    nepse_index: nepseIndex,
    market_summary: summary,
    top_gainers: topGainerData,
    top_losers: topLoserData,
    top_turnover: topTurnoverData,
    top_volume: topVolumeData,
    sector_indices: sectorsData,
  } = dashboardData;

  const topGainer = topGainerData?.[0] || {};
  const topLoser = topLoserData?.[0] || {};
  const topByVolume = topVolumeData?.[0] || {};
  const topByTurnover = topTurnoverData?.[0] || {};
  const week52Highs: any[] = []; // Assuming backend doesn't provide this yet
  const week52Lows: any[] = []; // Assuming backend doesn't provide this yet
  const sectors = sectorsData || [];
  
  const sortedByGain = topGainerData || [];

  const eventTypeColors: Record<string, string> = {
    ipo: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
    agm: 'border-brand-violet bg-brand-violet/10 text-brand-violet',
    dividend: 'border-bull-green bg-bull-green/10 text-bull-green',
    bonus: 'border-brand-gold bg-brand-gold/10 text-brand-gold',
    book_closure: 'border-neutral-yellow bg-neutral-yellow/10 text-neutral-yellow',
    rights: 'border-brand-cyan bg-brand-cyan/10 text-brand-cyan',
    fund_unlock: 'border-brand-violet bg-brand-violet/10 text-brand-violet',
    promoter_unlock: 'border-bear-red bg-bear-red/10 text-bear-red',
  };

  return (
    <div className="space-y-6">
      {/* Market Highlights Grid */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Top Gainer', icon: TrendingUp, color: 'bull-green', symbol: topGainer?.symbol, value: topGainer?.ltp, pct: topGainer?.percentageChange },
          { label: 'Top Loser', icon: TrendingDown, color: 'bear-red', symbol: topLoser?.symbol, value: topLoser?.ltp, pct: topLoser?.percentageChange },
          { label: 'Most Active (Vol)', icon: Volume2, color: 'brand-cyan', symbol: topByVolume?.symbol, value: topByVolume?.shareTraded, pct: undefined, isVol: true },
          { label: 'Most Active (TO)', icon: DollarSign, color: 'brand-gold', symbol: topByTurnover?.symbol, value: topByTurnover?.turnover, pct: undefined, isTO: true },
          { label: '52W High Breakouts', icon: ArrowUpRight, color: 'bull-green', count: week52Highs.length, symbol: week52Highs[0]?.symbol },
          { label: '52W Low Hits', icon: ArrowDownRight, color: 'bear-red', count: week52Lows.length, symbol: week52Lows[0]?.symbol },
        ].map((card, i) => (
          <motion.div key={i} variants={fadeUp} className="card p-4 hover:border-bg-border/80 transition-all cursor-pointer group"
            onClick={() => card.symbol && navigate(`/stock/${card.symbol}`)}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className={`text-${card.color}`} />
              <span className="text-[11px] text-text-secondary uppercase tracking-wider">{card.label}</span>
            </div>
            {card.symbol && (
              <div className="font-jetbrains text-lg font-bold text-text-primary group-hover:text-brand-cyan transition-colors">
                {card.symbol}
              </div>
            )}
            {card.value !== undefined && !card.isVol && !card.isTO && (
              <div className="font-jetbrains text-sm text-text-secondary">Rs. {formatNepaliNumber(card.value)}</div>
            )}
            {card.isVol && <div className="font-jetbrains text-sm text-text-secondary">{formatVolume(card.value || 0)} shares</div>}
            {card.isTO && <div className="font-jetbrains text-sm text-text-secondary">{formatNPR(card.value || 0, true)}</div>}
            {card.pct !== undefined && (
              <span className={`font-jetbrains text-xs font-semibold ${getPriceColorClass(card.pct)}`}>{formatPercent(card.pct)}</span>
            )}
            {card.count !== undefined && (
              <div className="font-jetbrains text-2xl font-bold text-text-primary">{card.count}</div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Sector Heatmap */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="card p-5">
        <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
          <Zap size={18} className="text-brand-cyan" /> Sector Heatmap
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {sectors.map((sector: any) => {
            const perChange = sector.perChange || 0;
            const intensity = Math.min(Math.abs(perChange) / 3, 1);
            const bgColor = perChange >= 0
              ? `rgba(0,196,140,${0.08 + intensity * 0.35})`
              : `rgba(255,77,79,${0.08 + intensity * 0.35})`;
            return (
              <div key={sector.id} onClick={() => navigate(`/sector/${sector.id}`)}
                className="rounded-lg p-3 border border-bg-border/50 cursor-pointer hover:scale-[1.02] transition-all"
                style={{ background: bgColor }}>
                <div className="text-xs font-medium text-text-primary truncate">{sector.index}</div>
                <div className="text-[10px] text-text-muted font-noto-devanagari">{sector.nameNepali || ''}</div>
                <div className={`font-jetbrains text-sm font-bold mt-1 ${getPriceColorClass(perChange)}`}>
                  {formatPercent(perChange)}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span className="text-bull-green">{sector.stocksUp}↑</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-bear-red">{sector.stocksDown}↓</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Two Column: Top Stocks + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Movers */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-3 card p-5">
          <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-brand-cyan" /> Top Movers Today
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-bg-border">
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-right py-2 px-2">LTP</th>
                  <th className="text-right py-2 px-2">Change</th>
                  <th className="text-right py-2 px-2">Vol</th>
                  <th className="text-right py-2 px-2">Turnover</th>
                </tr>
              </thead>
              <tbody>
                {sortedByGain.slice(0, 10).map((s: any, i: number) => (
                  <tr key={s.symbol} onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors">
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-text-primary">{s.symbol}</span>
                      <span className="text-text-muted text-xs ml-1.5 hidden sm:inline">{s.securityName}</span>
                    </td>
                    <td className="text-right py-2.5 px-2 font-jetbrains font-medium">{formatNepaliNumber(s.ltp)}</td>
                    <td className={`text-right py-2.5 px-2 font-jetbrains font-semibold ${getPriceColorClass(s.percentageChange)}`}>
                      {formatPercent(s.percentageChange)}
                    </td>
                    <td className="text-right py-2.5 px-2 font-jetbrains text-text-secondary">—</td>
                    <td className="text-right py-2.5 px-2 font-jetbrains text-text-secondary">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-2 card p-5">
          <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-brand-gold" /> Upcoming Events
          </h2>
          <div className="space-y-2.5">
            {seedEvents.map((evt) => (
              <div key={evt.id} className={`rounded-lg p-3 border ${eventTypeColors[evt.type] || 'border-bg-border'} cursor-pointer
                hover:scale-[1.01] transition-all`}
                onClick={() => evt.symbol && navigate(`/stock/${evt.symbol}`)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold">{evt.type.replace('_', ' ')}</span>
                  <span className="text-[10px] text-text-muted font-jetbrains">{evt.date}</span>
                </div>
                <div className="text-sm font-medium text-text-primary">{evt.title}</div>
                {evt.description && <div className="text-xs text-text-secondary mt-0.5">{evt.description}</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Market Statistics */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="card p-5">
        <h2 className="font-syne text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-brand-violet" /> Today's Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'NEPSE Index', value: formatNepaliNumber(nepseIndex?.find((i: any) => i.index === 'NEPSE Index')?.currentValue || 0), sub: formatPercent(nepseIndex?.find((i: any) => i.index === 'NEPSE Index')?.perChange || 0), color: getPriceColorClass(nepseIndex?.find((i: any) => i.index === 'NEPSE Index')?.change || 0) },
            { label: 'Total Turnover', value: formatNPR(summary?.find((s: any) => s.detail === 'Total Turnover Rs:')?.value || summary?.find((s: any) => s.detail === 'Total Turnover')?.value || 0, true), sub: '', color: 'text-text-primary' },
            { label: 'Shares Traded', value: formatVolume(summary?.find((s: any) => s.detail === 'Total Traded Shares')?.value || 0), sub: '', color: 'text-text-primary' },
            { label: 'Transactions', value: formatNepaliNumber(summary?.find((s: any) => s.detail === 'Total Transactions')?.value || 0, 0), sub: '', color: 'text-text-primary' },
            { label: 'Advancing', value: String(summary?.find((s: any) => s.detail === 'Total Advance')?.value || 0), sub: '', color: 'text-bull-green' },
            { label: 'Declining', value: String(summary?.find((s: any) => s.detail === 'Total Decline')?.value || 0), sub: '', color: 'text-bear-red' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="stat-label mb-1">{stat.label}</div>
              <div className={`font-jetbrains text-xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className={`font-jetbrains text-xs ${stat.color}`}>{stat.sub}</div>}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
