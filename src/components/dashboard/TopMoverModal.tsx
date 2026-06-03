import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Activity, Banknote } from 'lucide-react';
import { formatNPR, formatPercent, formatVolume, getPriceColorClass, formatNepaliNumber } from '../../utils';

interface TopMoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'gainer' | 'loser' | 'volume' | 'turnover' | null;
  data: any[];
}

export default function TopMoverModal({ isOpen, onClose, type, data }: TopMoverModalProps) {
  if (!isOpen || !type) return null;

  const title = type === 'gainer' ? 'Top Gainers' : type === 'loser' ? 'Top Losers' : type === 'volume' ? 'Most Active (Volume)' : 'Top Turnover';
  const Icon = type === 'gainer' ? TrendingUp : type === 'loser' ? TrendingDown : type === 'volume' ? Activity : Banknote;
  const colorClass = type === 'gainer' ? 'text-bull-green' : type === 'loser' ? 'text-bear-red' : type === 'volume' ? 'text-brand-cyan' : 'text-brand-gold';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] bg-bg-base border border-bg-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header matching BrokerProfileModal */}
            <div className="p-6 border-b border-bg-border bg-bg-surface flex justify-between items-start shrink-0">
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-1">Market Leaders</div>
                <h2 className="text-3xl font-syne font-bold flex items-center gap-3">
                  <Icon size={28} className={colorClass} /> {title}
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {data.map((stock: any, i: number) => {
                const rankBg = i === 0 ? 'bg-brand-gold text-bg-base' : i === 1 ? 'bg-text-secondary text-bg-base' : i === 2 ? 'bg-brand-violet text-white' : 'bg-bg-border text-text-muted';
                
                return (
                  <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-xl border border-bg-border/50 bg-bg-base/50 hover:bg-bg-elevated transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${rankBg}`}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-text-primary">{stock.symbol}</div>
                        <div className="text-xs text-text-muted">{stock.securityName || stock.companyName}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {type === 'volume' ? (
                        <div className="font-jetbrains text-sm font-bold text-text-primary">{formatVolume(stock.shareTraded || stock.totalTradeQuantity || 0)}</div>
                      ) : type === 'turnover' ? (
                        <div className="font-jetbrains text-sm font-bold text-text-primary">{formatNPR(stock.turnover || stock.totalTradeValue || 0, true)}</div>
                      ) : (
                        <>
                          <div className="font-jetbrains text-sm font-medium text-text-primary">Rs. {formatNepaliNumber(stock.ltp || stock.lastTradedPrice || 0)}</div>
                          <div className={`font-jetbrains text-xs font-bold ${getPriceColorClass(stock.percentageChange || 0)}`}>
                            {formatPercent(stock.percentageChange || 0)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {data.length === 0 && <div className="p-12 text-center text-text-muted">No data available</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
