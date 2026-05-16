import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Star, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { seedCompanies } from '../data/seed';
import { fetchTodayPrices } from '../services/api';
import { formatNepaliNumber, formatPercent, formatVolume, formatNPR, getPriceColorClass } from '../utils';
import { useLiveTrading, useCompanyList } from '../hooks/useNepseData';
import { useWatchlistStore } from '../store';

type SortField = 'symbol' | 'ltp' | 'changePercent' | 'volume' | 'turnover' | 'marketCap';
type SortDir = 'asc' | 'desc';

const normalizeSector = (name: string) => {
  const s = (name || '').toLowerCase().trim();
  if (s.includes('banking') || s.includes('commercial bank')) return 'Banking';
  if (s.includes('hydro power') || s.includes('hydropower')) return 'Hydro Power';
  if (s.includes('hotels') || s.includes('hotel')) return 'Hotels And Tourism';
  if (s.includes('manufacturing')) return 'Manufacturing And Processing';
  if (s.includes('development bank')) return 'Development Bank';
  if (s.includes('non life') || s.includes('non-life')) return 'Non Life Insurance';
  if (s.includes('microfinance') || s.includes('micro finance')) return 'Microfinance';
  if (s.includes('mutual fund')) return 'Mutual Fund';
  
  // Return Title Case for others
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export default function LiveMarket() {
  const navigate = useNavigate();
  const { data: rawData, isLoading: loadingLive, isError } = useLiveTrading();
  const { data: companies, isLoading: loadingCompanies } = useCompanyList();
  
  const stocks = useMemo(() => {
    if (!rawData) return [];
    
    const companyData = companies || [];
    const sectorMap = new Map();
    companyData.forEach((c: any) => sectorMap.set(c.symbol, c.sectorName));

    const seedMap = new Map();
    seedCompanies.forEach(c => seedMap.set(c.symbol, c));

    return rawData.map((s: any) => {
      const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector || '';
      const seedFallback = seedMap.get(s.symbol) || {};
      
      return {
        symbol: s.symbol, companyName: s.securityName || s.companyName || s.symbol,
        companyNameNepali: '', sector: normalizeSector(scripSector),
      ltp: s.lastTradedPrice || s.ltp, previousClose: s.previousClose,
      change: (s.lastTradedPrice || s.ltp) - s.previousClose,
      changePercent: s.percentageChange || 0,
      open: s.openPrice, high: s.highPrice, low: s.lowPrice,
      volume: s.totalTradeQuantity || s.volume || 0,
      turnover: s.totalTradeValue || s.totalTurnover || s.turnover || 0,
      marketCap: s.marketCap || seedFallback.marketCap || 0,
      week52High: s.fiftyTwoWeekHigh || seedFallback.week52High || 0, week52Low: s.fiftyTwoWeekLow || seedFallback.week52Low || 0,
      eps: s.eps || seedFallback.eps || 0, peRatio: s.peRatio || seedFallback.peRatio || 0, bookValue: s.bookValue || seedFallback.bookValue || 0,
      pbRatio: s.pbRatio || seedFallback.pbRatio || 0, dividendYield: s.dividendYield || seedFallback.dividendYield || 0,
      };
    });
  }, [rawData, companies]);

  const isLoading = loadingLive || loadingCompanies;

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState(searchParams.get('sector') || 'All');
  const [viewFilter, setViewFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const { watchlists, addToWatchlist, removeFromWatchlist } = useWatchlistStore();

  const watchedSymbols = useMemo(() => {
    const syms = new Set<string>();
    watchlists.forEach(w => w.items.forEach(i => syms.add(i.symbol)));
    return syms;
  }, [watchlists]);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((st: any) => st.sector).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    let result = [...stocks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.symbol.toLowerCase().includes(q) || s.companyName?.toLowerCase().includes(q));
    }
    if (sectorFilter !== 'All') result = result.filter(s => s.sector === sectorFilter);
    if (viewFilter === 'gainers') result = result.filter(s => s.changePercent > 0);
    if (viewFilter === 'losers') result = result.filter(s => s.changePercent < 0);

    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [stocks, search, sectorFilter, viewFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleWatchlist = (symbol: string, ltp: number) => {
    if (watchedSymbols.has(symbol)) removeFromWatchlist('default', symbol);
    else addToWatchlist('default', symbol, ltp);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-text-muted" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-cyan" /> : <ChevronDown size={12} className="text-brand-cyan" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-syne text-2xl font-bold">Live Market</h1>
        <span className="text-sm text-text-secondary font-jetbrains">{filtered.length} stocks</span>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Search symbol or company..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field w-full pl-9 text-sm" />
        </div>
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)}
          className="input-field text-sm min-w-[160px]">
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex rounded-lg overflow-hidden border border-bg-border">
          {(['all', 'gainers', 'losers'] as const).map(v => (
            <button key={v} onClick={() => setViewFilter(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewFilter === v ? 'bg-brand-cyan text-bg-base' : 'text-text-secondary hover:bg-bg-elevated'}`}>
              {v === 'all' ? 'All' : v === 'gainers' ? '↑ Gainers' : '↓ Losers'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-base">
                <th className="table-header w-8">#</th>
                <th className="table-header cursor-pointer select-none" onClick={() => handleSort('symbol')}>
                  <span className="flex items-center gap-1">Symbol <SortIcon field="symbol" /></span>
                </th>
                <th className="table-header">Company</th>
                <th className="table-header text-right cursor-pointer select-none" onClick={() => handleSort('ltp')}>
                  <span className="flex items-center gap-1 justify-end">LTP <SortIcon field="ltp" /></span>
                </th>
                <th className="table-header text-right cursor-pointer select-none" onClick={() => handleSort('changePercent')}>
                  <span className="flex items-center gap-1 justify-end">Change % <SortIcon field="changePercent" /></span>
                </th>
                <th className="table-header text-right">Open</th>
                <th className="table-header text-right">High</th>
                <th className="table-header text-right">Low</th>
                <th className="table-header text-right cursor-pointer select-none" onClick={() => handleSort('volume')}>
                  <span className="flex items-center gap-1 justify-end">Volume <SortIcon field="volume" /></span>
                </th>
                <th className="table-header text-right cursor-pointer select-none" onClick={() => handleSort('turnover')}>
                  <span className="flex items-center gap-1 justify-end">Turnover <SortIcon field="turnover" /></span>
                </th>
                <th className="table-header text-center">Watch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.symbol}
                  className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra"
                  onClick={() => navigate(`/stock/${s.symbol}`)}>
                  <td className="table-cell text-text-muted font-jetbrains text-xs">{i + 1}</td>
                  <td className="table-cell font-semibold text-text-primary">{s.symbol}</td>
                  <td className="table-cell text-text-secondary text-xs max-w-[200px] truncate">{s.companyName}</td>
                  <td className="table-cell text-right font-jetbrains font-medium">{formatNepaliNumber(s.ltp)}</td>
                  <td className="table-cell text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-jetbrains
                      ${s.changePercent > 0 ? 'bg-bull-green/15 text-bull-green' : s.changePercent < 0 ? 'bg-bear-red/15 text-bear-red' : 'bg-neutral-yellow/15 text-neutral-yellow'}`}>
                      {formatPercent(s.changePercent)}
                    </span>
                  </td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(s.open || 0)}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(s.high || 0)}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(s.low || 0)}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatVolume(s.volume)}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNPR(s.turnover, true)}</td>
                  <td className="table-cell text-center" onClick={e => { e.stopPropagation(); toggleWatchlist(s.symbol, s.ltp); }}>
                    <Star size={14} className={watchedSymbols.has(s.symbol) ? 'text-brand-gold fill-brand-gold' : 'text-text-muted hover:text-brand-gold'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && (
          <div className="p-8 text-center text-text-muted flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan"></div></div>
        )}
        {isError && (
          <div className="p-8 text-center text-bear-red">Error loading live market data.</div>
        )}
      </motion.div>
    </div>
  );
}
