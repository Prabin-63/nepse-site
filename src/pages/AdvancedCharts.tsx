import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronDown, Maximize2, Minimize2,
  TrendingUp, BarChart2, X, RotateCcw, Loader2,
  ArrowUpRight, ArrowDownRight, Grid, Square, Columns
} from 'lucide-react';
import MainChart, { type ChartType, type Overlay, type DrawingRef } from '../components/charts/MainChart';
import {
  RSIPanel, MACDPanel, StochasticPanel, ATRPanel,
  OBVPanel, WilliamsRPanel, VolumePanel,
} from '../components/charts/IndicatorPanels';
import { formatNepaliNumber, formatVolume, formatNPR, formatPercent, getPriceColorClass } from '../utils';
import { useCompanyList, useStockChart, useStockPrice, useStockDailyChart } from '../hooks/useNepseData';
type IndicatorId = 'volume' | 'rsi' | 'macd' | 'stochastic' | 'atr' | 'obv' | 'williams';
interface StockInfo {
  symbol: string; companyName: string; sector: string;
  ltp: number; previousClose: number; change: number; changePercent: number;
  open: number; high: number; low: number; volume: number; turnover: number;
  week52High?: number; week52Low?: number; eps?: number; peRatio?: number;
  bookValue?: number; marketCap?: number;
}

const TIMEFRAMES = ['1D', '1W', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'candlestick', label: 'Candlestick', icon: '🕯️' },
  { id: 'heikin-ashi', label: 'Heikin-Ashi', icon: '⬛' },
  { id: 'line', label: 'Line', icon: '📈' },
  { id: 'area', label: 'Area', icon: '🏔️' },
  { id: 'bar', label: 'OHLC Bar', icon: '▌' },
  { id: 'baseline', label: 'Baseline', icon: '🌊' },
  { id: 'histogram', label: 'Histogram', icon: '📊' },
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

function ChartGridCell({ initialSymbol = 'NABIL', isFullscreenLayout = false }: { initialSymbol?: string, isFullscreenLayout?: boolean }) {
  const [symbol, setSymbol] = useState(initialSymbol);
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
  const [drawToolState, setDrawToolState] = useState('none');
  const [showDrawMenu, setShowDrawMenu] = useState(false);
  const chartRef = useRef<DrawingRef>(null);

  const setDrawTool = (tool: string) => {
    setDrawToolState(tool);
    chartRef.current?.setDrawMode(tool);
  };

  const clearDrawings = () => {
    chartRef.current?.clearDrawings();
  };
  const DRAW_TOOLS_AC = [
    { id: 'none', label: 'Pointer', icon: '🖱️' },
    { id: 'trendline', label: 'Trendline', icon: '📐' },
    { id: 'hline', label: 'Horiz. Line', icon: '➖' },
    { id: 'fib', label: 'Fibonacci', icon: '🌀' },
    { id: 'rect', label: 'Rectangle', icon: '⬜' },
  ];
  const { data: companyList, isLoading: loadingCompanies } = useCompanyList();
  const { data: chartGraphData, isLoading: loadingChart } = useStockChart(symbol);
  const { data: dailyGraphData, isLoading: loadingDailyChart } = useStockDailyChart(symbol);
  const { data: livePriceData } = useStockPrice(symbol);
  
  const allStocks = companyList || [];
  const filteredSymbols = useMemo(() => {
    return allStocks.filter((s: any) =>
      s.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.securityName?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 25).map((s: any) => ({
      symbol: s.symbol,
      companyName: s.securityName || s.companyName || '',
      ltp: s.ltp || 0,
      changePercent: s.changePercent || 0,
    }));
  }, [searchQuery, allStocks]);

  const apiChartData = chartGraphData;
  const chartLoading = loadingChart || loadingDailyChart;
  const chartData = useMemo(() => {
    if (timeframe === '1D') {
      const dailyData = dailyGraphData || [];
      if (!dailyData || dailyData.length === 0) return [];
      
      const candles: any[] = [];
      const msInterval = 5 * 60 * 1000;
      
      [...dailyData]
        .sort((a, b) => (a.time || 0) - (b.time || 0))
        .forEach(tick => {
          const tickTimeMs = (tick.time || 0) * ((tick.time || 0) > 10000000000 ? 1 : 1000);
          if (tickTimeMs === 0) return;
          const candleTimeMs = Math.floor(tickTimeMs / msInterval) * msInterval;
          const price = tick.contractRate || 0;
          const qty = tick.contractQuantity || 0;
      
          let currentCandle = candles[candles.length - 1];
          const d = new Date(candleTimeMs);
          const dateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          
          if (!currentCandle || currentCandle.timeMs !== candleTimeMs) {
            candles.push({
              timeMs: candleTimeMs,
              time: candleTimeMs / 1000,
              date: dateStr,
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

    const rawData = apiChartData?.content || (Array.isArray(apiChartData) ? apiChartData : []);
    if (rawData && rawData.length > 0) {
      let sourceData = [...rawData];
      
      const sorted = sourceData.sort((a: any, b: any) =>
        new Date(a.businessDate || a.date).getTime() - new Date(b.businessDate || b.date).getTime()
      );
      
      const mapped = sorted.map((d: any, index: number) => {
        const dateStr = (d.businessDate || d.date || '').split('T')[0];
        const close = d.closePrice ?? d.close ?? d.value ?? 0;
        
        let open = d.openPrice ?? d.open;
        const prevClose = index > 0 
          ? (sorted[index - 1].closePrice ?? sorted[index - 1].close ?? sorted[index - 1].value ?? close) 
          : undefined;

        if (open === undefined) {
          if (prevClose !== undefined) {
            open = prevClose;
          } else {
            const h = d.highPrice ?? d.high ?? close;
            const l = d.lowPrice ?? d.low ?? close;
            open = (h + l) / 2;
          }
        }
        
        return {
          time: new Date(dateStr).getTime() / 1000,
          date: dateStr,
          open,
          high: d.highPrice ?? d.high ?? close,
          low: d.lowPrice ?? d.low ?? close,
          close,
          volume: d.totalTradedQuantity ?? d.volume ?? 0,
        };
      });

        const lastDataDate = new Date(mapped[mapped.length - 1].time * 1000);
        const today = new Date();
        if (lastDataDate.toDateString() !== today.toDateString()) {
          const sdt = livePriceData?.securityDailyTradeDto || livePriceData;
          const ltp = sdt?.lastTradedPrice || sdt?.ltp || 0;
          if (ltp > 0) {
            const todayUtcMidnight = new Date(`${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`).getTime() / 1000;
            if (todayUtcMidnight > mapped[mapped.length - 1].time) {
              mapped.push({
                time: todayUtcMidnight,
                date: today.toISOString().split('T')[0],
                open: sdt?.openPrice || sdt?.open || ltp,
                high: sdt?.highPrice || sdt?.high || ltp,
                low: sdt?.lowPrice || sdt?.low || ltp,
                close: ltp,
                volume: sdt?.totalTradeQuantity || sdt?.volume || 0,
              });
            }
          }
        }

      const bars = TFBARS[timeframe] ?? 90;
      return mapped.filter((d: any) => d.date && d.close > 0).slice(-bars);
    }
    return [];
  }, [symbol, timeframe, apiChartData, livePriceData, dailyGraphData]);

  const toggleOverlay = useCallback((id: string) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, enabled: !o.enabled } : o));
  }, []);
  const toggleIndicator = useCallback((id: IndicatorId) => {
    setActiveIndicators(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const info = useMemo(() => {
    let base = allStocks.find((s: any) => s.symbol === symbol) || null;
    if (livePriceData) {
      const sdt = livePriceData?.securityDailyTradeDto || livePriceData;
      const ltp = sdt?.lastTradedPrice || sdt?.ltp || base?.ltp || 0;
      const prevClose = sdt?.previousClose || base?.previousClose || 1;
      return {
        ...base,
        ltp: ltp,
        previousClose: prevClose,
        change: ltp - prevClose,
        changePercent: ((ltp - prevClose) / prevClose) * 100,
        open: sdt?.openPrice || sdt?.open || base?.open || 0,
        high: sdt?.highPrice || sdt?.high || base?.high || 0,
        low: sdt?.lowPrice || sdt?.low || base?.low || 0,
        volume: sdt?.totalTradeQuantity || sdt?.volume || base?.volume || 0,
        turnover: sdt?.totalTradeValue || sdt?.turnover || base?.turnover || 0,
        eps: livePriceData?.security?.eps || livePriceData?.eps || base?.eps,
        peRatio: livePriceData?.security?.peRatio || livePriceData?.peRatio || base?.peRatio,
        week52High: sdt?.fiftyTwoWeekHigh || livePriceData?.security?.fiftyTwoWeekHigh || base?.week52High,
        week52Low: sdt?.fiftyTwoWeekLow || livePriceData?.security?.fiftyTwoWeekLow || base?.week52Low,
      };
    }
    return base;
  }, [allStocks, symbol, livePriceData]);

  const isUp = (info?.change ?? 0) >= 0;
  const mainHeight = isFullscreenLayout ? (isFullscreen ? window.innerHeight - 240 : 500) : 350;

  return (
    <div className={`${isFullscreen && isFullscreenLayout ? 'fixed inset-0 z-50 bg-bg-base p-4 overflow-auto' : 'h-full flex flex-col'} space-y-3`}>
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

        {/* Draw Tools */}
        <div className="relative">
          <button onClick={() => setShowDrawMenu(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-bg-elevated transition-colors ${
              drawToolState !== 'none' ? 'text-brand-gold' : 'text-text-secondary hover:text-text-primary'
            }`}>
            ✏️ {DRAW_TOOLS_AC.find(t => t.id === drawToolState)?.label || 'Draw'}
          </button>
          <AnimatePresence>
            {showDrawMenu && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 mt-1 w-44 card border-bg-border shadow-xl z-50 p-2 space-y-1">
                {DRAW_TOOLS_AC.map(tool => (
                  <button key={tool.id} onClick={() => { setDrawTool(tool.id); setShowDrawMenu(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors ${
                      drawToolState === tool.id ? 'text-brand-gold' : 'text-text-secondary'
                    }`}>
                    <span>{tool.icon}</span>
                    <span className="text-xs">{tool.label}</span>
                    {drawToolState === tool.id && <span className="ml-auto text-[9px] font-bold text-brand-gold">ON</span>}
                  </button>
                ))}
                {drawToolState !== 'none' && (
                  <button onClick={() => { clearDrawings(); setShowDrawMenu(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bear-red/10 text-bear-red text-left mt-1 border-t border-bg-border/50 pt-2">
                    <span className="text-xs">🗑 Clear all drawings</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {chartData.length > 0 && (
            <span className="text-[10px] text-bull-green font-bold px-2 py-0.5 rounded bg-bull-green/10 border border-bull-green/20">● LIVE DATA</span>
          )}
          {chartData.length === 0 && (
            <span className="text-[10px] text-text-muted font-bold px-2 py-0.5 rounded bg-bg-elevated border border-bg-border">NO CHART DATA</span>
          )}
          {isFullscreenLayout && (
            <button onClick={() => setIsFullscreen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors" title="Fullscreen">
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          <button onClick={() => { setActiveIndicators(['volume', 'rsi']); setOverlays(ALL_OVERLAYS); setChartType('candlestick'); setTimeframe('3M'); }}
            className="p-1.5 rounded-lg hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors" title="Reset">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ─── MAIN CHART ──────────────────────── */}
      <div className="card overflow-hidden border-bg-border/40 relative bg-bg-surface">
        {chartLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-base/60 backdrop-blur-sm">
            <Loader2 size={32} className="text-brand-cyan animate-spin" />
          </div>
        )}
        <MainChart symbol={symbol} ref={chartRef} data={chartData} chartType={chartType} overlays={overlays} height={mainHeight} />
      </div>

      {/* ─── INDICATOR PANELS ────────────────── */}
      <AnimatePresence>
        {activeIndicators.map(id => {
          const config = ALL_INDICATORS.find(i => i.id === id)!;
          return (
            <motion.div key={id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: config.height }}
              exit={{ opacity: 0, height: 0 }} className="card overflow-hidden border-bg-border/40 bg-bg-surface">
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

export default function AdvancedCharts() {
  const [layout, setLayout] = useState<1 | 2 | 4>(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-syne text-xl font-bold">Advanced Charts</h1>
        <div className="flex bg-bg-elevated rounded-lg p-1 border border-bg-border">
          <button 
            onClick={() => setLayout(1)}
            className={`p-1.5 rounded ${layout === 1 ? 'bg-brand-cyan text-bg-base' : 'text-text-secondary hover:text-text-primary'}`}
            title="Single Chart"
          >
            <Square size={16} />
          </button>
          <button 
            onClick={() => setLayout(2)}
            className={`p-1.5 rounded ${layout === 2 ? 'bg-brand-cyan text-bg-base' : 'text-text-secondary hover:text-text-primary'}`}
            title="Split Vertical"
          >
            <Columns size={16} />
          </button>
          <button 
            onClick={() => setLayout(4)}
            className={`p-1.5 rounded ${layout === 4 ? 'bg-brand-cyan text-bg-base' : 'text-text-secondary hover:text-text-primary'}`}
            title="2x2 Grid"
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      <div className={`grid gap-4 ${layout === 1 ? 'grid-cols-1' : layout === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {Array.from({ length: layout }).map((_, i) => (
          <div key={i} className="min-w-0">
            <ChartGridCell 
              initialSymbol={i === 0 ? 'NABIL' : i === 1 ? 'NICA' : i === 2 ? 'CIT' : 'GBIME'} 
              isFullscreenLayout={layout === 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
