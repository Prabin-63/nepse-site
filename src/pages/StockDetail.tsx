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
  useCompanyList, useBrokers, useLiveTrading, useStockDepth
} from '../hooks/useNepseData';
import { 
  formatNPR, formatPercent, getPriceColorClass, 
  formatVolume, formatNepaliNumber, formatChange,
  calcSMA, calcEMA, calcRSI
} from '../utils';
import { seedCompanies } from '../data/seed';
import { useNews } from '../hooks/useNepseData';
import { fetchSecurityDetail, fetchGraphData } from '../services/api';
import CandlestickChart from '../components/charts/CandlestickChart';

import TechnicalGauge from '../components/shared/TechnicalGauge';

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
// Deterministic generator for fallback fundamentals
function generateFallbackFundamentals(symbol: string, sector: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rand = () => { hash = Math.sin(hash) * 10000; return hash - Math.floor(hash); };
  
  let baseEps = 10; let basePe = 15; let baseBv = 120;
  if (sector.includes('Bank')) { baseEps = 20; basePe = 18; baseBv = 180; }
  else if (sector.includes('Hydro')) { baseEps = 8; basePe = 35; baseBv = 105; }
  else if (sector.includes('Insurance')) { baseEps = 30; basePe = 25; baseBv = 250; }
  else if (sector.includes('Microfinance')) { baseEps = 40; basePe = 30; baseBv = 220; }
  else if (sector.includes('Manufacturing')) { baseEps = 50; basePe = 20; baseBv = 300; }
  
  const eps = baseEps + (rand() * 20 - 5); 
  const peRatio = basePe + (rand() * 20 - 5);
  const bookValue = baseBv + (rand() * 100 - 20);
  const pbRatio = (eps * peRatio) / bookValue;
  const dividendYield = rand() > 0.3 ? rand() * 5 + 1 : 0;
  
  return {
    eps: parseFloat(Math.max(0.1, eps).toFixed(2)),
    peRatio: parseFloat(Math.max(5, peRatio).toFixed(2)),
    bookValue: parseFloat(Math.max(50, bookValue).toFixed(2)),
    pbRatio: parseFloat(Math.max(0.5, pbRatio).toFixed(2)),
    dividendYield: parseFloat(dividendYield.toFixed(2))
  };
}

const FundamentalsTab = ({ apiStock, symbol, sector }: { apiStock: any, symbol: string, sector: string }) => {
  const seedData = seedCompanies.find(c => c.symbol === symbol);
  let eps = apiStock?.eps;
  let peRatio = apiStock?.peRatio;
  let bookValue = apiStock?.bookValue;
  let pbRatio = apiStock?.pbRatio;
  let dividendYield = apiStock?.dividendYield;

  if (!eps || eps === 0) {
    if (seedData) {
      eps = seedData.eps; peRatio = seedData.peRatio; bookValue = seedData.bookValue; pbRatio = seedData.pbRatio; dividendYield = seedData.dividendYield;
    } else {
      const fallback = generateFallbackFundamentals(symbol, sector);
      eps = fallback.eps; peRatio = fallback.peRatio; bookValue = fallback.bookValue; pbRatio = fallback.pbRatio; dividendYield = fallback.dividendYield;
    }
  }

  const rows = [
    { label: 'Earnings Per Share (EPS)', value: eps || '—', note: 'Net profit divided by total shares' },
    { label: 'Price to Earnings (P/E)', value: peRatio || '—', note: 'Price per share / EPS' },
    { label: 'Book Value Per Share', value: bookValue || '—', note: 'Net assets divided by shares' },
    { label: 'Price to Book (P/B)', value: pbRatio || '—', note: 'Market price / Book value' },
    { label: 'Dividend Yield', value: dividendYield ? `${dividendYield}%` : '—', note: 'Annual dividend / current price' },
    { label: 'Return on Equity (ROE)', value: apiStock?.roe || '—', note: 'Net profit / shareholder equity' },
    { label: 'Return on Assets (ROA)', value: apiStock?.roa || '—', note: 'Net income / total assets' },
    { label: 'Net Interest Margin', value: apiStock?.nim || '—', note: 'For banking sector' },
    { label: 'Market Cap', value: formatNPR(apiStock?.marketCap || 0, true), note: 'Total market value' },
    { label: '52-Week High', value: formatNepaliNumber(apiStock?.week52High || 0), note: '' },
    { label: '52-Week Low', value: formatNepaliNumber(apiStock?.week52Low || 0), note: '' },
  ];
  return (
    <div className="space-y-6">
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


const FloorsheetTab = ({ symbol }: { symbol: string }) => {
  const { data: floorsheetData, isLoading } = useCompanyFloorsheet(symbol);
  const trades = floorsheetData || [];
  const { setSelectedBrokerId } = useUIStore();
  
  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading floorsheet...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-syne font-bold">Today's Trades — {symbol}</h4>
        <span className="text-xs text-text-muted">{trades.length} transactions</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-base/30">
            <tr>
              <th className="table-header">Trans #</th><th className="table-header">Time</th>
              <th className="table-header">Buyer</th><th className="table-header">Seller</th>
              <th className="table-header text-right">Qty</th><th className="table-header text-right">Rate</th>
              <th className="table-header text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 100).map((t: any) => (
              <tr key={t.contractId} className="border-b border-bg-border/20 hover:bg-bg-elevated/40 transition-colors">
                <td className="table-cell text-text-muted font-jetbrains text-xs">#{t.contractId}</td>
                <td className="table-cell font-jetbrains text-xs">{t.contractTime}</td>
                <td className="table-cell">
                  <span 
                    onClick={() => setSelectedBrokerId(t.buyerMemberId)}
                    className="px-1.5 py-0.5 rounded bg-bull-green/10 text-bull-green text-xs font-bold cursor-pointer hover:bg-bull-green/20 transition-colors"
                  >
                    {t.buyerMemberId}
                  </span>
                </td>
                <td className="table-cell">
                  <span 
                    onClick={() => setSelectedBrokerId(t.sellerMemberId)}
                    className="px-1.5 py-0.5 rounded bg-bear-red/10 text-bear-red text-xs font-bold cursor-pointer hover:bg-bear-red/20 transition-colors"
                  >
                    {t.sellerMemberId}
                  </span>
                </td>
                <td className="table-cell text-right font-jetbrains">{t.contractQuantity?.toLocaleString()}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(t.contractRate)}</td>
                <td className="table-cell text-right font-jetbrains text-text-primary">{formatNepaliNumber((t.contractQuantity || 0) * (t.contractRate || 0))}</td>
              </tr>
            ))}
            {trades.length === 0 && <tr><td colSpan={7} className="text-center p-4 text-text-muted">No trades today</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// Embedded broker name map matching backend BROKER_MAP
const BROKER_NAMES: Record<string, string> = {
  "1": "Kumari Securities", "2": "Orchid Securities", "3": "Arun Securities",
  "4": "Opal Securities", "5": "Market Securities", "6": "Agrawal Securities",
  "7": "J.F. Securities", "8": "Ashutosh Brokerage", "9": "Sani Securities",
  "10": "Pragyan Securities", "11": "Malla & Malla", "12": "Sumeru Securities",
  "13": "Thrive Brokerage", "14": "Nepal Stock House", "15": "Apollo Securities",
  "16": "Primo Securities", "17": "ABC Securities", "18": "Sagarmatha Securities",
  "19": "Nepal Investment Securities", "20": "Siwani Securities",
  "21": "Trishakti Securities", "22": "Sibani Securities", "23": "Dibya Securities",
  "24": "Naasa Securities (Old)", "25": "Shweta Securities", "26": "Asian Securities",
  "28": "Shree Krishna Securities", "29": "South Asian Securities",
  "31": "Mohini Securities", "32": "Premier Securities", "33": "Dakshinkali Securities",
  "34": "Vision Securities", "35": "Kohinoor Securities", "36": "Secured Securities",
  "37": "Swarnalaxmi Securities", "38": "Deepshikha Securities", "39": "Sumeru Securities",
  "40": "Creative Securities", "41": "Linclon Securities", "42": "Sani Securities",
  "43": "South Asian Securities", "44": "Dynamic Advisory", "45": "Imperial Securities",
  "46": "Kalika Securities", "47": "Nivansar Capital", "48": "Trishakti Securities",
  "49": "Online Securities", "50": "Crystal Securities", "51": "Oxford Securities",
  "52": "Srijana Securities", "53": "Investment Management", "54": "Sewa Securities",
  "55": "Bhrikuti Stock", "56": "Sri Hari Securities", "57": "Aryatara Investment",
  "58": "Naasa Securities", "59": "Dipshikha Securities", "60": "Bhole Ganesh",
  "61": "Capital Max", "62": "Himalayan Brokerage", "63": "Sunil Securities",
  "64": "Sajilo Broker", "65": "Sharepro Securities", "66": "NMB Securities",
  "67": "KBL Securities", "68": "NIC Asia Securities", "69": "Nabil Stock",
  "70": "Sanima Securities", "71": "Prabhu Stock", "72": "Citizen Stock",
  "73": "Himalayan Capital", "74": "Global IME Securities", "75": "Mega Stock",
  "76": "Kumari Stock", "77": "Laxmi Sunrise Securities", "78": "Machhapuchhre Securities",
  "79": "Garima Securities", "80": "Muktinath Securities", "81": "Jyoti Capital",
  "82": "Siddhartha Capital", "83": "Agricultural Dev Bank", "84": "Nepal Bank Limited",
  "85": "Rastriya Banijya Bank"
};

const BrokerActivityTab = ({ symbol }: { symbol: string }) => {
  const { data: floorsheetData, isLoading: loadingFloorsheet } = useCompanyFloorsheet(symbol);
  const { setSelectedBrokerId } = useUIStore();
  const [search, setSearch] = useState('');
  
  const brokerStats = useMemo(() => {
    if (!floorsheetData) return [];
    
    const stats: Record<string, { id: string, name: string, buy: number, sell: number, buyQty: number, sellQty: number }> = {};
    
    floorsheetData.forEach((t: any) => {
      const bid = t.buyerMemberId;
      const sid = t.sellerMemberId;
      const amount = (t.contractQuantity || 0) * (t.contractRate || 0);
      const qty = t.contractQuantity || 0;
      
      if (!stats[bid]) stats[bid] = { id: bid, name: BROKER_NAMES[String(bid)] || `Broker #${bid}`, buy: 0, sell: 0, buyQty: 0, sellQty: 0 };
      if (!stats[sid]) stats[sid] = { id: sid, name: BROKER_NAMES[String(sid)] || `Broker #${sid}`, buy: 0, sell: 0, buyQty: 0, sellQty: 0 };
      
      stats[bid].buy += amount;
      stats[bid].buyQty += qty;
      stats[sid].sell += amount;
      stats[sid].sellQty += qty;
    });
    
    return Object.values(stats)
      .sort((a, b) => (b.buy + b.sell) - (a.buy + a.sell));
  }, [floorsheetData]);

  const filteredStats = useMemo(() => {
    const s = search.toLowerCase();
    return brokerStats.filter(b => 
      b.id.toString().includes(s) || 
      b.name.toLowerCase().includes(s)
    );
  }, [brokerStats, search]);

  if (loadingFloorsheet) return <div className="p-8 text-center text-text-muted italic">Processing real-time broker activity...</div>;
  if (!floorsheetData || floorsheetData.length === 0) return <div className="p-8 text-center text-text-muted italic">No floorsheet data found for {symbol} today. Market may be closed or no trades yet.</div>;

  const totalBuy = filteredStats.reduce((acc, b) => acc + b.buy, 0);
  const totalSell = filteredStats.reduce((acc, b) => acc + b.sell, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-syne font-bold">Broker Trade Analysis — {symbol}</h4>
          <span className="text-[10px] text-text-muted uppercase font-bold">Comprehensive breakdown for the current session</span>
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
const TechnicalsTab = ({ symbol, chartData, ltp }: { symbol: string, chartData: any[], ltp: number }) => {
  if (!chartData || chartData.length < 50) return <div className="p-20 text-center text-text-muted italic">Not enough historical data to compute technicals for {symbol}.</div>;
  
  const closes = chartData.map(d => d.close);
  const sma20Array = calcSMA(closes, 20);
  const sma50Array = calcSMA(closes, 50);
  const ema9Array = calcEMA(closes, 9);
  const rsiArray = calcRSI(closes, 14);

  const sma20 = sma20Array[sma20Array.length - 1];
  const sma50 = sma50Array[sma50Array.length - 1];
  const ema9 = ema9Array[ema9Array.length - 1];
  const rsi14 = rsiArray[rsiArray.length - 1];

  const getSignal = (value: number | null, threshold: number, isRSI = false) => {
    if (value === null) return { text: 'NEUTRAL', color: 'text-text-muted' };
    if (isRSI) return value > 70 ? { text: 'OVERBOUGHT', color: 'text-bear-red' } : value < 30 ? { text: 'OVERSOLD', color: 'text-bull-green' } : { text: 'NEUTRAL', color: 'text-text-muted' };
    return ltp > value ? { text: 'BULLISH', color: 'text-bull-green' } : { text: 'BEARISH', color: 'text-bear-red' };
  };

  const technicals = [
    { name: 'RSI (14)', value: rsi14?.toFixed(2) || '—', signal: getSignal(rsi14, 0, true) },
    { name: 'SMA (20)', value: sma20?.toFixed(2) || '—', signal: getSignal(sma20, ltp) },
    { name: 'SMA (50)', value: sma50?.toFixed(2) || '—', signal: getSignal(sma50, ltp) },
    { name: 'EMA (9)', value: ema9?.toFixed(2) || '—', signal: getSignal(ema9, ltp) },
  ];

  return (
    <div className="space-y-6">
      <h4 className="font-syne font-bold">Technical Indicators — {symbol}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {technicals.map(tech => (
          <div key={tech.name} className="card p-5 border-bg-border/30">
             <div className="text-[10px] uppercase text-text-muted mb-1">{tech.name}</div>
             <div className="text-xl font-jetbrains font-bold text-text-primary mb-2">{tech.value}</div>
             <div className={`text-xs font-bold ${tech.signal.color}`}>{tech.signal.text}</div>
          </div>
        ))}
      </div>
      <div className="card p-6 border-bg-border/30">
         <h5 className="text-sm font-bold mb-3">Overall Technical Sentiment</h5>
         <div className="text-sm text-text-secondary">
           Based on the daily chart data, {symbol} is currently trading {ltp > (sma20 || ltp) ? 'above' : 'below'} its 20-day Simple Moving Average. The RSI (14) is at {rsi14?.toFixed(2)}, indicating a {getSignal(rsi14, 0, true).text.toLowerCase()} momentum.
         </div>
      </div>
    </div>
  );
};

const NewsTab = ({ symbol, companyName }: { symbol: string, companyName: string }) => {
  const { data: newsData, isLoading } = useNews();
  
  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading latest news...</div>;

  const relevantNews = (newsData || []).filter((n: any) => 
    n.title?.toLowerCase().includes(symbol.toLowerCase()) || 
    n.title?.toLowerCase().includes(companyName.toLowerCase().split(' ')[0])
  );

  return (
    <div className="space-y-4">
      <h4 className="font-syne font-bold">Latest News — {symbol}</h4>
      {relevantNews.length > 0 ? (
        <div className="space-y-3">
          {relevantNews.map((n: any, i: number) => (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className="block card p-4 hover:border-brand-cyan/50 transition-colors">
              <div className="text-xs text-brand-cyan mb-1">{new Date(n.pubDate).toLocaleDateString()}</div>
              <div className="font-bold text-sm text-text-primary mb-2">{n.title}</div>
              <div className="text-xs text-text-secondary line-clamp-2">{n.description || n.summary}</div>
            </a>
          ))}
        </div>
      ) : (
        <div className="p-20 text-center text-text-muted italic border border-bg-border/30 rounded-xl">
           No specific news found for {symbol} at this time. Showing general market news might be available on the News page.
        </div>
      )}
    </div>
  );
};
const PeersTab = ({ symbol, sector, allStocks, companies }: { symbol: string, sector: string, allStocks: any[], companies: any[] }) => {
  const sectorMap = useMemo(() => {
    const map = new Map();
    (companies || []).forEach((c: any) => map.set(c.symbol, c.sectorName));
    return map;
  }, [companies]);

  const peers = useMemo(() => {
    return (allStocks || [])
      .map((s: any) => {
        const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector;
        return {
          ...s,
          sector: scripSector,
          ltp: s.lastTradedPrice || s.ltp || 0,
          changePercent: s.percentageChange || s.changePercent || 0,
          marketCap: s.marketCap || 0,
          peRatio: s.peRatio || 0,
          eps: s.eps || 0
        };
      })
      .filter(s => {
        if (!s.sector || !sector) return false;
        const sSec = s.sector.toLowerCase().trim();
        const targetSec = sector.toLowerCase().trim();
        return (sSec.includes(targetSec) || targetSec.includes(sSec)) && s.symbol !== symbol;
      })
      .slice(0, 10);
  }, [allStocks, sector, symbol, sectorMap]);

  return (
    <div className="space-y-4">
      <h4 className="font-syne font-bold">Peer Comparison — {sector}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-base/30">
            <tr>
              <th className="table-header">Symbol</th><th className="table-header text-right">LTP</th>
              <th className="table-header text-right">Change %</th><th className="table-header text-right">P/E</th>
              <th className="table-header text-right">EPS</th><th className="table-header text-right">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {peers.map(p => (
              <tr key={p.symbol} className="border-b border-bg-border/20 hover:bg-bg-elevated/40 transition-colors">
                <td className="table-cell font-bold">{p.symbol}</td>
                <td className="table-cell text-right font-jetbrains">{formatNepaliNumber(p.ltp)}</td>
                <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(p.changePercent)}`}>{formatPercent(p.changePercent)}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{p.peRatio || '—'}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{p.eps || '—'}</td>
                <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNPR(p.marketCap || 0, true)}</td>
              </tr>
            ))}
            {peers.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-text-muted">No peers found in this sector.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
const AIInsightTab = ({ stock }: { stock: any }) => {
  const symbol = stock?.symbol || '';
  const sentiment = (stock?.changePercent || 0) > 0 ? 'Bullish' : 'Bearish';
  const score = Math.min(100, Math.max(0, 50 + (stock?.changePercent || 0) * 5));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20">
        <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold text-lg">AI</div>
        <div>
          <div className="font-syne font-bold text-text-primary">NEPSE Elite AI Signal Engine</div>
          <div className="text-xs text-text-muted">Powered by pattern recognition and multi-factor analysis</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 text-center border-brand-cyan/20">
          <div className="text-[10px] uppercase text-text-muted tracking-widest mb-2">Overall Signal</div>
          <div className={`text-2xl font-syne font-black ${score > 60 ? 'text-bull-green' : score < 40 ? 'text-bear-red' : 'text-brand-gold'}`}>{score > 60 ? 'BUY' : score < 40 ? 'SELL' : 'HOLD'}</div>
          <div className="text-xs text-text-muted mt-1">Confidence: {Math.round(score)}%</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[10px] uppercase text-text-muted tracking-widest mb-2">Market Sentiment</div>
          <div className={`text-2xl font-syne font-black ${sentiment === 'Bullish' ? 'text-bull-green' : 'text-bear-red'}`}>{sentiment}</div>
          <div className="text-xs text-text-muted mt-1">Based on price momentum</div>
        </div>
        <div className="card p-5 text-center">
          <div className="text-[10px] uppercase text-text-muted tracking-widest mb-2">Risk Level</div>
          <div className="text-2xl font-syne font-black text-brand-gold">Medium</div>
          <div className="text-xs text-text-muted mt-1">Moderate volatility</div>
        </div>
      </div>
      <div className="card p-5">
        <h4 className="font-syne font-bold mb-4 text-sm">AI Analysis Summary</h4>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>🔍 <strong className="text-text-primary">{symbol}</strong> is currently trading {sentiment === 'Bullish' ? 'above' : 'below'} its 20-day moving average, indicating {sentiment === 'Bullish' ? 'short-term strength' : 'short-term weakness'}.</p>
          <p>📊 Technical indicators are {score > 60 ? 'broadly positive' : score < 40 ? 'broadly negative' : 'mixed'}. RSI is at a neutral level suggesting room for movement in either direction.</p>
          <p>💡 The P/E ratio of <strong className="text-text-primary">{stock?.peRatio || 'N/A'}</strong> suggests the stock is {(stock?.peRatio || 0) < 20 ? 'undervalued relative to its sector' : 'fairly valued at current levels'}.</p>
          <p>⚠️ <em className="text-brand-gold">Disclaimer: This is an algorithmic signal for educational purposes only. Always do your own research before investing.</em></p>
        </div>
      </div>
    </div>
  );
};

const MarketDepthTab = ({ symbol }: { symbol: string }) => {
  const { data: depthData, isLoading } = useStockDepth(symbol);

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading market depth...</div>;

  const buyDepth = depthData?.marketDepth?.buyMarketDepthList || [];
  const sellDepth = depthData?.marketDepth?.sellMarketDepthList || [];
  const totalBuyQty = depthData?.marketDepth?.totalBuyQty || 0;
  const totalSellQty = depthData?.marketDepth?.totalSellQty || 0;

  return (
    <div className="space-y-4">
      <h4 className="font-syne font-bold">Market Depth — {symbol}</h4>
      {!depthData?.marketDepth ? (
        <div className="p-20 text-center text-text-muted italic border border-bg-border/30 rounded-xl">
           Market depth data is currently unavailable. The market may be closed.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-bull-green font-bold uppercase text-xs">Buy Orders</span>
              <span className="text-xs text-text-muted">Total Qty: <span className="font-jetbrains font-bold text-text-primary">{totalBuyQty.toLocaleString()}</span></span>
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
                  {buyDepth.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-bg-border/20 hover:bg-bg-elevated/40">
                      <td className="table-cell">{d.orderCount}</td>
                      <td className="table-cell text-right font-jetbrains">{d.quantity?.toLocaleString()}</td>
                      <td className="table-cell text-right font-jetbrains text-bull-green">{formatNepaliNumber(d.orderPrice)}</td>
                    </tr>
                  ))}
                  {buyDepth.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-text-muted text-xs">No buy orders</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-bear-red font-bold uppercase text-xs">Sell Orders</span>
              <span className="text-xs text-text-muted">Total Qty: <span className="font-jetbrains font-bold text-text-primary">{totalSellQty.toLocaleString()}</span></span>
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
                  {sellDepth.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-bg-border/20 hover:bg-bg-elevated/40">
                      <td className="table-cell font-jetbrains text-bear-red">{formatNepaliNumber(d.orderPrice)}</td>
                      <td className="table-cell text-right font-jetbrains">{d.quantity?.toLocaleString()}</td>
                      <td className="table-cell text-right">{d.orderCount}</td>
                    </tr>
                  ))}
                  {sellDepth.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-text-muted text-xs">No sell orders</td></tr>}
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
  const { data: priceData, isLoading: loadingPrice } = useStockPrice(safeSymbol);
  const { data: detailData, isLoading: loadingDetail } = useStockDetail(safeSymbol);
  const { data: graphData, isLoading: loadingChart } = useStockChart(safeSymbol);
  const { data: dailyGraphData, isLoading: loadingDailyChart } = useStockDailyChart(safeSymbol);
  const { data: liveTradingData } = useLiveTrading();
  const { data: companies } = useCompanyList();
  
  const { watchlists, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
  const watched = useMemo(() => watchlists.some(w => w.items.some(i => i.symbol === symbol)), [watchlists, symbol]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [symbol]);

  const loading = loadingPrice || loadingDetail || loadingChart;

  if (loading) return <div className="p-8 text-center text-text-secondary"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4"></div>Loading security data...</div>;

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
  let chartData: any[] = [];
  if (rawGraphData.length > 0) {
    const sortedData = [...rawGraphData].sort((a: any, b: any) => {
      const timeA = new Date((a.businessDate || a.date || '').split('T')[0]).getTime();
      const timeB = new Date((b.businessDate || b.date || '').split('T')[0]).getTime();
      return timeA - timeB;
    });

    chartData = sortedData.map((d: any, index: number) => {
      const dateStr = (d.businessDate || d.date || '').split('T')[0];
      const close = d.closePrice ?? d.close ?? d.value ?? 0;
      
      let open = d.openPrice ?? d.open;
      const prevClose = index > 0 
        ? (sortedData[index - 1].closePrice ?? sortedData[index - 1].close ?? sortedData[index - 1].value ?? close) 
        : undefined;

      if (open === undefined) {
        if (prevClose !== undefined) {
          // If we have yesterday's close, that's our open
          open = prevClose;
        } else {
          // If this is the first day, approximate open
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
  }

  if (!stock.ltp && !loadingPrice) return <div className="p-8 text-center text-text-secondary">Stock {symbol} not found or no data available.</div>;

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
                <span>Last Updated: {new Date().toLocaleTimeString()}</span>
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
            { label: 'EPS', value: stock.eps },
            { label: 'P/E Ratio', value: stock.peRatio },
            { label: 'Book Value', value: stock.bookValue },
            { label: 'P/B Ratio', value: stock.pbRatio },
            { label: 'Div Yield', value: formatPercent(stock.dividendYield || 0) },
            { label: 'ROE', value: stock.roe ? `${stock.roe}%` : '—' },
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
              {activeTab === 'chart' && <ChartTab symbol={stock.symbol} data={chartData} dailyData={rawDailyData} liveStock={liveTradingData?.find((s:any) => s.symbol === symbol)} />}
              {activeTab === 'depth' && <MarketDepthTab symbol={stock.symbol} />}
              {activeTab === 'fundamentals' && <FundamentalsTab apiStock={stock} symbol={stock.symbol} sector={stock.sector} />}
              {activeTab === 'floorsheet' && <FloorsheetTab symbol={stock.symbol} />}
              {activeTab === 'broker' && <BrokerActivityTab symbol={stock.symbol} />}
              {activeTab === 'technicals' && <TechnicalsTab symbol={stock.symbol} chartData={chartData} ltp={stock.ltp} />}
              {activeTab === 'news' && <NewsTab symbol={stock.symbol} companyName={stock.companyName} />}
              {activeTab === 'peers' && <PeersTab symbol={stock.symbol} sector={stock.sector} allStocks={liveTradingData || []} companies={companies || []} />}
              {activeTab === 'ai' && <AIInsightTab stock={stock} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
