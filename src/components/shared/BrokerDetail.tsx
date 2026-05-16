import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNPR } from '../../utils';
import { useBrokerDetail } from '../../hooks/useNepseData';

interface BrokerDetailProps {
  brokerId: string;
  onBack?: () => void;
  isModal?: boolean;
}

export const BrokerDetail = ({ brokerId, onBack, isModal }: BrokerDetailProps) => {
  const { data: detail, isLoading } = useBrokerDetail(brokerId);
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    if (!detail?.stocks) return [];
    return detail.stocks.filter((s: any) => 
      s.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }, [detail, search]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
        <p className="text-text-secondary animate-pulse">Analyzing broker trade data...</p>
      </div>
    );
  }

  const broker = detail || {};
  const totalBuy = filteredData.reduce((acc: number, s: any) => acc + s.buyAmount, 0);
  const totalSell = filteredData.reduce((acc: number, s: any) => acc + s.sellAmount, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: isModal ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isModal ? 0 : -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-full hover:bg-bg-elevated transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h2 className="font-syne text-2xl font-bold flex items-center gap-2">
            {broker.broker_name} <span className="text-text-muted text-lg">#{broker.broker_id}</span>
          </h2>
          <p className="text-xs text-text-secondary">Specific stock-wise breakdown for the current session</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 bg-bull-green/5 border-bull-green/20">
          <div className="text-[10px] uppercase text-text-muted mb-1">Total Buy Value</div>
          <div className="text-lg font-jetbrains font-bold text-bull-green">{formatNPR(totalBuy, true)}</div>
        </div>
        <div className="card p-4 bg-bear-red/5 border-bear-red/20">
          <div className="text-[10px] uppercase text-text-muted mb-1">Total Sell Value</div>
          <div className="text-lg font-jetbrains font-bold text-bear-red">{formatNPR(totalSell, true)}</div>
        </div>
        <div className="card p-4 bg-brand-cyan/5 border-brand-cyan/20">
          <div className="text-[10px] uppercase text-text-muted mb-1">Net Flow</div>
          <div className={`text-lg font-jetbrains font-bold ${totalBuy - totalSell >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
            {totalBuy - totalSell >= 0 ? '+' : ''}{formatNPR(totalBuy - totalSell, true)}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-bg-border bg-bg-base/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-syne font-bold text-sm">Portfolio Breakdown</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" placeholder="Filter symbol..." value={search} onChange={e => setSearch(e.target.value)}
              className="input-field pl-8 py-1 text-xs w-full md:w-48" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-base/20">
                <th className="table-header">Symbol</th>
                <th className="table-header text-right">Buy Qty</th>
                <th className="table-header text-right">Buy Amount</th>
                <th className="table-header text-right">Sell Qty</th>
                <th className="table-header text-right">Sell Amount</th>
                <th className="table-header text-right">Net Flow</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((s: any) => {
                const net = s.buyAmount - s.sellAmount;
                return (
                  <tr key={s.symbol} className="border-b border-bg-border/30 hover:bg-bg-elevated/40 transition-colors">
                    <td className="table-cell font-bold text-brand-cyan">{s.symbol}</td>
                    <td className="table-cell text-right font-jetbrains">{s.buyQty.toLocaleString()}</td>
                    <td className="table-cell text-right font-jetbrains text-bull-green">{formatNPR(s.buyAmount, true)}</td>
                    <td className="table-cell text-right font-jetbrains">{s.sellQty.toLocaleString()}</td>
                    <td className="table-cell text-right font-jetbrains text-bear-red">{formatNPR(s.sellAmount, true)}</td>
                    <td className={`table-cell text-right font-jetbrains font-bold ${net >= 0 ? 'text-bull-green' : 'text-bear-red'}`}>
                      {net >= 0 ? '+' : ''}{formatNPR(net, true)}
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted italic">No trades found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
