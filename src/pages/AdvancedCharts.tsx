import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, Maximize2, Minimize2,
  TrendingUp, BarChart2, X, RotateCcw, Loader2,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import MainChart, { type ChartType, type Overlay } from '../components/charts/MainChart';
import {
  RSIPanel, MACDPanel, StochasticPanel, ATRPanel,
  OBVPanel, WilliamsRPanel, VolumePanel,
} from '../components/charts/IndicatorPanels';
import { generateOHLCV } from '../utils/indicators';
import { seedCompanies } from '../data/seed';
import { fetchTodayPrices, fetchGraphData, fetchCompanyPrice } from '../services/api';
import { formatNepaliNumber, formatVolume, formatNPR, formatPercent, getPriceColorClass } from '../utils';
type IndicatorId = 'volume' | 'rsi' | 'macd' | 'stochastic' | 'atr' | 'obv' | 'williams';
interface StockInfo {
  symbol: string; companyName: string; sector: string;
  ltp: number; previousClose: number; change: number; changePercent: number;
  open: number; high: number; low: number; volume: number; turnover: number;
  week52High?: number; week52Low?: number; eps?: number; peRatio?: number;
  bookValue?: number; marketCap?: number;
}

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'candlestick', label: 'Candlestick', icon: '🕯️' },
  { id: 'heikin-ashi', label: 'Heikin-Ashi', icon: '⬛' },
  { id: 'line', label: 'Line', icon: '📈' },
  { id: 'area', label: 'Area', icon: '🏔️' },
  { id: 'bar', label: 'OHLC Bar', icon: '▌' },
];
const ALL_OVERLAYS: Overlay[] = [
  { id: 'sma20', label: 'SMA 20', color: '#00D4FF', enabled: true },
  { id: 'sma50', label: 'SMA 50', color: '#8B5CF6', enabled: true },
  { id: 'sma200', label: 'SMA 200', color: '#F5A623', enabled: false },
  { id: 'ema9', label: 'EMA 9', color: '#FF69B4', enabled: false },
  { id: 'ema21', label: 'EMA 21', color: '#00FF7F', enabled: false },
  { id: 'vwap', label: 'VWAP', color: '#FF8C00', enabled: false },
  { id: 'bb', label: 'Bollinger Bands', color: '#8B22E6', enabled: false },
];
const ALL_INDICATORS: { id: IndicatorId; label: string; color: string; height: number }[] = [
  { id: 'volume', label: 'Volume', color: '#4A5880', height: 120 },
  { id: 'rsi', label: 'RSI (14)', color: '#00D4FF', height: 130 },
  { id: 'macd', label: 'MACD', color: '#00C48C', height: 140 },
  { id: 'stochastic', label: 'Stochastic', color: '#F5A623', height: 130 },
  { id: 'atr', label: 'ATR (14)', color: '#8B5CF6', height: 120 },
  { id: 'obv', label: 'OBV', color: '#00C48C', height: 120 },
  { id: 'williams', label: 'Williams %R', color: '#00D4FF', height: 130 },
];
const TFBARS: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730, '5Y': 1825 };

function IndicatorPanel({ id, data }: { id: IndicatorId; data: any[] }) {
  switch (id) {
    case 'rsi': return <RSIPanel data={data} />;
    case 'macd': return <MACDPanel data={data} />;
    case 'stochastic': return <StochasticPanel data={data} />;
    case 'atr': return <ATRPanel data={data} />;
    case 'obv': return <OBVPanel data={data} />;
    case 'williams': return <WilliamsRPanel data={data} />;
    case 'volume': return <VolumePanel data={data} />;
    default: return null;
  }
}

export default function AdvancedCharts() {
  const [symbol, setSymbol] = useState('NABIL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [timeframe, setTimeframe] = useState('3M');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [overlays, setOverlays] = useState<Overlay[]>(ALL_OVERLAYS);
  const [showOverlayMenu, setShowOverlayMenu] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<IndicatorId[]>(['volume', 'rsi']);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [allStocks, setAllStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [apiChartData, setApiChartData] = useState<any[] | null>(null);
  useEffect(() => {
    async function loadStocks() {
      try {
        const data = await fetchTodayPrices();
        if (data?.content) {
          const mapped = data.content.map((s: any) => ({
            symbol: s.symbol, companyName: s.securityName || '', sector: s.sectorName || '',
            ltp: s.lastTradedPrice, previousClose: s.previousClose,
            change: s.lastTradedPrice - s.previousClose,
            changePercent: s.previousClose > 0 ? ((s.lastTradedPrice - s.previousClose) / s.previousClose) * 100 : 0,
            open: s.openPrice, high: s.highPrice, low: s.lowPrice,
            volume: s.totalTradeQuantity, turnover: s.totalTurnover,
            week52High: s.fiftyTwoWeekHigh, week52Low: s.fiftyTwoWeekLow,
          }));
          setAllStocks(mapped);
        }
      } catch { /* fallback below */ }
      if (allStocks.length === 0) {
        setAllStocks(seedCompanies.map(s => ({ ...s, companyName: s.companyName })));
      }
      setLoading(false);
    }
    loadStocks();
  }, []);
  useEffect(() => {
    async function loadSymbol() {
      setChartLoading(true);
      // Stock info from API or seed
      const apiStock = allStocks.find(s => s.symbol === symbol);
      const seedStock = seedCompanies.find(s => s.symbol === symbol);
      if (apiStock) setStockInfo(apiStock);
      else if (seedStock) setStockInfo({ ...seedStock, companyName: seedStock.companyName } as StockInfo);

      // Try API chart data
      try {
        const graphData = await fetchGraphData(symbol);
        if (graphData && Array.isArray(graphData) && graphData.length > 5) {
          setApiChartData(graphData);
        } else {
          setApiChartData(null);
        }
      } catch { setApiChartData(null); }
      setChartLoading(false);
    }
    loadSymbol();
  }, [symbol, allStocks]);
  const chartData = useMemo(() => {
    if (apiChartData && apiChartData.length > 0) {
      // Transform API graph data to OHLCV format
      const bars = TFBARS[timeframe] ?? 90;
      const sorted = [...apiChartData].sort((a: any, b: any) =>
        new Date(a.businessDate || a.date).getTime() - new Date(b.businessDate || b.date).getTime()
      );
      return sorted.slice(-bars).map((d: any) => {
        const dateStr = (d.businessDate || d.date || '').split('T')[0];
        return {
          time: new Date(dateStr).getTime() / 1000,
          date: dateStr,
          open: d.openPrice ?? d.open ?? d.close ?? d.value ?? 0,
          high: d.highPrice ?? d.high ?? d.close ?? d.value ?? 0,
          low: d.lowPrice ?? d.low ?? d.close ?? d.value ?? 0,
          close: d.closePrice ?? d.close ?? d.value ?? 0,
          volume: d.totalTradedQuantity ?? d.volume ?? 0,
        };
      }).filter((d: any) => d.date && d.close > 0);
    }
    // Fallback: generate realistic mock data
    const bars = TFBARS[timeframe] ?? 90;
    return generateOHLCV(symbol, bars, stockInfo?.ltp ?? seedCompanies.find(s => s.symbol === symbol)?.ltp ?? 1000);
  }, [symbol, timeframe, apiChartData, stockInfo?.ltp]);

  const filteredSymbols = useMemo(() => {
    const list = allStocks.length > 0 ? allStocks : seedCompanies;
    return list.filter(s =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 25);
  }, [searchQuery, allStocks]);

  const toggleOverlay = useCallback((id: string) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, enabled: !o.enabled } : o));
  }, []);
  const toggleIndicator = useCallback((id: IndicatorId) => {
    setActiveIndicators(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const info = stockInfo || seedCompanies.find(s => s.symbol === symbol);
  const isUp = (info?.change ?? 0) >= 0;
  const mainHeight = isFullscreen ? window.innerHeight - 240 : 500;

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-bg-base p-4 overflow-auto' : ''} space-y-3`}>
      {/* ─── STOCK INFO HEADER ───────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Symbol Selector */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setShowSymbolSearch(v => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elevated hover:bg-bg-border/50 transition-colors border border-bg-border">
                <Search size={14} className="text-text-muted" />
                <span className="font-syne font-black text-lg text-text-primary">{symbol}</span>
                <ChevronDown size={13} className="text-text-muted" />
              </button>
              <AnimatePresence>
                {showSymbolSearch && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 mt-2 w-80 card border-bg-border shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 border-b border-bg-border">
                      <input autoFocus placeholder="Search symbol or company..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-bg-base px-3 py-2 rounded-lg text-sm text-text-primary border border-bg-border focus:border-brand-cyan outline-none" />
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {filteredSymbols.map(s => (
                        <button key={s.symbol}
                          onClick={() => { setSymbol(s.symbol); setShowSymbolSearch(false); setSearchQuery(''); }}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-elevated transition-colors">
                          <div className="text-left">
                            <div className="font-bold text-sm text-text-primary">{s.symbol}</div>
                            <div className="text-[10px] text-text-muted truncate max-w-[200px]">{s.companyName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-jetbrains text-xs text-text-secondary">{formatNepaliNumber(s.ltp)}</div>
                            <div className={`text-[10px] font-jetbrains font-bold ${getPriceColorClass(s.changePercent)}`}>
                              {formatPercent(s.changePercent)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Company Name */}
            <div className="hidden md:block">
              <div className="text-sm text-text-secondary font-medium">{info?.companyName}</div>
              <div className="text-[10px] text-text-muted">{info?.sector}</div>
            </div>
          </div>

          {/* Price Display */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className={`font-jetbrains text-2xl font-bold ${isUp ? 'text-bull-green' : 'text-bear-red'}`}>
                Rs. {formatNepaliNumber(info?.ltp ?? 0)}
              </div>
              <div className={`flex items-center justify-end gap-1 font-jetbrains text-sm font-bold ${isUp ? 'text-bull-green' : 'text-bear-red'}`}>
                {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {isUp ? '+' : ''}{formatNepaliNumber(info?.change ?? 0)} ({formatPercent(info?.changePercent ?? 0)})
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4 mt-4 pt-4 border-t border-bg-border/50">
          {[
            { label: 'Open', value: formatNepaliNumber(info?.open ?? 0) },
            { label: 'High', value: formatNepaliNumber(info?.high ?? 0) },
            { label: 'Low', value: formatNepaliNumber(info?.low ?? 0) },
            { label: 'Prev Close', value: formatNepaliNumber(info?.previousClose ?? 0) },
            { label: 'Volume', value: formatVolume(info?.volume ?? 0) },
            { label: 'Turnover', value: formatNPR(info?.turnover ?? 0, true) },
            { label: 'EPS', value: (info as any)?.eps?.toString() ?? '—' },
            { label: 'P/E', value: (info as any)?.peRatio?.toString() ?? '—' },
            { label: '52W Range', value: `${formatNepaliNumber((info as any)?.week52Low ?? 0)} - ${formatNepaliNumber((info as any)?.week52High ?? 0)}` },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">{s.label}</div>
              <div className="font-jetbrains text-xs font-bold text-text-primary">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── TOOLBAR ─────────────────────────── */}
      <div className="card p-2.5 flex flex-wrap items-center gap-2 bg-bg-surface/80">
        {/* Timeframe */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs rounded font-bold transition-all
                ${timeframe === tf ? 'bg-brand-cyan text-bg-base' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}>
              {tf}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-bg-border" />

        {/* Chart Type */}
        <div className="relative">
          <button onClick={() => setShowChartTypeMenu(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors">
            <span>{CHART_TYPES.find(c => c.id === chartType)?.icon}</span>
            {CHART_TYPES.find(c => c.id === chartType)?.label}
            <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showChartTypeMenu && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-1 w-40 card border-bg-border shadow-xl z-50">
                {CHART_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => { setChartType(ct.id); setShowChartTypeMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-bg-elevated transition-colors
                      ${chartType === ct.id ? 'text-brand-cyan' : 'text-text-secondary'}`}>
                    <span>{ct.icon}</span> {ct.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Overlays */}
        <div className="relative">
          <button onClick={() => setShowOverlayMenu(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors">
            <TrendingUp size={12} /> Overlays <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showOverlayMenu && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-1 w-48 card border-bg-border shadow-xl z-50 p-2 space-y-1">
                {overlays.map(ov => (
                  <button key={ov.id} onClick={() => toggleOverlay(ov.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors">
                    <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${ov.enabled ? 'bg-brand-cyan border-brand-cyan' : 'border-bg-border'}`}>
                      {ov.enabled && <span className="text-[8px] text-bg-base font-bold">✓</span>}
                    </div>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ov.color }} />
                    <span className="text-xs text-text-secondary">{ov.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="relative">
          <button onClick={() => setShowIndicatorMenu(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors">
            <BarChart2 size={12} /> Indicators <ChevronDown size={11} />
          </button>
          <AnimatePresence>
            {showIndicatorMenu && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-1 w-52 card border-bg-border shadow-xl z-50 p-2 space-y-1">
                {ALL_INDICATORS.map(ind => {
                  const active = activeIndicators.includes(ind.id);
                  return (
                    <button key={ind.id} onClick={() => toggleIndicator(ind.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors">
                      <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${active ? 'bg-brand-cyan border-brand-cyan' : 'border-bg-border'}`}>
                        {active && <span className="text-[8px] text-bg-base font-bold">✓</span>}
                      </div>
                      <span className="text-xs text-text-secondary">{ind.label}</span>
                      <span className="ml-auto text-[10px] px-1.5 rounded" style={{ color: ind.color, backgroundColor: `${ind.color}20` }}>
                        {active ? 'On' : 'Off'}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {(apiChartData && apiChartData.length > 0) && (
            <span className="text-[10px] text-bull-green font-bold px-2 py-0.5 rounded bg-bull-green/10 border border-bull-green/20">● LIVE DATA</span>
          )}
          {!(apiChartData && apiChartData.length > 0) && (
            <span className="text-[10px] text-neutral-yellow font-bold px-2 py-0.5 rounded bg-neutral-yellow/10 border border-neutral-yellow/20">● SIMULATED</span>
          )}
          <button onClick={() => setIsFullscreen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={() => { setActiveIndicators(['volume', 'rsi']); setOverlays(ALL_OVERLAYS); setChartType('candlestick'); setTimeframe('3M'); }}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors" title="Reset">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ─── MAIN CHART ──────────────────────── */}
      <div className="card overflow-hidden border-bg-border/40 relative" style={{ background: '#0A0F1E' }}>
        {chartLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-base/60 backdrop-blur-sm">
            <Loader2 size={32} className="text-brand-cyan animate-spin" />
          </div>
        )}
        <MainChart data={chartData} chartType={chartType} overlays={overlays} height={mainHeight} />
      </div>

      {/* ─── INDICATOR PANELS ────────────────── */}
      <AnimatePresence>
        {activeIndicators.map(id => {
          const config = ALL_INDICATORS.find(i => i.id === id)!;
          return (
            <motion.div key={id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: config.height }}
              exit={{ opacity: 0, height: 0 }} className="card overflow-hidden border-bg-border/40" style={{ background: '#0A0F1E' }}>
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 pt-1">
                  <div />
                  <button onClick={() => toggleIndicator(id)} className="text-text-muted hover:text-bear-red transition-colors p-1">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <IndicatorPanel id={id} data={chartData} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
