import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useUIStore } from '../../store';
import { BrokerDetail } from './BrokerDetail';

export default function BrokerDetailModal() {
  const { selectedBrokerId, setSelectedBrokerId } = useUIStore();

  return (
    <AnimatePresence>
      {selectedBrokerId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md bg-black/40"
          onClick={() => setSelectedBrokerId(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-bg-surface border border-bg-border rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-bg-border/50 bg-bg-base/30 shrink-0">
              <span className="font-syne font-bold text-xs uppercase tracking-widest text-text-muted">Broker Intelligence Report</span>
              <button 
                onClick={() => setSelectedBrokerId(null)}
                className="p-2 rounded-full hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <BrokerDetail brokerId={selectedBrokerId} isModal />
            </div>

            <div className="bg-bg-base border-t border-bg-border/50 px-6 py-3 flex items-center justify-between text-[10px] text-text-muted uppercase tracking-wider font-medium shrink-0">
              <span>Data sourced from live floorsheet aggregation</span>
              <span className="text-brand-cyan">NEPSE Elite • Premium Analytics</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
