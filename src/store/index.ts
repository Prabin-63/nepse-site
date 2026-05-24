import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Watchlist, Alert, PortfolioHolding, Transaction } from '../types';
interface MarketState {
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_OPEN';
  nepseIndex: { value: number; change: number; changePercent: number };
  sensitiveIndex: { value: number; change: number; changePercent: number };
  floatIndex: { value: number; change: number; changePercent: number };
  totalTurnover: number;
  totalTradedShares: number;
  totalTransactions: number;
  totalScripsTraded: number;
  advancing: number;
  declining: number;
  unchanged: number;
  stocks: any[];
  lastUpdated: string;
  setMarketStatus: (status: 'OPEN' | 'CLOSED' | 'PRE_OPEN') => void;
  setIndices: (data: any) => void;
  setStocks: (stocks: any[]) => void;
  setMarketStats: (stats: any) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  marketStatus: 'CLOSED',
  nepseIndex: { value: 0, change: 0, changePercent: 0 },
  sensitiveIndex: { value: 0, change: 0, changePercent: 0 },
  floatIndex: { value: 0, change: 0, changePercent: 0 },
  totalTurnover: 0,
  totalTradedShares: 0,
  totalTransactions: 0,
  totalScripsTraded: 0,
  advancing: 0,
  declining: 0,
  unchanged: 0,
  stocks: [],
  lastUpdated: new Date().toISOString(),
  setMarketStatus: (status) => set({ marketStatus: status }),
  setIndices: (data) => set({
    nepseIndex: data.nepse || { value: 0, change: 0, changePercent: 0 },
    sensitiveIndex: data.sensitive || { value: 0, change: 0, changePercent: 0 },
    floatIndex: data.float || { value: 0, change: 0, changePercent: 0 },
  }),
  setStocks: (stocks) => set({ stocks, lastUpdated: new Date().toISOString() }),
  setMarketStats: (stats) => set({
    totalTurnover: stats.totalTurnover || 0,
    totalTradedShares: stats.totalTradedShares || 0,
    totalTransactions: stats.totalTransactions || 0,
    advancing: stats.advancing || 0,
    declining: stats.declining || 0,
    unchanged: stats.unchanged || 0,
  }),
}));
interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  addWatchlist: (name: string) => void;
  removeWatchlist: (id: string) => void;
  addToWatchlist: (watchlistId: string, symbol: string, price: number) => void;
  removeFromWatchlist: (watchlistId: string, symbol: string) => void;
  setActiveWatchlist: (id: string) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlists: [
        {
          id: 'default',
          name: 'My Watchlist',
          items: [],
        },
      ],
      activeWatchlistId: 'default',
      addWatchlist: (name) => set((s) => ({
        watchlists: [...s.watchlists, { id: Date.now().toString(), name, items: [] }],
      })),
      removeWatchlist: (id) => set((s) => ({
        watchlists: s.watchlists.filter((w) => w.id !== id),
      })),
      addToWatchlist: (watchlistId, symbol, price) => set((s) => ({
        watchlists: s.watchlists.map((w) =>
          w.id === watchlistId
            ? { ...w, items: [...w.items, { symbol, dateAdded: new Date().toISOString(), priceWhenAdded: price }] }
            : w
        ),
      })),
      removeFromWatchlist: (watchlistId, symbol) => set((s) => ({
        watchlists: s.watchlists.map((w) =>
          w.id === watchlistId
            ? { ...w, items: w.items.filter((i) => i.symbol !== symbol) }
            : w
        ),
      })),
      setActiveWatchlist: (id) => set({ activeWatchlistId: id }),
    }),
    { name: 'nepse-watchlists' }
  )
);

export interface PortfolioTransaction {
  id: string;
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'BONUS' | 'DIVIDEND';
  qty: number;
  rate: number;
  fees: number;
}

interface PortfolioEntry {
  id: string;
  name: string;
  holdings: PortfolioHolding[];
  transactions: PortfolioTransaction[];
}

interface PortfolioState {
  portfolios: PortfolioEntry[];
  activePortfolioId: string | null;
  addPortfolio: (name: string) => void;
  removePortfolio: (id: string) => void;
  setActivePortfolio: (id: string) => void;
  addTransaction: (portfolioId: string, tx: Omit<PortfolioTransaction, 'id'>) => void;
  removeTransaction: (portfolioId: string, txId: string) => void;
  removeHolding: (portfolioId: string, symbol: string) => void;
}

function rebuildHoldings(transactions: PortfolioTransaction[]): PortfolioHolding[] {
  const map = new Map<string, { qty: number; totalCost: number }>();

  for (const tx of transactions) {
    const existing = map.get(tx.symbol) || { qty: 0, totalCost: 0 };

    if (tx.type === 'BUY') {
      existing.totalCost += tx.qty * tx.rate + tx.fees;
      existing.qty += tx.qty;
    } else if (tx.type === 'SELL') {
      if (existing.qty > 0) {
        const avgCost = existing.totalCost / existing.qty;
        const soldQty = Math.min(tx.qty, existing.qty);
        existing.totalCost -= avgCost * soldQty;
        existing.qty -= soldQty;
      }
    } else if (tx.type === 'BONUS') {
      existing.qty += tx.qty;
    }

    map.set(tx.symbol, existing);
  }

  const holdings: PortfolioHolding[] = [];
  map.forEach(({ qty, totalCost }, symbol) => {
    if (qty <= 0) return;
    const avgPrice = totalCost / qty;
    holdings.push({
      symbol,
      companyName: '',
      sector: '',
      quantity: qty,
      avgPurchasePrice: avgPrice,
      currentLTP: 0,
      marketValue: 0,
      investedAmount: totalCost,
      gainLoss: 0,
      gainLossPercent: 0,
      weight: 0,
    });
  });

  return holdings;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      portfolios: [
        {
          id: 'default',
          name: 'My Portfolio',
          holdings: [],
          transactions: [],
        },
      ],
      activePortfolioId: 'default',
      addPortfolio: (name) => set((s) => ({
        portfolios: [...s.portfolios, { id: Date.now().toString(), name, holdings: [], transactions: [] }],
      })),
      removePortfolio: (id) => set((s) => ({
        portfolios: s.portfolios.filter((p) => p.id !== id),
        activePortfolioId: s.activePortfolioId === id ? (s.portfolios[0]?.id || null) : s.activePortfolioId,
      })),
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
      addTransaction: (portfolioId, tx) => set((s) => ({
        portfolios: s.portfolios.map((p) => {
          if (p.id !== portfolioId) return p;
          const newTx: PortfolioTransaction = { ...tx, id: Date.now().toString() + Math.random().toString(36).slice(2) };
          const transactions = [...p.transactions, newTx];
          return { ...p, transactions, holdings: rebuildHoldings(transactions) };
        }),
      })),
      removeTransaction: (portfolioId, txId) => set((s) => ({
        portfolios: s.portfolios.map((p) => {
          if (p.id !== portfolioId) return p;
          const transactions = p.transactions.filter((t) => t.id !== txId);
          return { ...p, transactions, holdings: rebuildHoldings(transactions) };
        }),
      })),
      removeHolding: (portfolioId, symbol) => set((s) => ({
        portfolios: s.portfolios.map((p) => {
          if (p.id !== portfolioId) return p;
          const transactions = p.transactions.filter((t) => t.symbol !== symbol);
          return { ...p, transactions, holdings: rebuildHoldings(transactions) };
        }),
      })),
    }),
    { name: 'nepse-portfolios' }
  )
);
interface AlertState {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'triggered' | 'active' | 'createdAt'>) => void;
  removeAlert: (id: string) => void;
  toggleAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: [],
      addAlert: (alert) => set((s) => ({
        alerts: [...s.alerts, {
          ...alert,
          id: Date.now().toString(),
          triggered: false,
          active: true,
          createdAt: new Date().toISOString(),
        }],
      })),
      removeAlert: (id) => set((s) => ({
        alerts: s.alerts.filter((a) => a.id !== id),
      })),
      toggleAlert: (id) => set((s) => ({
        alerts: s.alerts.map((a) => a.id === id ? { ...a, active: !a.active } : a),
      })),
    }),
    { name: 'nepse-alerts' }
  )
);
interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  compactMode: boolean;
  calendarMode: 'BS' | 'AD' | 'both';
  numberFormat: 'nepali' | 'international';
  selectedBrokerId: string | null;
  displayName: string;
  setDisplayName: (name: string) => void;
  toggleSidebar: () => void;
  toggleSearch: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  setCompactMode: (isCompact: boolean) => void;
  setCalendarMode: (mode: 'BS' | 'AD' | 'both') => void;
  setNumberFormat: (format: 'nepali' | 'international') => void;
  setSelectedBrokerId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      searchOpen: false,
      theme: 'system',
      accentColor: '#00D4FF',
      compactMode: false,
      calendarMode: 'BS',
      numberFormat: 'nepali',
      selectedBrokerId: null,
      displayName: 'Guest User',
      setDisplayName: (displayName) => set({ displayName }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setCalendarMode: (calendarMode) => set({ calendarMode }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
      setSelectedBrokerId: (selectedBrokerId) => set({ selectedBrokerId }),
    }),
    { name: 'nepse-ui' }
  )
);
