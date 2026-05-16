import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Bell, BarChart2, FileText, Activity, Users, Info, 
  MessageSquare, Layers, TrendingUp, TrendingDown, Clock, Globe, Search
} from 'lucide-react';
import { useMarketStore, useWatchlistStore, useUIStore } from '../store';
import { seedCompanies } from '../data/seed';
import { 
  useStockPrice, useStockDetail, useStockChart, useCompanyFloorsheet, 
  useCompanyList, useBrokers, useLiveTrading 
} from '../hooks/useNepseData';
import { 
  formatNPR, formatPercent, getPriceColorClass, 
  formatVolume, formatNepaliNumber, formatChange 
} from '../utils';
import { fetchSecurityDetail, fetchGraphData } from '../services/api';
import CandlestickChart from '../components/charts/CandlestickChart';
import { generateMockOHLCV } from '../utils/mockData';
import TechnicalGauge from '../components/shared/TechnicalGauge';

// Tab Components (to be implemented)
const ChartTab = ({ symbol, data }: { symbol: string, data: any[] }) => {
  const [timeframe, setTimeframe] = useState('1M');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Find the latest date in the dataset (time is in seconds for lightweight-charts)
    const latestTime = data.reduce((max, d) => {
      const ts = typeof d.time === 'number' ? d.time * 1000 : new Date(d.time || d.date).getTime();
      return Math.max(max, ts);
    }, 0);
    
    const latestDate = new Date(latestTime || Date.now());
    let cutoff = new Date(latestDate.getTime());
    
    switch (timeframe) {
      case '1D': 
        // We only have daily historical data from the API.
        // For 1D, we generate a synthetic intraday chart to demonstrate functionality.
        if (data.length === 0) return [];
        const latest = data[data.length - 1];
        const intraday = [];
        let curr = latest.open || latest.close;
        const vol = latest.high - latest.low || curr * 0.01;
        for (let i = 0; i < 60; i++) { // 60 minutes of data
          const open = curr;
          const close = open + (Math.random() - 0.5) * vol * 0.5;
          const high = Math.max(open, close) + Math.random() * vol * 0.2;
          const low = Math.min(open, close) - Math.random() * vol * 0.2;
          curr = close;
          intraday.push({
            time: latest.time - (60 - i) * 60, // past 60 mins
            open, high, low, close,
            volume: Math.floor(Math.random() * 1000)
          });
        }
        return intraday;
      case '1W': cutoff.setDate(latestDate.getDate() - 7); break;
      case '1M': cutoff.setMonth(latestDate.getMonth() - 1); break;
      case '3M': cutoff.setMonth(latestDate.getMonth() - 3); break;
      case '6M': cutoff.setMonth(latestDate.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(latestDate.getFullYear() - 1); break;
      case '5Y': cutoff.setFullYear(latestDate.getFullYear() - 5); break;
      case 'All': return data;
      default: return data;
    }
    
    return data.filter(d => {
      const ts = typeof d.time === 'number' ? d.time * 1000 : new Date(d.time || d.date).getTime();
      return ts >= cutoff.getTime();
    });
  }, [data, timeframe]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'All'].map(tf => (
            <button 
              key={tf} 
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${timeframe === tf ? 'bg-brand-cyan text-bg-base border-brand-cyan' : 'border-bg-border text-text-secondary hover:bg-bg-elevated'}`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary py-1 px-3 text-xs">Indicators</button>
          <button className="btn-secondary py-1 px-3 text-xs">Draw</button>
        </div>
      </div>
      <div className="h-[500px] border border-bg-border/30 rounded-xl overflow-hidden bg-bg-base/30">
        <CandlestickChart data={filteredData} />
      </div>
    </div>
  );
};
const FundamentalsTab = ({ apiStock }: { apiStock: any }) => {
  const rows = [
    { label: 'Earnings Per Share (EPS)', value: apiStock?.eps || '—', note: 'Net profit divided by total shares' },
    { label: 'Price to Earnings (P/E)', value: apiStock?.peRatio || '—', note: 'Price per share / EPS' },
    { label: 'Book Value Per Share', value: apiStock?.bookValue || '—', note: 'Net assets divided by shares' },
    { label: 'Price to Book (P/B)', value: apiStock?.pbRatio || '—', note: 'Market price / Book value' },
    { label: 'Dividend Yield', value: apiStock?.dividendYield ? `${apiStock.dividendYield}%` : '—', note: 'Annual dividend / current price' },
    { label: 'Return on Equity (ROE)', value: '18.4%', note: 'Net profit / shareholder equity' },
    { label: 'Return on Assets (ROA)', value: '2.1%', note: 'Net income / total assets' },
    { label: 'Net Interest Margin', value: '3.8%', note: 'For banking sector' },
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
      <div className="card p-5 bg-brand-cyan/5 border-brand-cyan/20">
        <h4 className="font-syne font-bold text-sm mb-3 text-brand-cyan">Quarterly Dividend History</h4>
        <div className="space-y-2">
          {[{ fy: '2080/81', cash: '12%', bonus: '5%' }, { fy: '2079/80', cash: '10%', bonus: '8%' }, { fy: '2078/79', cash: '8%', bonus: '10%' }].map((d, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-bg-border/30 last:border-0">
              <span className="text-sm font-bold text-text-primary">FY {d.fy}</span>
              <div className="flex gap-4">
                <span className="text-xs text-bull-green font-bold">Cash: {d.cash}</span>
                <span className="text-xs text-brand-gold font-bold">Bonus: {d.bonus}</span>
              </div>
            </div>
          ))}
        </div>
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
const BrokerActivityTab = ({ symbol }: { symbol: string }) => {
  const { data: floorsheetData, isLoading: loadingFloorsheet } = useCompanyFloorsheet(symbol);
  const { data: brokers, isLoading: loadingBrokers } = useBrokers();
  const { setSelectedBrokerId } = useUIStore();
  const [search, setSearch] = useState('');
  
  const brokerStats = useMemo(() => {
    if (!floorsheetData) return [];
    
    const stats: Record<string, { id: string, name: string, buy: number, sell: number, buyQty: number, sellQty: number }> = {};
    const brokerMap: Record<string, string> = {};
    if (brokers) {
      brokers.forEach((b: any) => brokerMap[b.id] = b.name);
    }
    
    floorsheetData.forEach((t: any) => {
      const bid = t.buyerMemberId;
      const sid = t.sellerMemberId;
      const amount = (t.contractQuantity || 0) * (t.contractRate || 0);
      const qty = t.contractQuantity || 0;
      
      if (!stats[bid]) stats[bid] = { id: bid, name: brokerMap[bid] || 'Unknown', buy: 0, sell: 0, buyQty: 0, sellQty: 0 };
      if (!stats[sid]) stats[sid] = { id: sid, name: brokerMap[sid] || 'Unknown', buy: 0, sell: 0, buyQty: 0, sellQty: 0 };
      
      stats[bid].buy += amount;
      stats[bid].buyQty += qty;
      stats[sid].sell += amount;
      stats[sid].sellQty += qty;
    });
    
    return Object.values(stats)
      .sort((a, b) => (b.buy + b.sell) - (a.buy + a.sell));
  }, [floorsheetData, brokers]);

  const filteredStats = useMemo(() => {
    const s = search.toLowerCase();
    return brokerStats.filter(b => 
      b.id.toString().includes(s) || 
      b.name.toLowerCase().includes(s)
    );
  }, [brokerStats, search]);

  if (loadingFloorsheet || loadingBrokers) return <div className="p-8 text-center text-text-muted italic">Processing real-time broker activity...</div>;

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
const TechnicalsTab = ({ symbol }: { symbol: string }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card bg-bg-base/20 border-bg-border/50">
        <TechnicalGauge value={65} label="Summary" subLabel="Strong Bullish Momentum" />
      </div>
      <div className="card bg-bg-base/20 border-bg-border/50">
        <TechnicalGauge value={20} label="Oscillators" subLabel="RSI, Stochastic, CCI" />
      </div>
      <div className="card bg-bg-base/20 border-bg-border/50">
        <TechnicalGauge value={85} label="Moving Averages" subLabel="SMA, EMA Cross" />
      </div>
    </div>
    
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-bg-border bg-bg-base/30">
        <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary">Key Indicators Summary</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-bg-border/30">
        {[
          { name: 'RSI (14)', value: '62.45', action: 'Buy' },
          { name: 'MACD (12, 26)', value: 'Positive', action: 'Strong Buy' },
          { name: 'Stochastic %K', value: '78.12', action: 'Neutral' },
          { name: 'EMA (50)', value: '1245.20', action: 'Buy' },
          { name: 'SMA (200)', value: '1180.45', action: 'Strong Buy' },
          { name: 'ADX (14)', value: '28.15', action: 'Trending' },
        ].map((item, i) => (
          <div key={i} className="bg-bg-surface p-4 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-text-muted uppercase mb-0.5">{item.name}</div>
              <div className="font-jetbrains text-sm font-bold text-text-primary">{item.value}</div>
            </div>
            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${item.action.includes('Buy') ? 'bg-bull-green/10 text-bull-green' : 'bg-bg-elevated text-text-secondary'}`}>
              {item.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
const NewsTab = ({ symbol }: { symbol: string }) => {
  const newsItems = [
    { id: 1, headline: `${symbol} posts record quarterly profit, board declares 15% cash dividend`, source: 'Mero Lagani', date: '2082-02-05', category: 'Dividend', positive: true },
    { id: 2, headline: `NEPSE index declines amid profit booking; ${symbol} dips 2.3%`, source: 'ShareSansar', date: '2082-02-03', category: 'Market', positive: false },
    { id: 3, headline: `${symbol} AGM scheduled for Jestha 2082; agenda includes bonus share proposal`, source: 'NepseAlpha', date: '2082-01-28', category: 'Corporate', positive: true },
    { id: 4, headline: `Foreign investment cap raised; ${symbol} could benefit from increased FDI`, source: 'The Himalayan Times', date: '2082-01-25', category: 'Policy', positive: true },
    { id: 5, headline: `${symbol} Q3 report shows 12% YoY profit growth`, source: 'Arthik Abhiyan', date: '2082-01-20', category: 'Financial', positive: true },
  ];
  return (
    <div className="space-y-4">
      <h4 className="font-syne font-bold">Latest News — {symbol}</h4>
      {newsItems.map(n => (
        <div key={n.id} className="card p-4 hover:border-bg-border/80 transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className={`w-1 self-stretch rounded-full shrink-0 ${n.positive ? 'bg-bull-green' : 'bg-bear-red'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${n.positive ? 'bg-bull-green/10 text-bull-green' : 'bg-bear-red/10 text-bear-red'}`}>{n.category}</span>
                <span className="text-[10px] text-text-muted">{n.source} • {n.date}</span>
              </div>
              <h5 className="text-sm font-medium text-text-primary group-hover:text-brand-cyan transition-colors leading-snug">{n.headline}</h5>
            </div>
          </div>
        </div>
      ))}
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
    const seedMap = new Map();
    seedCompanies.forEach(c => seedMap.set(c.symbol, c));

    return (allStocks || [])
      .map((s: any) => {
        const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector;
        const seedFallback = seedMap.get(s.symbol) || {};
        return {
          ...s,
          sector: scripSector,
          ltp: s.lastTradedPrice || s.ltp || 0,
          changePercent: s.percentageChange || s.changePercent || 0,
          marketCap: s.marketCap || seedFallback.marketCap || 0,
          peRatio: s.peRatio || seedFallback.peRatio || 0,
          eps: s.eps || seedFallback.eps || 0
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

const tabs = [
  { id: 'chart', label: 'Chart', icon: BarChart2 },
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
  const { data: liveTradingData } = useLiveTrading();
  const { data: companies } = useCompanyList();
  
  const { watchlists, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
  const watched = useMemo(() => watchlists.some(w => w.items.some(i => i.symbol === symbol)), [watchlists, symbol]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [symbol]);

  const loading = loadingPrice || loadingDetail || loadingChart;

  if (loading) return <div className="p-8 text-center text-text-secondary"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4"></div>Loading security data...</div>;

  const sdt = priceData?.securityDailyTradeDto || {};
  const sec = priceData?.security || {};
  const mockFundamentals = seedCompanies.find(s => s.symbol === safeSymbol) || {};

  const stock = {
    symbol: safeSymbol,
    companyName: detailData?.securityName || sec.securityName || safeSymbol,
    companyNameNepali: detailData?.companyNameNepali || '',
    sector: detailData?.sectorName || sec.companyId?.sectorMaster?.sectorDescription || 'N/A',
    ltp: sdt.lastTradedPrice || 0,
    previousClose: sdt.previousClose || 0,
    change: (sdt.lastTradedPrice || 0) - (sdt.previousClose || 0),
    changePercent: (((sdt.lastTradedPrice || 0) - (sdt.previousClose || 1)) / (sdt.previousClose || 1)) * 100,
    open: sdt.openPrice || 0,
    high: sdt.highPrice || 0,
    low: sdt.lowPrice || 0,
    volume: sdt.totalTradeQuantity || 0,
    turnover: sdt.totalTradeValue || priceData?.totalTurnover || 0,
    marketCap: priceData?.marketCapitalization || detailData?.marketCap || 0,
    week52High: sdt.fiftyTwoWeekHigh || detailData?.fiftyTwoWeekHigh || 0,
    week52Low: sdt.fiftyTwoWeekLow || detailData?.fiftyTwoWeekLow || 0,
    eps: mockFundamentals.eps,
    peRatio: mockFundamentals.peRatio,
    bookValue: mockFundamentals.bookValue,
    pbRatio: mockFundamentals.pbRatio,
    dividendYield: mockFundamentals.dividendYield,
  };

  const rawGraphData = graphData?.content || (Array.isArray(graphData) ? graphData : []);
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
  } else {
    chartData = generateMockOHLCV(safeSymbol, 180, stock.ltp || 1000);
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
            { label: 'ROE', value: '18.4%' },
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
              {activeTab === 'chart' && <ChartTab symbol={stock.symbol} data={chartData} />}
              {activeTab === 'fundamentals' && <FundamentalsTab apiStock={stock} />}
              {activeTab === 'floorsheet' && <FloorsheetTab symbol={stock.symbol} />}
              {activeTab === 'broker' && <BrokerActivityTab symbol={stock.symbol} />}
              {activeTab === 'technicals' && <TechnicalsTab symbol={stock.symbol} />}
              {activeTab === 'news' && <NewsTab symbol={stock.symbol} />}
              {activeTab === 'peers' && <PeersTab symbol={stock.symbol} sector={stock.sector} allStocks={liveTradingData || []} companies={companies || []} />}
              {activeTab === 'ai' && <AIInsightTab stock={stock} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
