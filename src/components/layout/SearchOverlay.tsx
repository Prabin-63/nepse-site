import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Activity } from 'lucide-react';
import { useUIStore } from '../../store';
import { useCompanyList } from '../../hooks/useNepseData';

export default function SearchOverlay() {
  const { searchOpen, toggleSearch } = useUIStore();
  const [query, setQuery] = useState('');
  const { data: companyList, isLoading } = useCompanyList();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      document.body.style.overflow = 'auto';
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        toggleSearch();
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSearch();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, toggleSearch]);

  const handleSelect = (symbol: string) => {
    toggleSearch();
    navigate(`/stock/${symbol}`);
  };

  const results = companyList 
    ? companyList.filter((c: any) => 
        (c.symbol || '').toLowerCase().includes(query.toLowerCase()) || 
        (c.companyName || '').toLowerCase().includes(query.toLowerCase()) ||
        (c.securityName || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 backdrop-blur-sm bg-black/60"
          onClick={toggleSearch}
        >
          <motion.div
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-bg-surface border border-bg-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-4 border-b border-bg-border/50">
              <Search className="text-brand-cyan shrink-0" size={24} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by symbol or company name... (e.g. NABIL)"
                className="flex-1 bg-transparent border-none outline-none px-4 text-lg text-text-primary placeholder:text-text-muted"
              />
              <button 
                onClick={toggleSearch}
                className="p-1 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoading && (
                <div className="p-8 text-center text-text-muted flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                  <span>Loading companies from NEPSE...</span>
                </div>
              )}
              
              {!isLoading && query && results.length === 0 && (
                <div className="p-8 text-center text-text-muted">
                  No companies found matching "{query}"
                </div>
              )}

              {!isLoading && results.map((c: any) => (
                <div
                  key={c.symbol || c.id}
                  onClick={() => handleSelect(c.symbol)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-elevated cursor-pointer transition-colors group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-syne font-bold text-text-primary group-hover:text-brand-cyan transition-colors">
                        {c.symbol}
                      </span>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-bg-base border border-bg-border text-text-secondary">
                        {c.sectorMaster?.sectorDescription || c.sectorName || 'Equity'}
                      </span>
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">{c.securityName || c.companyName}</div>
                  </div>
                  <Activity size={16} className="text-text-muted group-hover:text-brand-cyan transition-colors" />
                </div>
              ))}
              
              {!isLoading && !query && (
                <div className="p-8 text-center text-text-muted text-sm">
                  Start typing to search across all NEPSE listed companies.
                </div>
              )}
            </div>
            
            <div className="bg-bg-base border-t border-bg-border/50 px-4 py-2 flex items-center justify-between text-[10px] text-text-muted uppercase tracking-wider font-medium">
              <span>Pro Tip: Use <kbd className="px-1 py-0.5 rounded border border-bg-border bg-bg-surface font-jetbrains">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded border border-bg-border bg-bg-surface font-jetbrains">K</kbd></span>
              <span>NEPSE Live Search API</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
