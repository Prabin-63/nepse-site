import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { nepseApi } from "@/lib/api";
import { useMemo } from "react";

function useIsMarketOpen(): boolean {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const npt = new Date(utcMs + 5.75 * 3600000);
  const day = npt.getDay();
  if (day === 5 || day === 6) return false;
  const mins = npt.getHours() * 60 + npt.getMinutes();
  return mins >= 595 && mins < 910; // 9:55 AM to 3:10 PM NPT (slight buffer)
}

const FAST = 10 * 1000;        // 10s — live market data
const MEDIUM = 30 * 1000;      // 30s
const SLOW = 60 * 1000;        // 1min (off-hours)
const STATIC = 30 * 60 * 1000; // 30min (rarely changes)

function useLiveInterval() {
  const open = useIsMarketOpen();
  return useMemo(() => ({
    fast: open ? FAST : SLOW,
    medium: open ? MEDIUM : SLOW,
    stale: open ? FAST : SLOW,
    staleMed: open ? MEDIUM : SLOW,
  }), [open]);
}

export const useDashboard = () => {
  const { fast, stale } = useLiveInterval();
  // Dashboard is heavy, keep stale slightly longer to avoid unneeded refetches
  return useQuery({ queryKey: ["dashboard"], queryFn: nepseApi.getDashboard, staleTime: stale * 1.5, refetchInterval: fast, refetchOnWindowFocus: false, placeholderData: keepPreviousData });
};

export const useLiveTrading = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["live-trading"], queryFn: nepseApi.getLiveTrading, staleTime: stale, refetchInterval: fast, refetchOnWindowFocus: false, placeholderData: keepPreviousData });
};

export const useTopGainers = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-gainers"], queryFn: nepseApi.getTopGainers, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export const useTopLosers = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-losers"], queryFn: nepseApi.getTopLosers, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export const useTopTurnover = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-turnover"], queryFn: nepseApi.getTopTurnover, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export const useTopVolume = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["top-volume"], queryFn: nepseApi.getTopVolume, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export const useMarketStatus = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["market-status"], queryFn: nepseApi.getMarketStatus, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export const useMarketSummary = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["market-summary"], queryFn: nepseApi.getMarketSummary, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export const useNepseIndex = () => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["nepse-index"], queryFn: nepseApi.getNepseIndex, staleTime: stale, refetchInterval: fast, placeholderData: keepPreviousData });
};

export function useSectorIndices() {
  return useQuery({
    queryKey: ['sector-indices'],
    queryFn: () => nepseApi.getSectorIndices(),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useSectorHistory(sector: string) {
  const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  return useQuery({
    queryKey: ['sector-history', sector],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/indices/sector-history/${encodeURIComponent(sector)}`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export const useCompanyList = () =>
  useQuery({ queryKey: ["company-list"], queryFn: nepseApi.getCompanyList, staleTime: STATIC, placeholderData: keepPreviousData });

export const useStockPrice = (symbol: string) => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["stock-price", symbol], queryFn: () => nepseApi.getStockPrice(symbol), staleTime: stale, refetchInterval: fast, enabled: !!symbol, placeholderData: keepPreviousData });
};

export const useStockDetail = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["stock-detail", symbol], queryFn: () => nepseApi.getStockDetail(symbol), staleTime: staleMed, refetchInterval: medium, enabled: !!symbol, placeholderData: keepPreviousData });
};

export const useStockDepth = (symbol: string) => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["stock-depth", symbol], queryFn: () => nepseApi.getStockDepth(symbol), staleTime: stale, refetchInterval: fast, enabled: !!symbol, placeholderData: keepPreviousData });
};

export const useStockBrokers = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({
    queryKey: ["stock-brokers", symbol],
    queryFn: () => nepseApi.getStockBrokers(symbol),
    staleTime: staleMed,
    refetchInterval: medium,
    enabled: !!symbol,
    placeholderData: keepPreviousData,
  });
};

export const useScreener = (params: any) => {
  const { medium, staleMed } = useLiveInterval();
  const queryString = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => queryString.append(key, v));
      } else {
        queryString.append(key, String(value));
      }
    }
  });
  return useQuery({ 
    queryKey: ["screener", params], 
    queryFn: () => nepseApi.getScreener(queryString.toString()), 
    staleTime: staleMed, 
    refetchInterval: medium,
    placeholderData: keepPreviousData 
  });
};

export const useStockChart = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["stock-chart", symbol], queryFn: () => nepseApi.getStockChart(symbol), staleTime: staleMed, refetchInterval: medium, enabled: !!symbol, placeholderData: keepPreviousData });
};

export const useStockDailyChart = (symbol: string) => {
  const { fast, stale } = useLiveInterval();
  return useQuery({ queryKey: ["stock-chart-daily", symbol], queryFn: () => nepseApi.getStockDailyChart(symbol), staleTime: stale, refetchInterval: fast, enabled: !!symbol, placeholderData: keepPreviousData });
};

export const useFloorsheet = () => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["floorsheet"], queryFn: nepseApi.getFloorsheet, staleTime: staleMed * 2, refetchInterval: medium, refetchOnWindowFocus: false, placeholderData: keepPreviousData });
};

export const useCompanyFloorsheet = (symbol: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["floorsheet", symbol], queryFn: () => nepseApi.getCompanyFloorsheet(symbol), staleTime: staleMed, refetchInterval: medium, enabled: !!symbol, placeholderData: keepPreviousData });
};

export const useNews = () => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["news"], queryFn: nepseApi.getNews, staleTime: staleMed, refetchInterval: medium, placeholderData: keepPreviousData });
};

export const useIpo = () => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["ipos"], queryFn: nepseApi.getIpos, staleTime: staleMed, refetchInterval: medium, placeholderData: keepPreviousData });
};

export const useBrokers = () =>
  useQuery({ queryKey: ["brokers"], queryFn: nepseApi.getBrokers, staleTime: STATIC, placeholderData: keepPreviousData });

export const useBrokerDetail = (id: string) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({ queryKey: ["broker-detail", id], queryFn: () => nepseApi.getBrokerDetail(id), staleTime: staleMed, refetchInterval: medium, enabled: !!id, placeholderData: keepPreviousData });
};

export interface BrokerAnalysisFilters {
  period: string;
  from?: string;
  to?: string;
}

export const useBrokerBreakdown = (filters: BrokerAnalysisFilters, top = 10) => {
  const { fast, stale } = useLiveInterval();
  return useQuery({
    queryKey: ["broker-breakdown", filters.period, filters.from, filters.to, top],
    queryFn: () => nepseApi.getBrokerBreakdown({ ...filters, top }),
    staleTime: stale,
    refetchInterval: fast,
    placeholderData: keepPreviousData,
  });
};

export const useBrokerTradedStock = (symbol: string, filters: BrokerAnalysisFilters) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({
    queryKey: ["broker-traded-stock", symbol, filters.period, filters.from, filters.to],
    queryFn: () => nepseApi.getBrokerTradedStock(symbol, filters),
    staleTime: staleMed,
    refetchInterval: medium,
    enabled: !!symbol,
    placeholderData: keepPreviousData,
  });
};

export const useBrokerHoldings = (symbol: string, filters: BrokerAnalysisFilters) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({
    queryKey: ["broker-holdings", symbol, filters.period, filters.from, filters.to],
    queryFn: () => nepseApi.getBrokerHoldings(symbol, { ...filters, top: 15 }),
    staleTime: staleMed,
    refetchInterval: medium,
    enabled: !!symbol,
    placeholderData: keepPreviousData,
  });
};

export const useAccumulationDistribution = (
  filters: BrokerAnalysisFilters,
  type: "accumulation" | "distribution" | "both" = "both",
  limit = 20,
) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({
    queryKey: ["accumulation-distribution", type, limit, filters.period, filters.from, filters.to],
    queryFn: () => nepseApi.getAccumulationDistribution({ ...filters, type, limit }),
    staleTime: staleMed,
    refetchInterval: medium,
    placeholderData: keepPreviousData,
  });
};

export const useBrokerProfile = (id: string, filters: BrokerAnalysisFilters) => {
  const { medium, staleMed } = useLiveInterval();
  return useQuery({
    queryKey: ["broker-profile", id, filters.period, filters.from, filters.to],
    queryFn: () => nepseApi.getBrokerProfile(id, filters),
    staleTime: staleMed,
    refetchInterval: medium,
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
};
