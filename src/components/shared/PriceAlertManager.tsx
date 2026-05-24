import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAlertStore } from '../../store/alertStore';
import { useCompanyList, useLiveTrading } from '../../hooks/useNepseData';
import { formatNepaliNumber } from '../../utils';

export default function PriceAlertManager({
  onClose,
  embedded = false,
}: {
  onClose: () => void;
  embedded?: boolean;
}) {
  const { alerts, addAlert, removeAlert, toggleAlert } = useAlertStore();
  const { data: companies } = useCompanyList();
  const { data: liveData } = useLiveTrading();

  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');

  const livePrices = useMemo(() => {
    const map = new Map();
    (liveData || []).forEach((s: any) => map.set(s.symbol, s.lastTradedPrice || s.ltp));
    return map;
  }, [liveData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !targetPrice || Number(targetPrice) <= 0) return;
    
    addAlert({
      symbol: symbol.toUpperCase(),
      condition,
      targetPrice: Number(targetPrice)
    });
    
    setSymbol('');
    setTargetPrice('');
  };

  return (
    <div className={embedded ? 'p-4' : 'w-80 sm:w-96 p-4'}>
      {!embedded && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-syne font-bold text-lg flex items-center gap-2">
            <Bell size={18} className="text-brand-gold" /> Price Alerts
          </h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-bear-red">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-6 space-y-3 bg-bg-base/50 p-3 rounded-lg border border-bg-border/50">
        <div className="text-xs font-bold text-text-secondary uppercase">Create New Alert</div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Symbol (e.g. NABIL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="input-field text-xs flex-1 uppercase"
            required
          />
        </div>
        <div className="flex gap-2">
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
            className="input-field text-xs w-24"
          >
            <option value="ABOVE">Goes Above</option>
            <option value="BELOW">Drops Below</option>
          </select>
          <input
            type="number"
            placeholder="Target Price"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="input-field text-xs flex-1"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full py-1.5 text-xs flex items-center justify-center gap-1.5">
          <Plus size={14} /> Add Alert
        </button>
      </form>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence>
          {alerts.length === 0 && (
            <div className="text-center py-6 text-text-muted text-xs italic border border-dashed border-bg-border/50 rounded-lg">
              No active price alerts.
            </div>
          )}
          {alerts.map(alert => {
            const currentPrice = livePrices.get(alert.symbol) || 0;
            const isTriggered = !alert.isActive;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isTriggered 
                    ? 'bg-bg-base/50 border-bg-border/30 opacity-60' 
                    : 'bg-bg-elevated border-bg-border'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text-primary text-sm">{alert.symbol}</span>
                    <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-base">
                      {alert.condition} {formatNepaliNumber(alert.targetPrice)}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                    {isTriggered ? (
                      <><CheckCircle2 size={10} className="text-bull-green"/> Triggered</>
                    ) : (
                      <>Current: Rs. {currentPrice > 0 ? formatNepaliNumber(currentPrice) : '---'}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isTriggered && (
                    <button 
                      onClick={() => toggleAlert(alert.id)}
                      className="p-1.5 text-text-muted hover:text-brand-gold transition-colors"
                      title={alert.isActive ? "Deactivate" : "Activate"}
                    >
                      {alert.isActive ? <Bell size={14} /> : <BellOff size={14} />}
                    </button>
                  )}
                  <button 
                    onClick={() => removeAlert(alert.id)}
                    className="p-1.5 text-text-muted hover:text-bear-red transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
