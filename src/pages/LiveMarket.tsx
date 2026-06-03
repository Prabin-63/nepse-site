import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Star, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react';

import { fetchTodayPrices } from '../services/api';
import { formatNepaliNumber, formatPercent, formatVolume, formatNPR, getPriceColorClass } from '../utils';
import { useLiveTrading, useCompanyList, useSectorIndices } from '../hooks/useNepseData';
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
  
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export default function LiveMarket() {
  const navigate = useNavigate();
  const { data: rawData, isLoading: loadingLive, isError } = useLiveTrading();
  const { data: companies, isLoading: loadingCompanies } = useCompanyList();
  const { data: sectorData, isLoading: loadingSectors } = useSectorIndices();
  
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const { watchlists, addToWatchlist, removeFromWatchlist } = useWatchlistStore();

  const stocks = useMemo(() => {
    if (!rawData) return [];
    
    const companyData = companies || [];
    const sectorMap = new Map();
    companyData.forEach((c: any) => sectorMap.set(c.symbol, c.sectorName));

    return rawData.map((s: any) => {
      const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector || '';
      
      return {
        symbol: s.symbol, companyName: s.securityName || s.companyName || s.symbol,
        companyNameNepali: '', sector: normalizeSector(scripSector),
        ltp: s.lastTradedPrice || s.ltp, previousClose: s.previousClose,
        change: (s.lastTradedPrice || s.ltp) - s.previousClose,
        changePercent: s.percentageChange || 0,
        open: s.openPrice, high: s.highPrice, low: s.lowPrice,
        volume: s.totalTradeQuantity || s.volume || 0,
        turnover: s.totalTradeValue || s.totalTurnover || s.turnover || 0,
        marketCap: s.marketCap || 0,
        week52High: s.fiftyTwoWeekHigh || 0, week52Low: s.fiftyTwoWeekLow || 0,
        eps: s.eps || 0, peRatio: s.peRatio || 0, bookValue: s.bookValue || 0,
        pbRatio: s.pbRatio || 0, dividendYield: s.dividendYield || 0,
      };
    });
  }, [rawData, companies]);

  // Sector summary data
  const sectorSummary = useMemo(() => {
    const summary = new Map();
    stocks.forEach(stock => {
      if (!summary.has(stock.sector)) {
        summary.set(stock.sector, {
          sector: stock.sector,
          percentChange: 0,
          turnover: 0,
          up: 0,
          down: 0,
          stocks: [],
        });
      }
      const s = summary.get(stock.sector);
      s.stocks.push(stock);
      s.turnover += stock.turnover;
      if (stock.changePercent > 0) s.up += 1;
      else if (stock.changePercent < 0) s.down += 1;
    });

    // Calculate average percentage change per sector
    Array.from(summary.values()).forEach(s => {
      s.percentChange = s.stocks.length > 0 
        ? s.stocks.reduce((sum: number, st: any) => sum + st.changePercent, 0) / s.stocks.length
        : 0;
    });

    // Sort: gaining sectors first (desc), then losing sectors (desc by magnitude)
    return Array.from(summary.values()).sort((a, b) => {
      if ((a.percentChange > 0) && (b.percentChange <= 0)) return -1;
      if ((a.percentChange <= 0) && (b.percentChange > 0)) return 1;
      return b.percentChange - a.percentChange;
    });
  }, [stocks]);

  const watchedSymbols = useMemo(() => {
    const syms = new Set<string>();
    watchlists.forEach(w => w.items.forEach(i => syms.add(i.symbol)));
    return syms;
  }, [watchlists]);

  const isLoading = loadingLive || loadingCompanies || loadingSectors;

  // Stocks within selected sector
  const sectorStocks = useMemo(() => {
    if (!selectedSector) return [];
    const sector = sectorSummary.find(s => s.sector === selectedSector);
    if (!sector) return [];

    let result = [...sector.stocks];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s.symbol.toLowerCase().includes(q) || s.companyName?.toLowerCase().includes(q));
    }
    if (viewFilter === 'gainers') result = result.filter(s => s.changePercent > 0);
    if (viewFilter === 'losers') result = result.filter(s => s.changePercent < 0);

    result.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [selectedSector, sectorSummary, search, viewFilter, sortField, sortDir]);

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

  // Show sector stocks view if sector selected
  if (selectedSector) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setSelectedSector(null); setSearch(''); setViewFilter('all'); }}
          className="flex items-center gap-2 text-brand-cyan hover:text-brand-cyan/80 transition-colors text-sm font-medium mb-2"
        >
          <ChevronLeft size={18} />
          Back to Sectors
        </button>

        <div className="flex items-center justify-between">
          <h1 className="font-syne text-2xl font-bold">{selectedSector}</h1>
          <span className="text-sm text-text-secondary font-jetbrains">{sectorStocks.length} stocks</span>
        </div>

        {/* Filters */}
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Search symbol or company..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field w-full pl-9 text-sm" />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-bg-border">
            {(['all', 'gainers', 'losers'] as const).map(v => (
              <button key={v} onClick={() => setViewFilter(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewFilter === v ? 'bg-brand-cyan text-bg-base' : 'text-text-secondary hover:bg-bg-elevated'}`}>
                {v === 'all' ? 'All' : v === 'gainers' ? '↑ Gainers' : '↓ Losers'}
              </button>
            ))}
          </div>
        </div>

        {/* Stocks Table */}
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
                {sectorStocks.map((s, i) => (
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
          {isLoading && <div className="p-8 text-center text-text-muted"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto"></div></div>}
          {isError && <div className="p-8 text-center text-bear-red">Error loading market data.</div>}
        </motion.div>
      </div>
    );
  }

  // Sector list view (default)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-syne text-2xl font-bold">Live Market</h1>
        <span className="text-sm text-text-secondary font-jetbrains">{sectorSummary.length} sectors</span>
      </div>

      {/* Sector Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-base">
                <th className="table-header">Sector</th>
                <th className="table-header text-right">% Change</th>
                <th className="table-header text-right">Total Turnover</th>
                <th className="table-header text-center">Stocks Up</th>
                <th className="table-header text-center">Stocks Down</th>
              </tr>
            </thead>
            <tbody>
              {sectorSummary.map((sector) => {
                const isGaining = sector.percentChange > 0;
                const bg = isGaining ? 'bg-bull-green/5' : 'bg-bear-red/5';
                return (
                  <tr
                    key={sector.sector}
                    onClick={() => setSelectedSector(sector.sector)}
                    className={`border-b border-bg-border/30 hover:${bg} cursor-pointer transition-colors ${bg}`}
                  >
                    <td className="table-cell font-semibold text-text-primary">{sector.sector}</td>
                    <td className="table-cell text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-jetbrains ${
                        isGaining ? 'text-bull-green' : 'text-bear-red'
                      }`}>
                        {isGaining ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatPercent(sector.percentChange)}
                      </span>
                    </td>
                    <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNPR(sector.turnover, true)}</td>
                    <td className="table-cell text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-bull-green/15 text-bull-green">
                        {sector.up}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-bear-red/15 text-bear-red">
                        {sector.down}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isLoading && <div className="p-8 text-center text-text-muted"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan mx-auto"></div></div>}
        {isError && <div className="p-8 text-center text-bear-red">Error loading market data.</div>}
      </motion.div>
    </div>
  );
}
