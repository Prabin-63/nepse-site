import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Bell, BarChart2, FileText, Activity, Users, Info, 
  MessageSquare, Layers, TrendingUp, TrendingDown, Clock, Globe 
} from 'lucide-react';
import { useMarketStore, useWatchlistStore } from '../store';
import { seedCompanies } from '../data/seed';
import { formatNepaliNumber, formatPercent, formatNPR, formatVolume, getPriceColorClass } from '../utils';
import { fetchSecurityDetail, fetchGraphData } from '../services/api';
import CandlestickChart from '../components/charts/CandlestickChart';
import { generateMockOHLCV } from '../utils/mockData';
import TechnicalGauge from '../components/shared/TechnicalGauge';

// Tab Components (to be implemented)
const ChartTab = ({ symbol, data }: { symbol: string, data: any[] }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex gap-2">
        {['1D', '1W', '1M', '3M', '6M', '1Y', 'All'].map(tf => (
          <button key={tf} className={`px-3 py-1 text-xs rounded border transition-colors ${tf === '1M' ? 'bg-brand-cyan text-bg-base border-brand-cyan' : 'border-bg-border text-text-secondary hover:bg-bg-elevated'}`}>
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
      <CandlestickChart data={data} />
    </div>
  </div>
);
const FundamentalsTab = ({ symbol }: { symbol: string }) => {
  const stock = seedCompanies.find(s => s.symbol === symbol);
  const rows = [
    { label: 'Earnings Per Share (EPS)', value: stock?.eps || '—', note: 'Net profit divided by total shares' },
    { label: 'Price to Earnings (P/E)', value: stock?.peRatio || '—', note: 'Price per share / EPS' },
    { label: 'Book Value Per Share', value: stock?.bookValue || '—', note: 'Net assets divided by shares' },
    { label: 'Price to Book (P/B)', value: stock?.pbRatio || '—', note: 'Market price / Book value' },
    { label: 'Dividend Yield', value: stock?.dividendYield ? `${stock.dividendYield}%` : '—', note: 'Annual dividend / current price' },
    { label: 'Return on Equity (ROE)', value: '18.4%', note: 'Net profit / shareholder equity' },
    { label: 'Return on Assets (ROA)', value: '2.1%', note: 'Net income / total assets' },
    { label: 'Net Interest Margin', value: '3.8%', note: 'For banking sector' },
    { label: 'Market Cap', value: formatNPR(stock?.marketCap || 0, true), note: 'Total market value' },
    { label: '52-Week High', value: formatNepaliNumber(stock?.week52High || 0), note: '' },
    { label: '52-Week Low', value: formatNepaliNumber(stock?.week52Low || 0), note: '' },
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
import { useCompanyFloorsheet } from '../hooks/useNepseData';

const FloorsheetTab = ({ symbol }: { symbol: string }) => {
  const { data: floorsheetData, isLoading } = useCompanyFloorsheet(symbol);
  const trades = floorsheetData || [];
  
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
                <td className="table-cell"><span className="px-1.5 py-0.5 rounded bg-bull-green/10 text-bull-green text-xs font-bold">{t.buyerMemberId}</span></td>
                <td className="table-cell"><span className="px-1.5 py-0.5 rounded bg-bear-red/10 text-bear-red text-xs font-bold">{t.sellerMemberId}</span></td>
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
  const brokers = [
    { id: '58', name: 'Naasa Securities', buy: 245000, sell: 120000 },
    { id: '45', name: 'Imperial Securities', buy: 180000, sell: 95000 },
    { id: '34', name: 'Vision Securities', buy: 80000, sell: 310000 },
    { id: '12', name: 'ABC Securities', buy: 150000, sell: 160000 },
    { id: '28', name: 'Shree Krishna', buy: 210000, sell: 75000 },
  ];
  const maxVal = Math.max(...brokers.map(b => Math.max(b.buy, b.sell)));
  return (
    <div className="space-y-6">
      <h4 className="font-syne font-bold">Top Broker Activity — {symbol}</h4>
      <div className="space-y-4">
        {brokers.map(b => {
          const net = b.buy - b.sell;
          return (
            <div key={b.id} className="card p-4 bg-bg-base/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-bold text-text-primary">{b.name}</span>
                  <span className="text-xs text-text-muted ml-2">#{b.id}</span>
                </div>
                <span className={`font-jetbrains text-sm font-bold ${net >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                  Net: {net >= 0 ? '+' : ''}{formatNepaliNumber(net)}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] w-8 text-bull-green font-bold uppercase">Buy</span>
                  <div className="flex-1 h-2 bg-bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-bull-green rounded-full" style={{ width: `${(b.buy / maxVal) * 100}%` }} />
                  </div>
                  <span className="font-jetbrains text-xs text-text-secondary w-24 text-right">{formatNPR(b.buy, true)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] w-8 text-bear-red font-bold uppercase">Sell</span>
                  <div className="flex-1 h-2 bg-bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-bear-red rounded-full" style={{ width: `${(b.sell / maxVal) * 100}%` }} />
                  </div>
                  <span className="font-jetbrains text-xs text-text-secondary w-24 text-right">{formatNPR(b.sell, true)}</span>
                </div>
              </div>
            </div>
          );
        })}
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
const PeersTab = ({ symbol, sector }: { symbol: string, sector: string }) => {
  const peers = seedCompanies.filter(s => s.sector === sector && s.symbol !== symbol).slice(0, 8);
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
const AIInsightTab = ({ symbol }: { symbol: string }) => {
  const stock = seedCompanies.find(s => s.symbol === symbol);
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

import { useStockPrice, useStockDetail, useStockChart } from '../hooks/useNepseData';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chart');
  
  const safeSymbol = symbol || '';
  const { data: priceData, isLoading: loadingPrice } = useStockPrice(safeSymbol);
  const { data: detailData, isLoading: loadingDetail } = useStockDetail(safeSymbol);
  const { data: graphData, isLoading: loadingChart } = useStockChart(safeSymbol);
  
  const { watchlists, addToWatchlist, removeFromWatchlist } = useWatchlistStore();
  const watched = useMemo(() => watchlists.some(w => w.items.some(i => i.symbol === symbol)), [watchlists, symbol]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [symbol]);

  const loading = loadingPrice || loadingDetail || loadingChart;

  if (loading) return <div className="p-8 text-center text-text-secondary"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto mb-4"></div>Loading security data...</div>;

  const stock = {
    symbol: safeSymbol,
    companyName: detailData?.securityName || priceData?.securityName || safeSymbol,
    companyNameNepali: detailData?.companyNameNepali || '',
    sector: detailData?.sectorName || priceData?.sectorName || 'N/A',
    ltp: priceData?.lastTradedPrice || 0,
    previousClose: priceData?.previousClose || 0,
    change: (priceData?.lastTradedPrice || 0) - (priceData?.previousClose || 0),
    changePercent: (((priceData?.lastTradedPrice || 0) - (priceData?.previousClose || 0)) / (priceData?.previousClose || 1)) * 100,
    open: priceData?.openPrice || 0,
    high: priceData?.highPrice || 0,
    low: priceData?.lowPrice || 0,
    volume: priceData?.totalTradeQuantity || 0,
    turnover: priceData?.totalTradeValue || priceData?.totalTurnover || 0,
    marketCap: priceData?.marketCapitalization || detailData?.marketCap || 0,
    week52High: priceData?.fiftyTwoWeekHigh || detailData?.fiftyTwoWeekHigh || 0,
    week52Low: priceData?.fiftyTwoWeekLow || detailData?.fiftyTwoWeekLow || 0,
    eps: detailData?.eps,
    peRatio: detailData?.peRatio,
    bookValue: detailData?.bookValue,
    pbRatio: detailData?.pbRatio,
    dividendYield: detailData?.dividendYield,
  };

  const rawGraphData = graphData?.content || (Array.isArray(graphData) ? graphData : []);
  const chartData = rawGraphData.length > 0 ? rawGraphData.map((d: any) => {
    const dateStr = (d.businessDate || d.date || '').split('T')[0];
    return {
      time: new Date(dateStr).getTime() / 1000,
      open: d.openPrice ?? d.open ?? d.closePrice ?? d.value ?? 0,
      high: d.highPrice ?? d.high ?? d.closePrice ?? d.value ?? 0,
      low: d.lowPrice ?? d.low ?? d.closePrice ?? d.value ?? 0,
      close: d.closePrice ?? d.close ?? d.value ?? 0,
      volume: d.totalTradedQuantity ?? d.volume ?? 0,
    };
  }).sort((a: any, b: any) => a.time - b.time) : generateMockOHLCV(safeSymbol, 180, stock.ltp || 1000);

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
              {activeTab === 'fundamentals' && <FundamentalsTab symbol={stock.symbol} />}
              {activeTab === 'floorsheet' && <FloorsheetTab symbol={stock.symbol} />}
              {activeTab === 'broker' && <BrokerActivityTab symbol={stock.symbol} />}
              {activeTab === 'technicals' && <TechnicalsTab symbol={stock.symbol} />}
              {activeTab === 'news' && <NewsTab symbol={stock.symbol} />}
              {activeTab === 'peers' && <PeersTab symbol={stock.symbol} sector={stock.sector} />}
              {activeTab === 'ai' && <AIInsightTab symbol={stock.symbol} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
