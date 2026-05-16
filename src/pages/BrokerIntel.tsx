import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Search, TrendingUp, TrendingDown, Info, 
  BarChart2, Filter, ArrowLeft, ExternalLink, ChevronRight
} from 'lucide-react';
import { formatNPR, formatVolume, getPriceColorClass, formatPercent } from '../utils';
import { useBrokers } from '../hooks/useNepseData';
import { useUIStore } from '../store';
import { BrokerDetail } from '../components/shared/BrokerDetail';


export default function BrokerIntel() {
  const { data: brokers, isLoading } = useBrokers();
  const { selectedBrokerId, setSelectedBrokerId } = useUIStore();
  const [search, setSearch] = useState('');
  
  const filtered = useMemo(() => {
    if (!brokers) return [];
    return brokers.filter((b: any) => 
      b.name.toLowerCase().includes(search.toLowerCase()) || b.id.includes(search)
    );
  }, [brokers, search]);

  const topStats = useMemo(() => {
    if (!brokers || brokers.length === 0) return null;
    const sortedBuy = [...brokers].sort((a, b) => b.buyAmount - a.buyAmount)[0];
    const sortedSell = [...brokers].sort((a, b) => b.sellAmount - a.sellAmount)[0];
    const sortedVol = [...brokers].sort((a, b) => (b.buyQty + b.sellQty) - (a.buyQty + a.sellQty))[0];
    return { topBuy: sortedBuy, topSell: sortedSell, topVol: sortedVol };
  }, [brokers]);

  if (selectedBrokerId) {
    return <div className="p-1"><BrokerDetail brokerId={selectedBrokerId} onBack={() => setSelectedBrokerId(null)} /></div>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
        <p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">Gathering intelligence from floorsheet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold">Broker Intelligence</h1>
          <p className="text-xs text-text-secondary">Tracking market makers and top player activity</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" placeholder="Search broker name or #..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm w-full md:w-64" 
            />
          </div>
          <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      {/* Top 3 Stats */}
      {topStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 border-b-4 border-bull-green bg-gradient-to-br from-bg-surface to-bull-green/5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Top Buying Broker</div>
              <TrendingUp size={16} className="text-bull-green" />
            </div>
            <div className="text-xl font-syne font-bold text-text-primary">{topStats.topBuy.name} (#{topStats.topBuy.id})</div>
            <div className="font-jetbrains text-lg text-bull-green mt-1">{formatNPR(topStats.topBuy.buyAmount, true)}</div>
          </div>
          <div className="card p-6 border-b-4 border-bear-red bg-gradient-to-br from-bg-surface to-bear-red/5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Top Selling Broker</div>
              <TrendingDown size={16} className="text-bear-red" />
            </div>
            <div className="text-xl font-syne font-bold text-text-primary">{topStats.topSell.name} (#{topStats.topSell.id})</div>
            <div className="font-jetbrains text-lg text-bear-red mt-1">{formatNPR(topStats.topSell.sellAmount, true)}</div>
          </div>
          <div className="card p-6 border-b-4 border-brand-cyan bg-gradient-to-br from-bg-surface to-brand-cyan/5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Highest Volume Broker</div>
              <BarChart2 size={16} className="text-brand-cyan" />
            </div>
            <div className="text-xl font-syne font-bold text-text-primary">{topStats.topVol.name} (#{topStats.topVol.id})</div>
            <div className="font-jetbrains text-lg text-brand-cyan mt-1">{formatVolume(topStats.topVol.buyQty + topStats.topVol.sellQty)} shares</div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-bg-border bg-bg-base/30 flex items-center justify-between">
          <h2 className="font-syne font-bold text-sm">Broker Performance Rankings</h2>
          <div className="hidden md:flex text-[10px] text-text-muted items-center gap-1">
            <Info size={12} /> Click on a broker to see their specific stock-wise breakdown
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-base/20">
                <th className="table-header">#</th>
                <th className="table-header">Broker Name</th>
                <th className="table-header text-right">Buy Amount</th>
                <th className="table-header text-right">Sell Amount</th>
                <th className="table-header text-right">Net Flow</th>
                <th className="table-header">Top Buy</th>
                <th className="table-header">Top Sell</th>
                <th className="table-header text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b: any) => {
                const netFlow = b.buyAmount - b.sellAmount;
                return (
                  <tr 
                    key={b.id} 
                    onClick={() => setSelectedBrokerId(b.id)}
                    className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra group"
                  >
                    <td className="table-cell font-jetbrains text-xs text-text-muted">{b.id}</td>
                    <td className="table-cell font-bold text-text-primary group-hover:text-brand-cyan transition-colors">{b.name}</td>
                    <td className="table-cell text-right font-jetbrains text-bull-green">{formatNPR(b.buyAmount, true)}</td>
                    <td className="table-cell text-right font-jetbrains text-bear-red">{formatNPR(b.sellAmount, true)}</td>
                    <td className={`table-cell text-right font-jetbrains font-bold ${netFlow >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                      {netFlow >= 0 ? '+' : ''}{formatNPR(netFlow, true)}
                    </td>
                    <td className="table-cell">
                      <span className="badge-cyan text-[10px]">{b.topBuy || 'N/A'}</span>
                    </td>
                    <td className="table-cell">
                      <span className="badge-red text-[10px]">{b.topSell || 'N/A'}</span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end">
                        <div className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted group-hover:bg-brand-cyan group-hover:text-bg-base transition-all">
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
