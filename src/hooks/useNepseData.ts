import { useQuery } from "@tanstack/react-query";
import { nepseApi } from "@/lib/api";

// Refetch live data every 60 seconds during market hours
const LIVE_STALE = 60 * 1000;
const SLOW_STALE = 5 * 60 * 1000;
const STATIC_STALE = 60 * 60 * 1000;

export const useDashboard = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: nepseApi.getDashboard, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useLiveTrading = () =>
  useQuery({ queryKey: ["live-trading"], queryFn: nepseApi.getLiveTrading, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useTopGainers = () =>
  useQuery({ queryKey: ["top-gainers"], queryFn: nepseApi.getTopGainers, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useTopLosers = () =>
  useQuery({ queryKey: ["top-losers"], queryFn: nepseApi.getTopLosers, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useTopTurnover = () =>
  useQuery({ queryKey: ["top-turnover"], queryFn: nepseApi.getTopTurnover, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useTopVolume = () =>
  useQuery({ queryKey: ["top-volume"], queryFn: nepseApi.getTopVolume, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useMarketStatus = () =>
  useQuery({ queryKey: ["market-status"], queryFn: nepseApi.getMarketStatus, staleTime: 30 * 1000, refetchInterval: 30 * 1000 });

export const useMarketSummary = () =>
  useQuery({ queryKey: ["market-summary"], queryFn: nepseApi.getMarketSummary, staleTime: LIVE_STALE });

export const useNepseIndex = () =>
  useQuery({ queryKey: ["nepse-index"], queryFn: nepseApi.getNepseIndex, staleTime: LIVE_STALE, refetchInterval: LIVE_STALE });

export const useSectorIndices = () =>
  useQuery({ queryKey: ["sector-indices"], queryFn: nepseApi.getSectorIndices, staleTime: SLOW_STALE });

export const useCompanyList = () =>
  useQuery({ queryKey: ["company-list"], queryFn: nepseApi.getCompanyList, staleTime: STATIC_STALE });

export const useStockPrice = (symbol: string) =>
  useQuery({ queryKey: ["stock-price", symbol], queryFn: () => nepseApi.getStockPrice(symbol), staleTime: LIVE_STALE, refetchInterval: LIVE_STALE, enabled: !!symbol });

export const useStockDetail = (symbol: string) =>
  useQuery({ queryKey: ["stock-detail", symbol], queryFn: () => nepseApi.getStockDetail(symbol), staleTime: SLOW_STALE, enabled: !!symbol });

export const useStockChart = (symbol: string) =>
  useQuery({ queryKey: ["stock-chart", symbol], queryFn: () => nepseApi.getStockChart(symbol), staleTime: SLOW_STALE, enabled: !!symbol });

export const useFloorsheet = () =>
  useQuery({ queryKey: ["floorsheet"], queryFn: nepseApi.getFloorsheet, staleTime: SLOW_STALE });

export const useCompanyFloorsheet = (symbol: string) =>
  useQuery({ queryKey: ["floorsheet", symbol], queryFn: () => nepseApi.getCompanyFloorsheet(symbol), staleTime: SLOW_STALE, enabled: !!symbol });
