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
  nepseIndex: { value: 2785.42, change: 12.35, changePercent: 0.45 },
  sensitiveIndex: { value: 509.67, change: 2.14, changePercent: 0.42 },
  floatIndex: { value: 194.32, change: 0.89, changePercent: 0.46 },
  totalTurnover: 4523000000,
  totalTradedShares: 8945623,
  totalTransactions: 42567,
  totalScripsTraded: 234,
  advancing: 134,
  declining: 87,
  unchanged: 13,
  stocks: [],
  lastUpdated: new Date().toISOString(),
  setMarketStatus: (status) => set({ marketStatus: status }),
  setIndices: (data) => set({
    nepseIndex: data.nepse || { value: 2785.42, change: 12.35, changePercent: 0.45 },
    sensitiveIndex: data.sensitive || { value: 509.67, change: 2.14, changePercent: 0.42 },
    floatIndex: data.float || { value: 194.32, change: 0.89, changePercent: 0.46 },
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
          items: [
            { symbol: 'NABIL', dateAdded: new Date().toISOString(), priceWhenAdded: 1250 },
            { symbol: 'NICA', dateAdded: new Date().toISOString(), priceWhenAdded: 845 },
            { symbol: 'NHPC', dateAdded: new Date().toISOString(), priceWhenAdded: 598 },
            { symbol: 'NLIC', dateAdded: new Date().toISOString(), priceWhenAdded: 1450 },
            { symbol: 'SBL', dateAdded: new Date().toISOString(), priceWhenAdded: 310 },
          ],
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
interface PortfolioState {
  portfolios: {
    id: string;
    name: string;
    holdings: PortfolioHolding[];
    transactions: Transaction[];
  }[];
  activePortfolioId: string | null;
  addPortfolio: (name: string) => void;
  setActivePortfolio: (id: string) => void;
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
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
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
