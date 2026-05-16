import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, TrendingDown, Activity, Banknote, ListFilter, ArrowRight } from 'lucide-react';
import { formatNPR, formatPercent, getPriceColorClass, formatVolume } from '../utils';
import { useSectorIndices, useLiveTrading, useCompanyList } from '../hooks/useNepseData';
import { seedCompanies } from '../data/seed';

export default function SectorAnalysis() {
  const navigate = useNavigate();
  const { data: sectorIndices, isLoading: loadingSectors } = useSectorIndices();
  const { data: liveData, isLoading: loadingLive } = useLiveTrading();
  const { data: companies, isLoading: loadingCompanies } = useCompanyList();

  const enrichedSectors = useMemo(() => {
    const rawSectors = sectorIndices || [];
    const stocks = liveData || [];
    const companyData = companies || [];
    
    // Create a sector lookup map
    const sectorMap = new Map();
    companyData.forEach((c: any) => sectorMap.set(c.symbol, c.sectorName));

    // Helper to normalize and match sectors
    const matchesSector = (scripSector: string, indexName: string) => {
      const s = (scripSector || '').toLowerCase().trim();
      let i = (indexName || '').toLowerCase().trim();
      
      // Strip out 'index' and 'subindex' to match cleanly
      i = i.replace('subindex', '').replace('index', '').trim();
      
      if (s === i) return true;
      
      const mapping: Record<string, string[]> = {
        'banking': ['commercial banks', 'banking', 'commercial bank'],
        'hydro power': ['hydropower', 'hydro power'],
        'hydropower': ['hydropower', 'hydro power'],
        'hotels and tourism': ['hotels', 'hotels and tourism', 'hotel'],
        'manufacturing and processing': ['manufacturing & processing', 'manufacturing and processing', 'manufacturing'],
        'development bank': ['development banks', 'development bank'],
        'non life insurance': ['non life insurance', 'non-life insurance'],
        'life insurance': ['life insurance'],
        'mutual fund': ['mutual fund', 'mutual funds'],
        'microfinance': ['microfinance', 'micro finance'],
        'investment': ['investment'],
        'finance': ['finance'],
        'trading': ['trading'],
        'others': ['others']
      };
      
      const mapped = mapping[i] || [i];
      return mapped.includes(s) || s.includes(i) || i.includes(s);
    };

    // Pre-map seed fundamentals
    const seedMap = new Map();
    seedCompanies.forEach(c => seedMap.set(c.symbol, c));

    return rawSectors.map((sector: any) => {
      const name = sector.index || sector.name;
      const sectorStocks = stocks.filter((s: any) => {
        const scripSector = sectorMap.get(s.symbol) || s.sectorName || s.sector;
        return matchesSector(scripSector, name);
      });
      
      let stocksUp = 0;
      let stocksDown = 0;
      let stocksUnchanged = 0;
      let sectorMarketCap = 0;
      let turnover = 0;
      let volume = 0;
      let topGainer = null;
      let totalPE = 0;
      let totalEPS = 0;
      let countWithPE = 0;
      let countWithEPS = 0;

      // Helper to safely parse numbers, handling commas and strings
      const parseNum = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };

      sectorStocks.forEach((s: any) => {
        const pChange = parseNum(s.percentageChange);
        if (pChange > 0) stocksUp++;
        else if (pChange < 0) stocksDown++;
        else stocksUnchanged++;

        const seedFallback = seedMap.get(s.symbol) || {};

        sectorMarketCap += parseNum(s.marketCap || s.marketCapitalization || seedFallback.marketCap);
        turnover += parseNum(s.totalTradeValue || s.turnover);
        volume += parseNum(s.totalTradeQuantity || s.volume);
        
        const pe = parseNum(s.peRatio || seedFallback.peRatio);
        const eps = parseNum(s.eps || seedFallback.eps);
        if (pe > 0) { totalPE += pe; countWithPE++; }
        if (eps > 0) { totalEPS += eps; countWithEPS++; }

        const currentTopGainerChange = topGainer ? parseNum(topGainer.percentageChange) : -9999;
        if (!topGainer || pChange > currentTopGainerChange) {
          topGainer = s;
        }
      });

      return {
        id: name,
        name,
        nameNepali: '',
        currentValue: parseNum(sector.currentValue || sector.close),
        changePercent: parseNum(sector.perChange || sector.percentChange),
        turnover,
        volume,
        stocksUp,
        stocksDown,
        stocksUnchanged,
        stockCount: sectorStocks.length,
        totalMarketCap: sectorMarketCap,
        avgPE: countWithPE > 0 ? (totalPE / countWithPE).toFixed(2) : '—',
        avgEPS: countWithEPS > 0 ? (totalEPS / countWithEPS).toFixed(2) : '—',
        topGainer: topGainer ? {
          symbol: topGainer.symbol,
          changePercent: parseNum(topGainer.percentageChange),
          ltp: parseNum(topGainer.lastTradedPrice || topGainer.ltp)
        } : null,
      };
    }).sort((a: any, b: any) => b.changePercent - a.changePercent);
  }, [sectorIndices, liveData, companies]);

  const totalMarketCap = enrichedSectors.reduce((acc: number, s: any) => acc + (s.totalMarketCap || 0), 0);
  const totalTurnover = enrichedSectors.reduce((acc: number, s: any) => acc + (s.turnover || 0), 0);
  const leadingSector = [...enrichedSectors].sort((a, b) => (b.totalMarketCap || 0) - (a.totalMarketCap || 0))[0];
  const leadingWeight = leadingSector && totalMarketCap > 0 ? (leadingSector.totalMarketCap / totalMarketCap) * 100 : 0;

  if (loadingSectors || loadingLive || loadingCompanies) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  if (enrichedSectors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-text-muted">
        No sector data available currently. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold">Sector Analysis</h1>
          <p className="text-xs text-text-secondary">Comprehensive breakdown of market performance by industry</p>
        </div>
        <button className="btn-secondary py-1.5 px-4 flex items-center gap-2 text-xs">
          <ListFilter size={14} /> Compare Sectors
        </button>
      </div>

      {/* Market Composition Card */}
      <div className="card p-6 flex flex-col md:flex-row items-center gap-8 bg-gradient-to-br from-bg-surface to-bg-base relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 192 192" className="w-full h-full transform -rotate-90 drop-shadow-lg">
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="currentColor"
              strokeWidth="16"
              fill="transparent"
              className="text-bg-border/20"
            />
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke="currentColor"
              strokeWidth="16"
              fill="transparent"
              strokeDasharray={502.6}
              strokeDashoffset={502.6 * (1 - ((leadingWeight || 0) / 100))}
              strokeLinecap="round"
              className="text-brand-cyan transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Dominant Sector</span>
            <span className="text-2xl font-syne font-black text-text-primary">{leadingWeight.toFixed(1)}%</span>
            <span className="text-[9px] text-brand-cyan font-medium truncate max-w-[120px] text-center px-4">{leadingSector?.name}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6 w-full relative z-10">
           {enrichedSectors.slice(0, 6).map((s, i) => {
             const weight = ((s.totalMarketCap || 0) / (totalMarketCap || 1)) * 100;
             return (
               <div key={i} className="space-y-1.5 p-3 rounded-xl hover:bg-bg-elevated/20 transition-colors group">
                 <div className="flex justify-between text-xs">
                   <span className="text-text-secondary font-medium group-hover:text-brand-cyan transition-colors">{s.name}</span>
                   <span className="text-text-muted font-jetbrains">{weight.toFixed(1)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-bg-border rounded-full overflow-hidden flex">
                   <div className="h-full bg-brand-cyan" style={{ width: `${weight}%` }} />
                 </div>
                 <div className="flex justify-between text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                   <span>{formatNPR(s.turnover, true)} Turnover</span>
                   <span className={getPriceColorClass(s.changePercent)}>{formatPercent(s.changePercent)}</span>
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* Market Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cap', value: formatNPR(totalMarketCap, true), icon: Activity, color: 'text-brand-cyan' },
          { label: 'Total Turnover', value: formatNPR(totalTurnover, true), icon: Banknote, color: 'text-brand-gold' },
          { label: 'Active Sectors', value: enrichedSectors.length, icon: PieChart, color: 'text-brand-violet' },
          { label: 'Market Sentiment', value: totalTurnover > 100000000 ? 'Active' : 'Moderate', icon: TrendingUp, color: 'text-bull-green' },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-bg-base border border-bg-border/30 ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase font-bold">{stat.label}</div>
              <div className="font-syne font-bold text-text-primary text-sm">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enrichedSectors.map((sector) => {
          let filterName = sector.name;
          const sName = sector.name.toLowerCase();
          if (sName.includes('banking') || sName.includes('commercial')) filterName = 'Banking';
          else if (sName.includes('hydro')) filterName = 'Hydro Power';
          else if (sName.includes('hotels')) filterName = 'Hotels And Tourism';
          else if (sName.includes('manufacturing')) filterName = 'Manufacturing And Processing';
          else if (sName.includes('development')) filterName = 'Development Bank';
          else if (sName.includes('non life')) filterName = 'Non Life Insurance';
          else if (sName.includes('microfinance')) filterName = 'Microfinance';
          else if (sName.includes('mutual')) filterName = 'Mutual Fund';
          else filterName = filterName.replace('SubIndex', '').replace('Index', '').trim();
          
          return (
          <motion.div 
            key={sector.id} 
            whileHover={{ y: -4 }}
            className="card p-5 border-l-4 transition-all group cursor-pointer"
            style={{ borderLeftColor: sector.changePercent >= 0 ? '#00C48C' : '#FF4D4F' }}
            onClick={() => navigate(`/live-market?sector=${encodeURIComponent(filterName)}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-syne font-bold text-text-primary group-hover:text-brand-cyan transition-colors">{sector.name}</h3>
                <span className="text-[10px] text-text-muted font-noto-devanagari">{sector.nameNepali}</span>
              </div>
              <div className="text-right">
                <div className={`font-jetbrains text-lg font-bold text-text-primary`}>
                  {sector.currentValue > 0 ? sector.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2}) : '—'}
                </div>
                <div className={`font-jetbrains text-xs font-bold ${getPriceColorClass(sector.changePercent)}`}>
                  {sector.changePercent > 0 ? '+' : ''}{formatPercent(sector.changePercent)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <span className="text-[10px] text-text-muted uppercase">Fundamentals</span>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[9px] text-text-muted">Avg P/E</div>
                    <div className="font-jetbrains text-xs font-bold text-text-primary">{sector.avgPE}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-muted">Avg EPS</div>
                    <div className="font-jetbrains text-xs font-bold text-text-primary">{sector.avgEPS}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-text-muted uppercase">Breadth</span>
                <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-bg-border mt-1">
                  <div className="h-full bg-bull-green" style={{ width: `${(sector.stocksUp / (sector.stockCount || 1)) * 100}%` }} title={`Advance: ${sector.stocksUp}`} />
                  <div className="h-full bg-text-muted/30" style={{ width: `${(sector.stocksUnchanged / (sector.stockCount || 1)) * 100}%` }} title={`Unchanged: ${sector.stocksUnchanged}`} />
                  <div className="h-full bg-bear-red" style={{ width: `${(sector.stocksDown / (sector.stockCount || 1)) * 100}%` }} title={`Decline: ${sector.stocksDown}`} />
                </div>
                <div className="flex justify-between text-[9px] font-bold">
                  <span className="text-bull-green">{sector.stocksUp}↑</span>
                  <span className="text-bear-red">{sector.stocksDown}↓</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-bg-border/30">
               <div>
                  <div className="text-[10px] text-text-muted uppercase">Turnover</div>
                  <div className="font-jetbrains text-xs font-bold">{formatNPR(sector.turnover, true)}</div>
               </div>
               <div>
                  <div className="text-[10px] text-text-muted uppercase">Volume</div>
                  <div className="font-jetbrains text-xs font-bold">{formatVolume(sector.volume)}</div>
               </div>
            </div>

            {sector.topGainer && (
              <div className="p-3 rounded-lg bg-bg-base/50 border border-bg-border/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-bull-green/10 flex items-center justify-center text-bull-green">
                    <TrendingUp size={14} />
                  </div>
                  <div>
                    <div className="text-[10px] text-text-muted leading-tight">Top Gainer</div>
                    <div className="text-xs font-bold text-text-primary">{sector.topGainer.symbol}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-jetbrains font-bold text-bull-green">+{formatPercent(sector.topGainer.changePercent)}</div>
                  <div className="text-[10px] text-text-muted">LTP: {sector.topGainer.ltp}</div>
                </div>
              </div>
            )}

            <button className="w-full mt-4 py-2 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:text-brand-cyan flex items-center justify-center gap-1.5 transition-colors">
              View All {sector.stockCount} Stocks <ArrowRight size={12} />
            </button>
          </motion.div>
        );
        })}
      </div>
    </div>
  );
}
