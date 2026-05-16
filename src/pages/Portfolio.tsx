import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Plus, TrendingUp, TrendingDown, PieChart, History, 
  Trash2, Edit3, ArrowUpRight, ArrowDownRight, Banknote, Wallet
} from 'lucide-react';
import { usePortfolioStore } from '../store';
import { formatNPR, formatPercent, getPriceColorClass, formatNepaliNumber } from '../utils';

export default function Portfolio() {
  const { portfolios, activePortfolioId, addPortfolio, setActivePortfolio } = usePortfolioStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'holdings' | 'history' | 'analysis'>('holdings');

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  // Calculate totals
  const stats = useMemo(() => {
    let totalInvested = 0;
    let totalValue = 0;
    
    // Mock prices for calculation
    const mockPrices: Record<string, number> = {
      'NABIL': 1285,
      'NICA': 848,
      'NHPC': 598,
      'UPPER': 365,
    };

    activePortfolio.holdings.forEach(h => {
      const currentPrice = mockPrices[h.symbol] || h.avgPurchasePrice;
      totalInvested += h.quantity * h.avgPurchasePrice;
      totalValue += h.quantity * currentPrice;
    });

    const totalProfit = totalValue - totalInvested;
    const profitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return { totalInvested, totalValue, totalProfit, profitPct };
  }, [activePortfolio]);

  return (
    <div className="space-y-6">
      {/* Header & Portfolio Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 flex items-center justify-center text-brand-cyan">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">My Portfolio</h1>
            <div className="flex items-center gap-2 mt-1">
              <select 
                value={activePortfolioId || ''} 
                onChange={(e) => setActivePortfolio(e.target.value)}
                className="bg-transparent border-none text-xs text-text-secondary font-bold focus:ring-0 cursor-pointer p-0 pr-6"
              >
                {portfolios.map(p => <option key={p.id} value={p.id} className="bg-bg-surface">{p.name}</option>)}
              </select>
              <button onClick={() => setIsAddModalOpen(true)} className="text-text-muted hover:text-brand-cyan transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-brand-cyan">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Wallet size={12} /> Total Value
          </div>
          <div className="font-jetbrains text-2xl font-bold text-text-primary">{formatNPR(stats.totalValue)}</div>
          <div className="text-[10px] text-text-secondary mt-1">Invested: {formatNPR(stats.totalInvested)}</div>
        </div>
        <div className="card p-5 border-l-4 border-bull-green">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp size={12} className="text-bull-green" /> Total Profit/Loss
          </div>
          <div className={`font-jetbrains text-2xl font-bold ${getPriceColorClass(stats.totalProfit)}`}>
            {stats.totalProfit >= 0 ? '+' : ''}{formatNPR(stats.totalProfit)}
          </div>
          <div className={`font-jetbrains text-xs font-bold ${getPriceColorClass(stats.profitPct)} mt-1`}>
            {stats.profitPct >= 0 ? '↑' : '↓'} {formatPercent(stats.profitPct)}
          </div>
        </div>
        <div className="card p-5 border-l-4 border-brand-gold">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <Banknote size={12} className="text-brand-gold" /> Daily Change
          </div>
          <div className="font-jetbrains text-2xl font-bold text-bull-green">+Rs. 12,450</div>
          <div className="text-xs text-bull-green font-bold mt-1">↑ 1.25%</div>
        </div>
        <div className="card p-5 border-l-4 border-brand-violet">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
            <PieChart size={12} className="text-brand-violet" /> Cash Balance
          </div>
          <div className="font-jetbrains text-2xl font-bold text-text-primary">Rs. 45,000</div>
          <div className="text-[10px] text-text-secondary mt-1">4.5% of total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b border-bg-border/50 px-2">
          {[
            { id: 'holdings', label: 'Holdings', icon: Briefcase },
            { id: 'history', label: 'History', icon: History },
            { id: 'analysis', label: 'Analysis', icon: PieChart },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-medium relative transition-colors
                ${activeView === tab.id ? 'text-brand-cyan' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeView === tab.id && (
                <motion.div layoutId="portTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan shadow-glow-cyan" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="card overflow-hidden"
          >
            {activeView === 'holdings' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-base/30">
                    <tr>
                      <th className="table-header">Symbol</th>
                      <th className="table-header text-right">Qty</th>
                      <th className="table-header text-right">Avg Buy</th>
                      <th className="table-header text-right">LTP</th>
                      <th className="table-header text-right">Cost</th>
                      <th className="table-header text-right">Current Value</th>
                      <th className="table-header text-right">P/L</th>
                      <th className="table-header text-right">P/L %</th>
                      <th className="table-header text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePortfolio.holdings.length > 0 ? activePortfolio.holdings.map((h) => {
                      const ltp = 1200; // Mock LTP
                      const cost = h.quantity * h.avgPurchasePrice;
                      const value = h.quantity * ltp;
                      const pl = value - cost;
                      const plPct = (pl / cost) * 100;
                      
                      return (
                        <tr key={h.symbol} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors">
                          <td className="table-cell">
                            <div className="font-bold text-text-primary">{h.symbol}</div>
                          </td>
                          <td className="table-cell text-right font-jetbrains">{h.quantity}</td>
                          <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(h.avgPurchasePrice)}</td>
                          <td className="table-cell text-right font-jetbrains font-medium">{formatNepaliNumber(ltp)}</td>
                          <td className="table-cell text-right font-jetbrains text-text-secondary">{formatNepaliNumber(cost)}</td>
                          <td className="table-cell text-right font-jetbrains text-text-primary">{formatNepaliNumber(value)}</td>
                          <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(pl)}`}>
                            {pl >= 0 ? '+' : ''}{formatNepaliNumber(pl)}
                          </td>
                          <td className={`table-cell text-right font-jetbrains font-bold ${getPriceColorClass(plPct)}`}>
                            {plPct >= 0 ? '↑' : '↓'} {formatPercent(plPct)}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-brand-cyan transition-colors">
                                <Edit3 size={14} />
                              </button>
                              <button className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-muted hover:text-bear-red transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={9} className="p-20 text-center text-text-muted">
                          <div className="flex flex-col items-center gap-3">
                            <Plus size={40} className="opacity-20" />
                            <p>No holdings found in this portfolio.</p>
                            <button className="btn-primary py-2 px-6 mt-2 text-xs">Add Your First Transaction</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {activeView === 'history' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-base/30">
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Symbol</th>
                      <th className="table-header text-right">Qty</th>
                      <th className="table-header text-right">Rate</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-right">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: '2082-01-15', type: 'BUY', symbol: 'NABIL', qty: 50, rate: 1180, fees: 310 },
                      { date: '2082-01-22', type: 'BUY', symbol: 'NICA', qty: 100, rate: 820, fees: 420 },
                      { date: '2082-02-03', type: 'SELL', symbol: 'NABIL', qty: 20, rate: 1260, fees: 280 },
                      { date: '2082-02-10', type: 'BUY', symbol: 'NHPC', qty: 200, rate: 580, fees: 580 },
                      { date: '2082-02-20', type: 'BONUS', symbol: 'NICA', qty: 10, rate: 0, fees: 0 },
                    ].map((t, i) => (
                      <tr key={i} className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors">
                        <td className="table-cell font-jetbrains text-xs">{t.date}</td>
                        <td className="table-cell">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            t.type === 'BUY' ? 'bg-bull-green/10 text-bull-green' :
                            t.type === 'SELL' ? 'bg-bear-red/10 text-bear-red' : 'bg-brand-gold/10 text-brand-gold'
                          }`}>{t.type}</span>
                        </td>
                        <td className="table-cell font-bold">{t.symbol}</td>
                        <td className="table-cell text-right font-jetbrains">{t.qty}</td>
                        <td className="table-cell text-right font-jetbrains">{t.rate > 0 ? formatNepaliNumber(t.rate) : '—'}</td>
                        <td className="table-cell text-right font-jetbrains text-text-primary">{t.rate > 0 ? formatNepaliNumber(t.qty * t.rate) : '—'}</td>
                        <td className="table-cell text-right font-jetbrains text-bear-red">{t.fees > 0 ? formatNepaliNumber(t.fees) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {activeView === 'analysis' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Best Performer', symbol: 'NABIL', gain: '+12.4%', color: 'text-bull-green' },
                    { label: 'Worst Performer', symbol: 'UPPER', gain: '-5.2%', color: 'text-bear-red' },
                    { label: 'Most Traded', symbol: 'NICA', gain: '8 trades', color: 'text-brand-cyan' },
                  ].map((item, i) => (
                    <div key={i} className="card p-5 text-center">
                      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{item.label}</div>
                      <div className="font-syne text-2xl font-black text-text-primary">{item.symbol}</div>
                      <div className={`font-jetbrains font-bold mt-1 ${item.color}`}>{item.gain}</div>
                    </div>
                  ))}
                </div>
                <div className="card p-5">
                  <h4 className="font-syne font-bold mb-4 text-sm">Sector Allocation</h4>
                  <div className="space-y-3">
                    {[
                      { sector: 'Commercial Banks', pct: 55, color: 'bg-brand-cyan' },
                      { sector: 'Hydropower', pct: 28, color: 'bg-bull-green' },
                      { sector: 'Insurance', pct: 12, color: 'bg-brand-gold' },
                      { sector: 'Others', pct: 5, color: 'bg-brand-violet' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-sm text-text-secondary w-40 shrink-0">{s.sector}</span>
                        <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                        </div>
                        <span className="font-jetbrains text-xs font-bold text-text-primary w-10 text-right">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
