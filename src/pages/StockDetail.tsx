import { useState, useEffect, useMemo, useRef } from 'react';
import type { DrawingRef } from '../components/charts/CandlestickChart';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Bell, BarChart2, FileText, Activity, Users, Info, 
  MessageSquare, Layers, TrendingUp, TrendingDown, Clock, Globe, Search
} from 'lucide-react';
import { useMarketStore, useWatchlistStore, useUIStore } from '../store';
import { 
  useStockPrice, useStockDetail, useStockChart, useStockDailyChart, useCompanyFloorsheet, 
  useCompanyList, useLiveTrading, useStockDepth, useStockBrokers, useNews, useMarketStatus
} from '../hooks/useNepseData';
import { 
  formatNPR, formatPercent, getPriceColorClass, 
  formatVolume, formatNepaliNumber, formatChange,
  calcSMA, calcEMA, calcRSI
} from '../utils';
import {
  enrichFundamentals,
  normalizeFloorsheetTrades,
  normalizeMarketDepth,
  filterNewsForStock,
  newsItemTitle,
  newsItemLink,
  newsItemDate,
  sectorsMatch,
  computeStockInsight,
  type EnrichedFundamentals,
  type FloorsheetTrade,
} from '../lib/stockData';
import CandlestickChart from '../components/charts/CandlestickChart';
import { RotateCw } from 'lucide-react';

const DRAW_TOOLS = [
  { id: 'none', label: 'None', icon: '🖱️' },
  { id: 'trendline', label: 'Trendline', icon: '📐' },
  { id: 'hline', label: 'Horiz. Line', icon: '➖' },
  { id: 'fib', label: 'Fibonacci', icon: '🌀' },
  { id: 'rect', label: 'Rectangle', icon: '⬜' },
];

const INDICATOR_LIST = [
  { id: 'sma20', label: 'SMA 20' },
  { id: 'sma50', label: 'SMA 50' },
  { id: 'ema9', label: 'EMA 9' },
  { id: 'bb', label: 'Bollinger Bands' },
  { id: 'vwap', label: 'VWAP' },
];

const ChartTab = ({ symbol, data, dailyData, liveStock }: { symbol: string, data: any[], dailyData: any[], liveStock: any }) => {
  const [timeframe, setTimeframe] = useState('3M');
  const [drawTool, setDrawToolState] = useState<string>('none');
  const [showDrawMenu, setShowDrawMenu] = useState(false);
  const [showIndMenu, setShowIndMenu] = useState(false);
  const [activeInds, setActiveInds] = useState<string[]>([]);
  const chartRef = useRef<DrawingRef>(null);

  const setDrawTool = (tool: string) => {
    setDrawToolState(tool);
    chartRef.current?.setDrawMode(tool);
  };

  const clearDrawings = () => {
    chartRef.current?.clearDrawings();
  };

  const filteredData = useMemo(() => {
    if (timeframe === '1D') {
      if (!dailyData || dailyData.length === 0) return [];
      
      const candles: any[] = [];
      const msInterval = 5 * 60 * 1000; // 5-minute candles
      
      [...dailyData]
        .sort((a, b) => (a.time || 0) - (b.time || 0))
        .forEach(tick => {
          const tickTimeMs = (tick.time || 0) * ((tick.time || 0) > 10000000000 ? 1 : 1000);
          if (tickTimeMs === 0) return;
          const candleTimeMs = Math.floor(tickTimeMs / msInterval) * msInterval;
          const price = tick.contractRate || 0;
          const qty = tick.contractQuantity || 0;
      
          let currentCandle = candles[candles.length - 1];
          if (!currentCandle || currentCandle.timeMs !== candleTimeMs) {
            candles.push({
              timeMs: candleTimeMs,
              time: candleTimeMs / 1000,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: qty
            });
          } else {
            currentCandle.high = Math.max(currentCandle.high, price);
            currentCandle.low = Math.min(currentCandle.low, price);
            currentCandle.close = price;
            currentCandle.volume += qty;
          }
        });
      return candles;
    }

    let sourceData = [...(data || [])];
    
    // Append today's live OHLC to historical data if missing
    if (sourceData.length > 0 && liveStock && liveStock.ltp > 0) {
      const lastDataDate = new Date(sourceData[sourceData.length - 1].time * 1000);
      const today = new Date();
      if (lastDataDate.toDateString() !== today.toDateString()) {
        const todayUtcMidnight = new Date(`${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`).getTime() / 1000;
        // Make sure it's strictly greater than the last time
        if (todayUtcMidnight > sourceData[sourceData.length - 1].time) {
          sourceData.push({
            time: todayUtcMidnight,
            open: liveStock.open || liveStock.ltp,
            high: liveStock.high || liveStock.ltp,
            low: liveStock.low || liveStock.ltp,
            close: liveStock.ltp,
            volume: liveStock.volume || 0,
          });
        }
      }
    }

    if (sourceData.length === 0) return [];

    const latestTime = sourceData.reduce((max, d) => {
      const ts = typeof d.time === 'number' ? d.time * 1000 : new Date(d.time || d.date).getTime();
      return Math.max(max, ts);
    }, 0);
    const latestDate = new Date(latestTime || Date.now());
    let cutoff = new Date(latestDate.getTime());
    
    switch (timeframe) {
      case '1W': cutoff.setDate(latestDate.getDate() - 7); break;
      case '1M': cutoff.setMonth(latestDate.getMonth() - 1); break;
      case '3M': cutoff.setMonth(latestDate.getMonth() - 3); break;
      case '6M': cutoff.setMonth(latestDate.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(latestDate.getFullYear() - 1); break;
      case '5Y': cutoff.setFullYear(latestDate.getFullYear() - 5); break;
      case 'All': return sourceData;
      default: return sourceData;
    }
    
    return sourceData.filter(d => {
      const ts = typeof d.time === 'number' ? d.time * 1000 : new Date(d.time || d.date).getTime();
      return ts >= cutoff.getTime();
    });
  }, [data, dailyData, timeframe, liveStock]);

  const toggleInd = (id: string) =>
    setActiveInds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'All'].map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${timeframe === tf ? 'bg-brand-cyan text-bg-base' : 'border border-bg-border text-text-secondary hover:bg-bg-elevated'}`}>
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-2 relative">
          {/* Indicators dropdown */}
          <div className="relative">
            <button onClick={() => { setShowIndMenu(v => !v); setShowDrawMenu(false); }}
              className={`btn-secondary py-1 px-3 text-xs flex items-center gap-1.5 ${activeInds.length > 0 ? 'text-brand-cyan border-brand-cyan/50' : ''}`}>
              📊 Indicators {activeInds.length > 0 && <span className="bg-brand-cyan text-bg-base text-[9px] font-black px-1 rounded-full">{activeInds.length}</span>}
            </button>
            {showIndMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 card border-bg-border shadow-xl z-50 p-2 space-y-1">
                {INDICATOR_LIST.map(ind => (
                  <button key={ind.id} onClick={() => toggleInd(ind.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors text-left">
                    <div className={`w-3 h-3 rounded border-2 flex items-center justify-center ${activeInds.includes(ind.id) ? 'bg-brand-cyan border-brand-cyan' : 'border-bg-border'}`}>
                      {activeInds.includes(ind.id) && <span className="text-[7px] text-bg-base font-bold">✓</span>}
                    </div>
                    <span className="text-xs text-text-secondary">{ind.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Draw tools dropdown */}
          <div className="relative">
            <button onClick={() => { setShowDrawMenu(v => !v); setShowIndMenu(false); }}
              className={`btn-secondary py-1 px-3 text-xs flex items-center gap-1.5 ${drawTool !== 'none' ? 'text-brand-gold border-brand-gold/50' : ''}`}>
              ✏️ {DRAW_TOOLS.find(t => t.id === drawTool)?.label || 'Draw'}
            </button>
            {showDrawMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 card border-bg-border shadow-xl z-50 p-2 space-y-1">
                {DRAW_TOOLS.map(tool => (
                  <button key={tool.id} onClick={() => { setDrawTool(tool.id); setShowDrawMenu(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors text-left ${drawTool === tool.id ? 'text-brand-gold' : 'text-text-secondary'}`}>
                    <span className="text-sm">{tool.icon}</span>
                    <span className="text-xs">{tool.label}</span>
                    {drawTool === tool.id && <span className="ml-auto text-[9px] text-brand-gold font-bold">ACTIVE</span>}
                  </button>
                ))}
                {drawTool !== 'none' && (
                  <button onClick={() => { clearDrawings(); setShowDrawMenu(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bear-red/10 text-bear-red text-left mt-1 border-t border-bg-border/50 pt-2">
                    <span className="text-xs">🗑 Clear all drawings</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {drawTool !== 'none' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg text-xs text-brand-gold">
          <span className="font-bold">DRAW MODE:</span>
          <span>{DRAW_TOOLS.find(t => t.id === drawTool)?.label}</span>
          <span className="text-text-muted">—</span>
          <span className="text-text-muted">
            {drawTool === 'trendline' ? 'Click 2 points on chart' :
             drawTool === 'hline' ? 'Click any price level' :
             drawTool === 'fib' ? 'Click swing high, then swing low' :
             'Click top-left, then bottom-right'}
          </span>
          <button onClick={clearDrawings} className="px-2 py-0.5 rounded text-[10px] bg-bg-elevated text-text-muted hover:text-bear-red transition-colors">Clear</button>
          <button onClick={() => setDrawTool('none')} className="ml-1 text-text-muted hover:text-bear-red transition-colors font-bold">✕ Exit</button>
        </div>
      )}
      <div className="h-[500px] border border-bg-border/30 rounded-xl overflow-hidden bg-bg-base/30">
        {filteredData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted">
            <span className="text-4xl opacity-30">📊</span>
            <p className="text-sm">No chart data available for {symbol}</p>
            <p className="text-xs opacity-60">Data loads from the NEPSE API — try switching timeframes</p>
          </div>
        ) : (
          <CandlestickChart symbol={symbol} ref={chartRef} data={filteredData} />
        )}
      </div>
    </div>
  );
};
const TabRefreshBar = ({
  label,
  updatedAt,
  onRefresh,
  isRefetching,
}: {
  label: string;
  updatedAt?: number;
  onRefresh: () => void;
  isRefetching?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 pb-3 border-b border-bg-border/30 mb-4">
    <span className="text-[10px] text-text-muted uppercase tracking-wider">
      {label}
      {updatedAt ? ` · Updated ${new Date(updatedAt).toLocaleTimeString()}` : ''}
    </span>
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefetching}
      className="btn-secondary py-1 px-2.5 text-[10px] flex items-center gap-1.5"
    >
      <RotateCw size={12} className={isRefetching ? 'animate-spin' : ''} /> Refresh
    </button>
  </div>
);

const FundamentalsTab = ({
  fundamentals,
  ltp,
  volume,
  turnover,
}: {
  fundamentals: EnrichedFundamentals;
  ltp: number;
  volume: number;
  turnover: number;
}) => {
  const pctFromHigh =
    fundamentals.week52High > 0
      ? (((fundamentals.week52High - ltp) / fundamentals.week52High) * 100).toFixed(1)
      : null;
  const pctFromLow =
    fundamentals.week52Low > 0
      ? (((ltp - fundamentals.week52Low) / fundamentals.week52Low) * 100).toFixed(1)
      : null;

  const rows = [
    { label: 'Earnings Per Share (EPS)', value: fundamentals.eps || '—', note: 'Net profit divided by total shares' },
    { label: 'Price to Earnings (P/E)', value: fundamentals.peRatio || '—', note: 'Price per share / EPS' },
    { label: 'Book Value Per Share', value: fundamentals.bookValue || '—', note: 'Net assets divided by shares' },
    { label: 'Price to Book (P/B)', value: fundamentals.pbRatio || '—', note: 'Market price / Book value' },
    {
      label: 'Dividend Yield',
      value: fundamentals.dividendYield ? `${fundamentals.dividendYield}%` : '—',
      note: 'Annual dividend / current price',
    },
    { label: 'Return on Equity (ROE)', value: fundamentals.roe ? `${fundamentals.roe}%` : '—', note: 'Net profit / shareholder equity' },
    { label: 'Return on Assets (ROA)', value: fundamentals.roa ? `${fundamentals.roa}%` : '—', note: 'Net income / total assets' },
    { label: 'Net Interest Margin', value: fundamentals.nim ? `${fundamentals.nim}%` : '—', note: 'Banking sector metric' },
    { label: 'Market Cap', value: formatNPR(fundamentals.marketCap || 0, true), note: 'Total market value' },
    {
      label: '52-Week Range',
      value: `${formatNepaliNumber(fundamentals.week52Low)} – ${formatNepaliNumber(fundamentals.week52High)}`,
      note: pctFromHigh && pctFromLow ? `${pctFromHigh}% below high · ${pctFromLow}% above low` : '',
    },
    { label: "Today's Volume", value: formatVolume(volume), note: 'Shares traded today' },
    { label: "Today's Turnover", value: formatNPR(turnover, true), note: 'Total traded value today' },
  ];

  const sourceLabel =
    fundamentals.source === 'api' ? 'NEPSE live' : fundamentals.source === 'seed' ? 'Reference data' : 'Sector estimate';

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-text-muted">
        Fundamentals sourced from {sourceLabel}. EPS/P/E refresh with live price when the API omits them.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-bg-border/20 border border-bg-border/20 rounded-xl overflow-hidden">
        {rows.map((r, i) => (
          <div key={i} className="bg-bg-surface p-4">
            <div className="text-[10px] uppercase text-text-muted tracking-wider mb-1">{r.label}</div>
            <div className="font-jetbrains text-lg font-bold text-text-primary">{r.value as string}</div>
            {r.note && <div className="text-[10px] text-text-muted/70 mt-0.5">{r.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};


const FloorsheetTab = ({
  symbol,
  trades,
  isLoading,
  updatedAt,
  onRefresh,
  isRefetching,
  marketOpen,
}: {
  symbol: string;
  trades: FloorsheetTrade[];
  isLoading: boolean;
  updatedAt?: number;
  onRefresh: () => void;
  isRefetching?: boolean;
  marketOpen?: boolean;
}) => {
  const { setSelectedBrokerId } = useUIStore();

  const totals = useMemo(
    () =>
      trades.reduce(
        (acc, t) => ({
          qty: acc.qty + t.contractQuantity,
          amount: acc.amount + t.contractQuantity * t.contractRate,
        }),
        { qty: 0, amount: 0 }
      ),
    [trades]
  );

  if (isLoading && trades.length === 0) {
    return <div className="p-8 text-center text-text-muted">Loading floorsheet...</div>;
  }

  return (
    <div className="space-y-4">
      <TabRefreshBar label="Live floorsheet" updatedAt={updatedAt} onRefresh={onRefresh} isRefetching={isRefetching} />
      <div className="flex items-center justify-between">
        <h4 className="font-syne font-bold">Today&apos;s Trades — {symbol}</h4>
        <span className="text-xs text-text-muted">{trades.length} transactions</span>
      </div>

      {trades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Total Qty</div>
            <div className="font-jetbrains font-bold">{totals.qty.toLocaleString()}</div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Total Amount</div>
            <div className="font-jetbrains font-bold text-brand-gold">{formatNPR(totals.amount, true)}</div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Avg Rate</div>
            <div className="font-jetbrains font-bold">
              {totals.qty > 0 ? formatNepaliNumber(totals.amount / totals.qty) : '—'}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Bulk ({'>'}500)</div>
            <div className="font-jetbrains font-bold">{trades.filter((t) => t.contractQuantity >= 500).length}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-base/30">
            <tr>
              <th className="table-header">Trans #</th>
              <th className="table-header">Time</th>
              <th className="table-header">Buyer</th>
              <th className="table-header">Seller</th>
              <th className="table-header text-right">Qty</th>
              <th className="table-header text-right">Rate</th>
              <th className="table-header text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 150).map((t) => (
              <tr key={String(t.contractId)} className="border-b border-bg-border/20 hover:bg-bg-elevated/40 transition-colors">
                <td className="table-cell text-text-muted font-jetbrains text-xs">#{t.contractId}</td>
                <td className="table-cell font-jetbrains text-xs">{t.contractTime}</td>
                <td className="table-cell">
                  <span
                    onClick={() => setSelectedBrokerId(t.buyerMemberId)}
                    className="px-1.5 py-0.5 rounded bg-bull-green/10 text-bull-green text-xs font-bold cursor-pointer hover:bg-bull-green/20 transition-colors"
                  >
                    {t.buyerMemberId || '—'}
                  </span>
                </td>
                <td className="table-cell">
                  <span
                    onClick={() => setSelectedBrokerId(t.sellerMemberId)}
                    className="px-1.5 py-0.5 rounded bg-bear-red/10 text-bear-red text-xs font-bold cursor-pointer hover:bg-bear-red/20 transition-colors"
                  >
                    {t.sellerMemberId || '—'}
                  </span>
                </td>
                <td className="table-cell text-right font-jetbrains">{t.contractQuantity.toLocaleString()}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(t.contractRate)}</td>
                <td className="table-cell text-right font-jetbrains text-text-primary">
                  {formatNepaliNumber(t.contractQuantity * t.contractRate)}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-8 text-text-muted">
                  {marketOpen
                    ? `No trades recorded for ${symbol} yet today. Data refreshes automatically during market hours.`
                    : `No trades for ${symbol} in the latest session. Check back when the market opens.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BrokerActivityTab = ({
  symbol,
  brokerStats,
  isLoading,
  updatedAt,
  onRefresh,
  isRefetching,
  tradeCount,
  marketOpen,
}: {
  symbol: string;
  brokerStats: { id: string; name: string; buy: number; sell: number; buyQty: number; sellQty: number }[];
  isLoading: boolean;
  updatedAt?: number;
  onRefresh: () => void;
  isRefetching?: boolean;
  tradeCount: number;
  marketOpen?: boolean;
}) => {
  const { setSelectedBrokerId } = useUIStore();
  const [search, setSearch] = useState('');

  const filteredStats = useMemo(() => {
    const s = search.toLowerCase();
    return brokerStats.filter((b) => b.id.toString().includes(s) || b.name.toLowerCase().includes(s));
  }, [brokerStats, search]);

  if (isLoading && brokerStats.length === 0) {
    return <div className="p-8 text-center text-text-muted italic">Processing real-time broker activity...</div>;
  }
  if (tradeCount === 0 && brokerStats.length === 0) {
    return (
      <div className="p-8 text-center text-text-muted italic space-y-2">
        <p>No broker activity for {symbol} today.</p>
        <p className="text-xs">
          {marketOpen
            ? 'Broker IDs appear in the floorsheet as trades execute. Data auto-refreshes every 45 seconds.'
            : 'Floorsheet broker breakdown is available after the trading session.'}
        </p>
        <button type="button" onClick={onRefresh} className="btn-secondary py-1.5 px-3 text-xs mt-2">
          Retry
        </button>
      </div>
    );
  }

  const totalBuy = filteredStats.reduce((acc, b) => acc + b.buy, 0);
  const totalSell = filteredStats.reduce((acc, b) => acc + b.sell, 0);

  return (
    <div className="space-y-6">
      <TabRefreshBar label="Broker aggregation" updatedAt={updatedAt} onRefresh={onRefresh} isRefetching={isRefetching} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-syne font-bold">Broker Trade Analysis — {symbol}</h4>
          <span className="text-[10px] text-text-muted uppercase font-bold">
            Session breakdown · {tradeCount} trades
          </span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" placeholder="Search broker or name..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-8 py-1.5 text-xs w-full md:w-64" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 bg-bull-green/5 border-bull-green/20">
          <div className="text-[10px] uppercase text-text-muted mb-1">Cumulative Buy</div>
          <div className="text-lg font-jetbrains font-bold text-bull-green">{formatNPR(totalBuy, true)}</div>
        </div>
        <div className="card p-4 bg-bear-red/5 border-bear-red/20">
          <div className="text-[10px] uppercase text-text-muted mb-1">Cumulative Sell</div>
          <div className="text-lg font-jetbrains font-bold text-bear-red">{formatNPR(totalSell, true)}</div>
        </div>
        <div className="card p-4 bg-brand-cyan/5 border-brand-cyan/20">
          <div className="text-[10px] uppercase text-text-muted mb-1">Session Net Flow</div>
          <div className={`text-lg font-jetbrains font-bold ${totalBuy - totalSell >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
            {totalBuy - totalSell >= 0 ? '+' : ''}{formatNPR(totalBuy - totalSell, true)}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-base/30">
                <th className="table-header">Broker</th>
                <th className="table-header text-right">Buy Qty</th>
                <th className="table-header text-right">Buy Amount</th>
                <th className="table-header text-right">Sell Qty</th>
                <th className="table-header text-right">Sell Amount</th>
                <th className="table-header text-right">Net Flow</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map(b => {
                const net = b.buy - b.sell;
                return (
                  <tr key={b.id} className="border-b border-bg-border/20 hover:bg-bg-elevated/40 transition-colors">
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="text-text-primary font-bold text-xs">{b.name}</span>
                        <button 
                          onClick={() => setSelectedBrokerId(b.id)}
                          className="w-max mt-1 px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted font-bold text-[9px] hover:text-brand-cyan transition-colors"
                        >
                          ID #{b.id}
                        </button>
                      </div>
                    </td>
                    <td className="table-cell text-right font-jetbrains">{b.buyQty.toLocaleString()}</td>
                    <td className="table-cell text-right font-jetbrains text-bull-green">{formatNPR(b.buy, true)}</td>
                    <td className="table-cell text-right font-jetbrains">{b.sellQty.toLocaleString()}</td>
                    <td className="table-cell text-right font-jetbrains text-bear-red">{formatNPR(b.sell, true)}</td>
                    <td className={`table-cell text-right font-jetbrains font-bold ${net >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                      {net >= 0 ? '+' : ''}{formatNPR(net, true)}
                    </td>
                  </tr>
                );
              })}
              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted italic">No activity matching your search criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const TechnicalsTab = ({
  symbol,
  chartData,
  ltp,
  week52High,
  week52Low,
}: {
  symbol: string;
  chartData: any[];
  ltp: number;
  week52High: number;
  week52Low: number;
}) => {
  if (!chartData || chartData.length < 14) {
    return (
      <div className="p-12 text-center text-text-muted italic">
        Loading historical prices for {symbol}… Technicals need at least 14 trading days of data.
      </div>
    );
  }

  const closes = chartData.map((d) => d.close);
  const len = closes.length;
  const smaPeriod = Math.min(20, len);
  const sma50Period = Math.min(50, len);
  const rsiPeriod = Math.min(14, len - 1);

  const sma20Array = calcSMA(closes, smaPeriod);
  const sma50Array = calcSMA(closes, sma50Period);
  const ema9Array = calcEMA(closes, Math.min(9, len));
  const rsiArray = calcRSI(closes, rsiPeriod);

  const sma20 = sma20Array[sma20Array.length - 1];
  const sma50 = sma50Array[sma50Array.length - 1];
  const ema9 = ema9Array[ema9Array.length - 1];
  const rsi14 = rsiArray[rsiArray.length - 1];

  const getSignal = (value: number | null, isRSI = false) => {
    if (value === null) return { text: 'NEUTRAL', color: 'text-text-muted' };
    if (isRSI) {
      return value > 70
        ? { text: 'OVERBOUGHT', color: 'text-bear-red' }
        : value < 30
          ? { text: 'OVERSOLD', color: 'text-bull-green' }
          : { text: 'NEUTRAL', color: 'text-text-muted' };
    }
    return ltp > value ? { text: 'BULLISH', color: 'text-bull-green' } : { text: 'BEARISH', color: 'text-bear-red' };
  };

  const rangePosition =
    week52High > week52Low && week52High > 0
      ? (((ltp - week52Low) / (week52High - week52Low)) * 100).toFixed(0)
      : null;

  const bullishCount = [sma20, sma50, ema9].filter((v) => v !== null && ltp > v!).length;
  const overall =
    bullishCount >= 2 && (rsi14 === null || rsi14 < 70)
      ? 'Bullish'
      : bullishCount <= 1 && (rsi14 === null || rsi14 > 30)
        ? 'Bearish'
        : 'Neutral';

  const technicals = [
    { name: `RSI (${rsiPeriod})`, value: rsi14?.toFixed(2) || '—', signal: getSignal(rsi14, true) },
    { name: `SMA (${smaPeriod})`, value: sma20?.toFixed(2) || '—', signal: getSignal(sma20) },
    { name: `SMA (${sma50Period})`, value: sma50?.toFixed(2) || '—', signal: getSignal(sma50) },
    { name: 'EMA (9)', value: ema9?.toFixed(2) || '—', signal: getSignal(ema9) },
    {
      name: '52W Range Position',
      value: rangePosition !== null ? `${rangePosition}%` : '—',
      signal: {
        text:
          rangePosition !== null && Number(rangePosition) > 75
            ? 'NEAR HIGH'
            : rangePosition !== null && Number(rangePosition) < 25
              ? 'NEAR LOW'
              : 'MID-RANGE',
        color: 'text-text-muted',
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h4 className="font-syne font-bold">Technical Indicators — {symbol}</h4>
      <p className="text-[10px] text-text-muted">Computed from {len} daily candles · refreshes with chart data</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {technicals.map((tech) => (
          <div key={tech.name} className="card p-5 border-bg-border/30">
            <div className="text-[10px] uppercase text-text-muted mb-1">{tech.name}</div>
            <div className="text-xl font-jetbrains font-bold text-text-primary mb-2">{tech.value}</div>
            <div className={`text-xs font-bold ${tech.signal.color}`}>{tech.signal.text}</div>
          </div>
        ))}
      </div>
      <div className="card p-6 border-bg-border/30">
        <h5 className="text-sm font-bold mb-3">Overall Technical Sentiment — {overall}</h5>
        <div className="text-sm text-text-secondary space-y-2">
          <p>
            {symbol} is trading {sma20 && ltp > sma20 ? 'above' : 'below'} its {smaPeriod}-day SMA (
            {sma20 ? formatNepaliNumber(sma20) : 'n/a'}).
          </p>
          {rsi14 !== null && (
            <p>
              RSI is {rsi14.toFixed(1)} ({getSignal(rsi14, true).text.toLowerCase()}).
            </p>
          )}
          {rangePosition !== null && (
            <p>
              Price sits at {rangePosition}% of its 52-week range ({formatNepaliNumber(week52Low)} –{' '}
              {formatNepaliNumber(week52High)}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const NewsTab = ({
  symbol,
  companyName,
  sector,
  newsItems,
  isLoading,
  updatedAt,
  onRefresh,
  isRefetching,
}: {
  symbol: string;
  companyName: string;
  sector: string;
  newsItems: any[];
  isLoading: boolean;
  updatedAt?: number;
  onRefresh: () => void;
  isRefetching?: boolean;
}) => {
  if (isLoading && !newsItems.length) {
    return <div className="p-8 text-center text-text-muted">Loading latest news from ShareSansar…</div>;
  }

  const relevantNews = filterNewsForStock(newsItems, symbol, companyName, sector);
  const isDirect = relevantNews.some((n: any) => (n._score ?? 0) >= 3);

  return (
    <div className="space-y-4">
      <TabRefreshBar label="ShareSansar feed" updatedAt={updatedAt} onRefresh={onRefresh} isRefetching={isRefetching} />
      <h4 className="font-syne font-bold">Latest News — {symbol}</h4>
      {!isDirect && relevantNews.length > 0 && (
        <p className="text-xs text-text-muted">
          No headlines mentioning {symbol} directly. Showing related sector and market news.
        </p>
      )}
      <div className="space-y-3">
        {relevantNews.map((n: any) => {
          const href = newsItemLink(n);
          const Wrapper = href ? 'a' : 'div';
          return (
            <Wrapper
              key={n.id ?? newsItemTitle(n)}
              {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="block card p-4 hover:border-brand-cyan/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    n.sentiment === 'positive'
                      ? 'bg-bull-green/10 text-bull-green'
                      : n.sentiment === 'negative'
                        ? 'bg-bear-red/10 text-bear-red'
                        : 'bg-bg-elevated text-text-muted'
                  }`}
                >
                  {n.category || 'Market'}
                </span>
                <span className="text-xs text-brand-cyan">
                  {n.source || 'ShareSansar'} · {newsItemDate(n)}
                </span>
              </div>
              <div className="font-bold text-sm text-text-primary mb-1">{newsItemTitle(n)}</div>
            </Wrapper>
          );
        })}
        {relevantNews.length === 0 && (
          <div className="p-12 text-center text-text-muted italic border border-bg-border/30 rounded-xl">
            News feed is temporarily unavailable. Try refreshing in a moment.
          </div>
        )}
      </div>
    </div>
  );
};

const PeersTab = ({
  symbol,
  sector,
  peers,
  currentLtp,
  navigate,
}: {
  symbol: string;
  sector: string;
  peers: {
    symbol: string;
    ltp: number;
    changePercent: number;
    peRatio: number;
    eps: number;
    marketCap: number;
    volume: number;
  }[];
  currentLtp: number;
  navigate: (path: string) => void;
}) => {
  const avgPe =
    peers.filter((p) => p.peRatio > 0).length > 0
      ? peers.filter((p) => p.peRatio > 0).reduce((a, p) => a + p.peRatio, 0) /
        peers.filter((p) => p.peRatio > 0).length
      : 0;

  return (
    <div className="space-y-4">
      <h4 className="font-syne font-bold">Peer Comparison — {sector}</h4>
      <p className="text-[10px] text-text-muted">
        Live sector peers · avg P/E {avgPe > 0 ? avgPe.toFixed(1) : '—'} · updates with market data
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-base/30">
            <tr>
              <th className="table-header">Symbol</th>
              <th className="table-header text-right">LTP</th>
              <th className="table-header text-right">Change %</th>
              <th className="table-header text-right">P/E</th>
              <th className="table-header text-right">EPS</th>
              <th className="table-header text-right">Volume</th>
              <th className="table-header text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((p) => (
              <tr
                key={p.symbol}
                onClick={() => navigate(`/stock/${p.symbol}`)}
                className="border-b border-bg-border/20 hover:bg-bg-elevated/40 transition-colors cursor-pointer"
              >
                <td className="table-cell font-bold">{p.symbol}</td>
                <td className="table-cell text-right font-jetbrains">{formatNepaliNumber(p.ltp)}</td>
                <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(p.changePercent)}`}>
                  {formatPercent(p.changePercent)}
                </td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">
                  {p.peRatio ? p.peRatio.toFixed(1) : '—'}
                </td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{p.eps || '—'}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{formatVolume(p.volume)}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">
                  {formatNPR(p.marketCap || 0, true)}
                </td>
              </tr>
            ))}
            {peers.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-muted">
                  No other listed stocks matched sector &quot;{sector}&quot;. Peer list uses live NEPSE sector mapping.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AIInsightTab = ({
  symbol,
  insight,
}: {
  symbol: string;
  insight: {
    signal: string;
    score: number;
    sentiment: string;
    risk: string;
    bullets: string[];
  };
}) => {
  const signalColor =
    insight.signal === 'BUY'
      ? 'text-bull-green'
      : insight.signal === 'SELL'
        ? 'text-bear-red'
        : 'text-brand-gold';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20">
        <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold text-lg">
          AI
        </div>
        <div>
          <div className="font-syne font-bold text-text-primary">Multi-Factor Insight Engine</div>
          <div className="text-xs text-text-muted">
            Combines price, technicals, order book, broker flow & fundamentals
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 text-center border-brand-cyan/20">
          <div className="text-[10px] uppercase text-text-muted tracking-widest mb-2">Overall Signal</div>
          <div className={`text-2xl font-syne font-black ${signalColor}`}>{insight.signal}</div>
          <div className="text-xs text-text-muted mt-1">Score: {insight.score}/100</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[10px] uppercase text-text-muted tracking-widest mb-2">Session Momentum</div>
          <div
            className={`text-2xl font-syne font-black ${insight.sentiment === 'Bullish' ? 'text-bull-green' : insight.sentiment === 'Bearish' ? 'text-bear-red' : 'text-brand-gold'}`}
          >
            {insight.sentiment}
          </div>
          <div className="text-xs text-text-muted mt-1">Price + technical blend</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[10px] uppercase text-text-muted tracking-widest mb-2">Risk Level</div>
          <div className="text-2xl font-syne font-black text-brand-gold">{insight.risk}</div>
          <div className="text-xs text-text-muted mt-1">Volatility & range based</div>
        </div>
      </div>
      <div className="card p-5">
        <h4 className="font-syne font-bold mb-4 text-sm">Analysis Summary — {symbol}</h4>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          {insight.bullets.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
          <p className="text-brand-gold text-xs pt-2 border-t border-bg-border/30">
            Disclaimer: Algorithmic insight for education only. Not financial advice. Verify with your own research.
          </p>
        </div>
      </div>
    </div>
  );
};

const MarketDepthTab = ({
  symbol,
  depth,
  isLoading,
  updatedAt,
  onRefresh,
  isRefetching,
  marketOpen,
}: {
  symbol: string;
  depth: ReturnType<typeof normalizeMarketDepth>;
  isLoading: boolean;
  updatedAt?: number;
  onRefresh: () => void;
  isRefetching?: boolean;
  marketOpen?: boolean;
}) => {
  if (isLoading && !depth.hasData) {
    return <div className="p-8 text-center text-text-muted">Loading market depth...</div>;
  }

  const { buyDepth, sellDepth, totalBuyQty, totalSellQty, hasData } = depth;
  const buyPct = totalBuyQty + totalSellQty > 0 ? (totalBuyQty / (totalBuyQty + totalSellQty)) * 100 : 50;

  return (
    <div className="space-y-4">
      <TabRefreshBar label="NEPSE order book" updatedAt={updatedAt} onRefresh={onRefresh} isRefetching={isRefetching} />
      <h4 className="font-syne font-bold">Market Depth — {symbol}</h4>
      {hasData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Buy / Sell Ratio</div>
            <div className="font-jetbrains font-bold text-bull-green">{buyPct.toFixed(0)}% buy</div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Total Buy Qty</div>
            <div className="font-jetbrains font-bold">{totalBuyQty.toLocaleString()}</div>
          </div>
          <div className="card p-3">
            <div className="text-[10px] text-text-muted uppercase mb-1">Total Sell Qty</div>
            <div className="font-jetbrains font-bold">{totalSellQty.toLocaleString()}</div>
          </div>
        </div>
      )}
      {!hasData ? (
        <div className="p-12 text-center text-text-muted italic border border-bg-border/30 rounded-xl space-y-2">
          <p>No limit orders in the book right now.</p>
          <p className="text-xs">
            {marketOpen
              ? 'Depth refreshes every 15 seconds during market hours.'
              : 'Market depth is published when the exchange is open for trading.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-bull-green font-bold uppercase text-xs">Buy Orders</span>
              <span className="text-xs text-text-muted">
                Total: <span className="font-jetbrains font-bold text-text-primary">{totalBuyQty.toLocaleString()}</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bull-green/10">
                  <tr>
                    <th className="table-header text-left text-bull-green">Orders</th>
                    <th className="table-header text-right text-bull-green">Qty</th>
                    <th className="table-header text-right text-bull-green">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {buyDepth.map((d, i) => (
                    <tr key={i} className="border-b border-bg-border/20 hover:bg-bg-elevated/40">
                      <td className="table-cell">{d.orderCount}</td>
                      <td className="table-cell text-right font-jetbrains">{d.quantity.toLocaleString()}</td>
                      <td className="table-cell text-right font-jetbrains text-bull-green">
                        {formatNepaliNumber(d.orderPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-bear-red font-bold uppercase text-xs">Sell Orders</span>
              <span className="text-xs text-text-muted">
                Total: <span className="font-jetbrains font-bold text-text-primary">{totalSellQty.toLocaleString()}</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bear-red/10">
                  <tr>
                    <th className="table-header text-left text-bear-red">Price</th>
                    <th className="table-header text-right text-bear-red">Qty</th>
                    <th className="table-header text-right text-bear-red">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {sellDepth.map((d, i) => (
                    <tr key={i} className="border-b border-bg-border/20 hover:bg-bg-elevated/40">
                      <td className="table-cell font-jetbrains text-bear-red">{formatNepaliNumber(d.orderPrice)}</td>
                      <td className="table-cell text-right font-jetbrains">{d.quantity.toLocaleString()}</td>
                      <td className="table-cell text-right">{d.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const tabs = [
  { id: 'chart', label: 'Chart', icon: BarChart2 },
  { id: 'depth', label: 'Market Depth', icon: Layers },
  { id: 'fundamentals', label: 'Fundamentals', icon: FileText },
  { id: 'floorsheet', label: 'Floorsheet', icon: Activity },
  { id: 'broker', label: 'Broker Activity', icon: Users },
  { id: 'technicals', label: 'Technicals', icon: TrendingUp },
  { id: 'news', label: 'News', icon: Info },
  { id: 'peers', label: 'Peers', icon: Layers },
  { id: 'ai', label: 'AI Insight', icon: MessageSquare },
];



export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chart');

  const safeSymbol = symbol || '';
  const { data: priceData, isLoading: loadingPrice, dataUpdatedAt: priceUpdatedAt } = useStockPrice(safeSymbol);
  const { data: detailData, isLoading: loadingDetail } = useStockDetail(safeSymbol);
  const { data: graphData, isLoading: loadingChart } = useStockChart(safeSymbol);
  const { data: dailyGraphData } = useStockDailyChart(safeSymbol);
  const { data: liveTradingData } = useLiveTrading();
  const { data: companies } = useCompanyList();
  const {
    data: floorsheetRaw,
    isLoading: loadingFloorsheet,
    refetch: refetchFloorsheet,
    isRefetching: refetchingFloorsheet,
    dataUpdatedAt: floorsheetUpdatedAt,
  } = useCompanyFloorsheet(safeSymbol);
  const {
    data: depthRaw,
    isLoading: loadingDepth,
    refetch: refetchDepth,
    isRefetching: refetchingDepth,
    dataUpdatedAt: depthUpdatedAt,
  } = useStockDepth(safeSymbol);
  const {
    data: brokerRaw,
    isLoading: loadingBrokers,
    refetch: refetchBrokers,
    isRefetching: refetchingBrokers,
    dataUpdatedAt: brokersUpdatedAt,
  } = useStockBrokers(safeSymbol);
  const {
    data: newsData,
    isLoading: loadingNews,
    refetch: refetchNews,
    isRefetching: refetchingNews,
    dataUpdatedAt: newsUpdatedAt,
  } = useNews();
  const { data: marketStatus } = useMarketStatus();

  const { watchlists, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
  const watched = useMemo(
    () => watchlists.some((w) => w.items.some((i) => i.symbol === symbol)),
    [watchlists, symbol]
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [symbol]);

  useEffect(() => {
    if (activeTab === 'depth') refetchDepth();
    if (activeTab === 'floorsheet') refetchFloorsheet();
    if (activeTab === 'broker') {
      refetchFloorsheet();
      refetchBrokers();
    }
    if (activeTab === 'news') refetchNews();
  }, [activeTab, safeSymbol]);

  const marketOpen = useMemo(() => {
    if (!marketStatus) return false;
    if (typeof marketStatus === 'string') return marketStatus.toUpperCase() === 'OPEN';
    const open = marketStatus?.isOpen ?? marketStatus?.status;
    return String(open).toUpperCase() === 'OPEN' || open === true;
  }, [marketStatus]);

  const loading = loadingPrice || loadingDetail || loadingChart;

  const sdt = priceData?.securityDailyTradeDto || priceData || {};
  const sec = priceData?.security || detailData?.security || detailData || {};

  const stock = {
    symbol: safeSymbol,
    companyName: detailData?.securityName || sec.securityName || safeSymbol,
    companyNameNepali: detailData?.companyNameNepali || '',
    sector: detailData?.sectorName || sec.companyId?.sectorMaster?.sectorDescription || 'N/A',
    ltp: sdt.lastTradedPrice || 0,
    previousClose: sdt.previousClose || 0,
    change: (sdt.lastTradedPrice || 0) - (sdt.previousClose || 0),
    changePercent: (((sdt.lastTradedPrice || 0) - (sdt.previousClose || 1)) / (sdt.previousClose || 1)) * 100,
    open: sdt.openPrice || sdt.open || 0,
    high: sdt.highPrice || sdt.high || 0,
    low: sdt.lowPrice || sdt.low || 0,
    volume: sdt.totalTradeQuantity || sdt.volume || 0,
    turnover: sdt.totalTradeValue || sdt.turnover || priceData?.totalTurnover || 0,
    marketCap: priceData?.marketCapitalization || detailData?.marketCap || sec.marketCap || sdt.marketCap || 0,
    week52High: sdt.fiftyTwoWeekHigh || detailData?.fiftyTwoWeekHigh || sec.fiftyTwoWeekHigh || 0,
    week52Low: sdt.fiftyTwoWeekLow || detailData?.fiftyTwoWeekLow || sec.fiftyTwoWeekLow || 0,
    eps: detailData?.eps || sec.eps || 0,
    peRatio: detailData?.peRatio || sec.peRatio || 0,
    bookValue: detailData?.bookValue || sec.bookValue || 0,
    pbRatio: detailData?.pbRatio || sec.pbRatio || 0,
    dividendYield: detailData?.dividendYield || sec.dividendYield || 0,
    roe: detailData?.roe || sec.roe || 0,
    roa: detailData?.roa || sec.roa || 0,
    nim: detailData?.nim || sec.nim || 0,
  };

  const rawGraphData = graphData?.content || (Array.isArray(graphData) ? graphData : []);
  const rawDailyData = dailyGraphData || [];

  const chartData = useMemo(() => {
    if (rawGraphData.length === 0) return [];
    const sortedData = [...rawGraphData].sort((a: any, b: any) => {
      const timeA = new Date((a.businessDate || a.date || '').split('T')[0]).getTime();
      const timeB = new Date((b.businessDate || b.date || '').split('T')[0]).getTime();
      return timeA - timeB;
    });

    return sortedData.map((d: any, index: number) => {
      const dateStr = (d.businessDate || d.date || '').split('T')[0];
      const close = d.closePrice ?? d.close ?? d.value ?? 0;
      let open = d.openPrice ?? d.open;
      const prevClose =
        index > 0
          ? (sortedData[index - 1].closePrice ?? sortedData[index - 1].close ?? sortedData[index - 1].value ?? close)
          : undefined;

      if (open === undefined) {
        if (prevClose !== undefined) open = prevClose;
        else {
          const h = d.highPrice ?? d.high ?? close;
          const l = d.lowPrice ?? d.low ?? close;
          open = (h + l) / 2;
        }
      }

      return {
        time: new Date(dateStr).getTime() / 1000,
        open,
        high: d.highPrice ?? d.high ?? close,
        low: d.lowPrice ?? d.low ?? close,
        close,
        volume: d.totalTradedQuantity ?? d.volume ?? 0,
      };
    });
  }, [rawGraphData]);

  const fundamentals = useMemo(
    () =>
      enrichFundamentals(safeSymbol, stock.sector, {
        ltp: stock.ltp,
        eps: stock.eps,
        peRatio: stock.peRatio,
        bookValue: stock.bookValue,
        pbRatio: stock.pbRatio,
        dividendYield: stock.dividendYield,
        roe: stock.roe,
        roa: stock.roa,
        nim: stock.nim,
        marketCap: stock.marketCap,
        week52High: stock.week52High,
        week52Low: stock.week52Low,
      }),
    [safeSymbol, stock]
  );

  const floorsheetTrades = useMemo(
    () => normalizeFloorsheetTrades(floorsheetRaw, safeSymbol),
    [floorsheetRaw, safeSymbol]
  );

  const brokerStats = useMemo(() => {
    if (brokerRaw?.length) return brokerRaw;
    const stats: Record<string, { id: string; name: string; buy: number; sell: number; buyQty: number; sellQty: number }> = {};
    floorsheetTrades.forEach((t) => {
      const amount = t.contractQuantity * t.contractRate;
      const qty = t.contractQuantity;
      [t.buyerMemberId, t.sellerMemberId].forEach((id, idx) => {
        if (!id) return;
        if (!stats[id]) stats[id] = { id, name: `Broker #${id}`, buy: 0, sell: 0, buyQty: 0, sellQty: 0 };
        if (idx === 0) {
          stats[id].buy += amount;
          stats[id].buyQty += qty;
        } else {
          stats[id].sell += amount;
          stats[id].sellQty += qty;
        }
      });
    });
    return Object.values(stats).sort((a, b) => b.buy + b.sell - (a.buy + a.sell));
  }, [brokerRaw, floorsheetTrades]);

  const marketDepth = useMemo(() => normalizeMarketDepth(depthRaw), [depthRaw]);

  const sectorMap = useMemo(() => {
    const map = new Map<string, string>();
    (companies || []).forEach((c: any) => map.set(c.symbol, c.sectorName));
    return map;
  }, [companies]);

  const peers = useMemo(() => {
    return (liveTradingData || [])
      .map((s: any) => {
        const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector || '';
        const ltp = s.lastTradedPrice || s.ltp || 0;
        const f = enrichFundamentals(s.symbol, scripSector, {
          ltp,
          eps: s.eps,
          peRatio: s.peRatio,
          marketCap: s.marketCap,
        });
        return {
          symbol: s.symbol,
          sector: scripSector,
          ltp,
          changePercent: s.percentageChange || s.changePercent || 0,
          marketCap: s.marketCap || 0,
          peRatio: f.peRatio,
          eps: f.eps,
          volume: s.totalTradeQuantity || s.volume || 0,
        };
      })
      .filter((s) => sectorsMatch(s.sector, stock.sector) && s.symbol !== safeSymbol)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 12);
  }, [liveTradingData, sectorMap, stock.sector, safeSymbol]);

  const aiInsight = useMemo(() => {
    const closes = chartData.map((d) => d.close);
    const sma20 =
      closes.length >= 20 ? calcSMA(closes, Math.min(20, closes.length))[closes.length - 1] : null;
    const rsi =
      closes.length >= 15 ? calcRSI(closes, 14)[closes.length - 1] : null;
    const brokerNet = brokerStats.reduce((acc, b) => acc + b.buy - b.sell, 0);

    return computeStockInsight({
      symbol: safeSymbol,
      changePercent: stock.changePercent,
      peRatio: fundamentals.peRatio,
      week52High: stock.week52High,
      week52Low: stock.week52Low,
      ltp: stock.ltp,
      depthBuyQty: marketDepth.totalBuyQty,
      depthSellQty: marketDepth.totalSellQty,
      brokerNetFlow: brokerNet,
      rsi,
      aboveSma20: sma20 !== null ? stock.ltp > sma20 : undefined,
    });
  }, [chartData, brokerStats, marketDepth, stock, fundamentals, safeSymbol]);

  if (loading) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4" />
        Loading security data...
      </div>
    );
  }

  if (!stock.ltp && !loadingPrice) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Stock {symbol} not found or no data available.
      </div>
    );
  }

  const colorClass = getPriceColorClass(stock.changePercent);

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-syne text-3xl font-bold text-text-primary">{stock.symbol}</h1>
              <span className="badge-cyan text-xs">{stock.sector}</span>
              <button 
                onClick={() => watched ? removeFromWatchlist('default', stock.symbol) : addToWatchlist('default', stock.symbol, stock.ltp)}
                className="p-2 hover:bg-bg-elevated rounded-full transition-colors"
              >
                <Star size={20} className={watched ? 'text-brand-gold fill-brand-gold' : 'text-text-muted'} />
              </button>
            </div>
            <div className="flex flex-col">
              <span className="text-text-secondary font-medium">{stock.companyName}</span>
              <span className="text-text-muted font-noto-devanagari text-sm">{stock.companyNameNepali}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-6">
            <div className="text-right">
              <div className={`font-jetbrains text-4xl font-bold ${colorClass}`}>
                {formatNepaliNumber(stock.ltp)}
              </div>
              <div className={`font-jetbrains font-semibold text-lg flex items-center justify-end gap-2 ${colorClass}`}>
                {stock.change > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {formatNepaliNumber(stock.change)} ({formatPercent(stock.changePercent)})
              </div>
            </div>
            
            <div className="hidden sm:flex flex-col items-end gap-2">
              <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
                <Bell size={14} /> Set Alert
              </button>
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                <Clock size={12} />
                <span>
                  Last Updated:{' '}
                  {priceUpdatedAt ? new Date(priceUpdatedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mt-8 pt-8 border-t border-bg-border/50">
          {[
            { label: 'Open', value: formatNepaliNumber(stock.open) },
            { label: 'High', value: formatNepaliNumber(stock.high) },
            { label: 'Low', value: formatNepaliNumber(stock.low) },
            { label: 'Volume', value: formatVolume(stock.volume) },
            { label: 'Turnover', value: formatNPR(stock.turnover, true) },
            { label: 'Market Cap', value: formatNPR(stock.marketCap || 0, true) },
            { label: '52W High/Low', value: `${formatNepaliNumber(stock.week52Low)} - ${formatNepaliNumber(stock.week52High)}` },
          ].map((stat, i) => (
            <div key={i}>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{stat.label}</div>
              <div className="font-jetbrains text-sm font-semibold text-text-primary">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Fundamental Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-6">
          {[
            { label: 'EPS', value: fundamentals.eps || '—' },
            { label: 'P/E Ratio', value: fundamentals.peRatio || '—' },
            { label: 'Book Value', value: fundamentals.bookValue || '—' },
            { label: 'P/B Ratio', value: fundamentals.pbRatio || '—' },
            { label: 'Div Yield', value: fundamentals.dividendYield ? `${fundamentals.dividendYield}%` : '—' },
            { label: 'ROE', value: fundamentals.roe ? `${fundamentals.roe}%` : '—' },
          ].map((stat, i) => (
            <div key={i} className="bg-bg-base/50 rounded-lg p-3 border border-bg-border/30">
              <div className="text-[10px] text-text-muted uppercase mb-1">{stat.label}</div>
              <div className="font-jetbrains text-sm font-bold text-text-primary">{stat.value || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-bg-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative shrink-0
                ${activeTab === tab.id ? 'text-brand-cyan' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan shadow-glow-cyan" />
              )}
            </button>
          ))}
        </div>

        <div className="card p-6 min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'chart' && (
                <ChartTab
                  symbol={stock.symbol}
                  data={chartData}
                  dailyData={rawDailyData}
                  liveStock={liveTradingData?.find((s: any) => s.symbol === symbol)}
                />
              )}
              {activeTab === 'depth' && (
                <MarketDepthTab
                  symbol={stock.symbol}
                  depth={marketDepth}
                  isLoading={loadingDepth}
                  updatedAt={depthUpdatedAt}
                  onRefresh={() => refetchDepth()}
                  isRefetching={refetchingDepth}
                  marketOpen={marketOpen}
                />
              )}
              {activeTab === 'fundamentals' && (
                <FundamentalsTab
                  fundamentals={fundamentals}
                  ltp={stock.ltp}
                  volume={stock.volume}
                  turnover={stock.turnover}
                />
              )}
              {activeTab === 'floorsheet' && (
                <FloorsheetTab
                  symbol={stock.symbol}
                  trades={floorsheetTrades}
                  isLoading={loadingFloorsheet}
                  updatedAt={floorsheetUpdatedAt}
                  onRefresh={() => refetchFloorsheet()}
                  isRefetching={refetchingFloorsheet}
                  marketOpen={marketOpen}
                />
              )}
              {activeTab === 'broker' && (
                <BrokerActivityTab
                  symbol={stock.symbol}
                  brokerStats={brokerStats}
                  isLoading={loadingBrokers || loadingFloorsheet}
                  updatedAt={brokersUpdatedAt || floorsheetUpdatedAt}
                  onRefresh={() => {
                    refetchBrokers();
                    refetchFloorsheet();
                  }}
                  isRefetching={refetchingBrokers || refetchingFloorsheet}
                  tradeCount={floorsheetTrades.length}
                  marketOpen={marketOpen}
                />
              )}
              {activeTab === 'technicals' && (
                <TechnicalsTab
                  symbol={stock.symbol}
                  chartData={chartData}
                  ltp={stock.ltp}
                  week52High={stock.week52High}
                  week52Low={stock.week52Low}
                />
              )}
              {activeTab === 'news' && (
                <NewsTab
                  symbol={stock.symbol}
                  companyName={stock.companyName}
                  sector={stock.sector}
                  newsItems={newsData || []}
                  isLoading={loadingNews}
                  updatedAt={newsUpdatedAt}
                  onRefresh={() => refetchNews()}
                  isRefetching={refetchingNews}
                />
              )}
              {activeTab === 'peers' && (
                <PeersTab
                  symbol={stock.symbol}
                  sector={stock.sector}
                  peers={peers}
                  currentLtp={stock.ltp}
                  navigate={navigate}
                />
              )}
              {activeTab === 'ai' && <AIInsightTab symbol={stock.symbol} insight={aiInsight} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
