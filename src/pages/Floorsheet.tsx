import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, RotateCw, AlertTriangle, Info } from 'lucide-react';
import { fetchFloorsheet } from '../services/api';
import { formatNepaliNumber, formatNPR, getNepalTime } from '../utils';

import { useFloorsheet } from '../hooks/useNepseData';

export default function Floorsheet() {
  const { data: rawData, isLoading, isError, refetch, isRefetching } = useFloorsheet();
  const data = rawData || [];
  
  const [search, setSearch] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [minQty, setMinQty] = useState('');

  const filtered = data.filter(item => {
    const symbolMatch = item.stockSymbol.toLowerCase().includes(search.toLowerCase());
    const brokerMatch = !brokerFilter || 
      item.buyerMemberId.toString() === brokerFilter || 
      item.sellerMemberId.toString() === brokerFilter;
    const qtyMatch = !minQty || item.contractQuantity >= parseInt(minQty);
    return symbolMatch && brokerMatch && qtyMatch;
  });

  const totals = filtered.reduce((acc, curr) => ({
    qty: acc.qty + curr.contractQuantity,
    amount: acc.amount + (curr.contractQuantity * curr.contractRate)
  }), { qty: 0, amount: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold">Floorsheet Analysis</h1>
          <p className="text-xs text-text-secondary">Trade-by-trade transaction history for today</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
            <Download size={14} /> Export CSV
          </button>
          <button 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="btn-primary py-1.5 px-3 flex items-center gap-2 text-xs"
          >
            <RotateCw size={14} className={isRefetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Analysis Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex flex-col justify-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Transactions</div>
          <div className="font-jetbrains text-xl font-bold text-text-primary">{filtered.length}</div>
        </div>
        <div className="card p-4 flex flex-col justify-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Quantity</div>
          <div className="font-jetbrains text-xl font-bold text-brand-cyan">{totals.qty.toLocaleString()}</div>
        </div>
        <div className="card p-4 flex flex-col justify-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Total Amount</div>
          <div className="font-jetbrains text-xl font-bold text-brand-gold">{formatNPR(totals.amount, true)}</div>
        </div>
        <div className="card p-4 flex flex-col justify-center bg-brand-violet/5 border-brand-violet/20">
          <div className="text-[10px] text-brand-violet uppercase tracking-wider font-bold mb-1">Bulk Deals ({'>'}500)</div>
          <div className="font-jetbrains text-xl font-bold text-text-primary">
            {filtered.filter(i => i.contractQuantity >= 500).length}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" placeholder="Filter by Symbol..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field w-full pl-9 text-sm" 
          />
        </div>
        <input 
          type="number" placeholder="Broker #..." value={brokerFilter} onChange={e => setBrokerFilter(e.target.value)}
          className="input-field text-sm w-32" 
        />
        <input 
          type="number" placeholder="Min Qty..." value={minQty} onChange={e => setMinQty(e.target.value)}
          className="input-field text-sm w-32" 
        />
        <div className="flex items-center gap-2 text-xs text-text-muted ml-auto bg-bg-base px-3 py-1.5 rounded-lg border border-bg-border">
          <Info size={14} className="text-brand-cyan" />
          <span>Real-time data from NEPSE</span>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-base">
              <tr>
                <th className="table-header">Trans #</th>
                <th className="table-header">Time</th>
                <th className="table-header">Symbol</th>
                <th className="table-header">Buyer</th>
                <th className="table-header">Seller</th>
                <th className="table-header text-right">Qty</th>
                <th className="table-header text-right">Rate</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.contractId} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors table-row-zebra">
                  <td className="table-cell font-jetbrains text-xs text-text-muted">#{item.contractId}</td>
                  <td className="table-cell font-jetbrains text-xs text-text-secondary">{item.contractTime}</td>
                  <td className="table-cell font-bold text-text-primary">{item.stockSymbol}</td>
                  <td className="table-cell font-jetbrains text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-bg-elevated text-brand-cyan border border-brand-cyan/20">{item.buyerMemberId}</span>
                  </td>
                  <td className="table-cell font-jetbrains text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-bg-elevated text-bear-red border border-bear-red/20">{item.sellerMemberId}</span>
                  </td>
                  <td className="table-cell text-right font-jetbrains font-medium">{item.contractQuantity.toLocaleString()}</td>
                  <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(item.contractRate)}</td>
                  <td className="table-cell text-right font-jetbrains text-text-primary">
                    {formatNepaliNumber(item.contractQuantity * item.contractRate)}
                  </td>
                  <td className="table-cell">
                    {item.contractQuantity >= 500 && (
                      <div className="flex justify-center" title="Bulk Transaction">
                        <AlertTriangle size={14} className="text-brand-gold" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !isLoading && !isError && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-text-muted">No transactions found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isLoading && (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-cyan border-t-transparent" />
            <p className="mt-4 text-text-muted text-sm">Fetching live floorsheet data... This may take up to a minute.</p>
          </div>
        )}
        {isError && (
          <div className="p-12 text-center text-bear-red">
            Failed to load floorsheet data.
          </div>
        )}
      </motion.div>
    </div>
  );
}
