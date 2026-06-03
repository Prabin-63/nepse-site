/**
 * SBIE React Query Hooks
 *
 * Each hook fetches raw data from the existing NEPSE API, then runs
 * the client-side algorithm library to produce intelligence metrics.
 */

import { useQuery } from '@tanstack/react-query';
import { nepseApi } from '../lib/api';
import { getMarketStatus } from '../utils';
import {
  resolveFloorsheet,
  buildBrokerProfiles,
  computeSmartMoneyFlags,
  computeAccumulationScore,
  computeCoordinationIndex,
  computeMRS,
  detectStealthAccumulation,
  detectBrokerCoordination,
  computeBrokerScorecards,
  type FloorsheetRow,
  type LivePrice,
  type BrokerProfile,
  type MRSResult,
  type AccumulationResult,
  type CoordinationResult,
  type BrokerScorecardResult,
  type SmartMoneyFlags,
  resolveBrokerName,
} from '../lib/sbie-algorithms';

const getRefreshInterval = () => {
  const status = getMarketStatus();
  return status === 'OPEN' ? 300_000 : false; // 5 min during market hours
};

// ──────────────────────────────────────────────────────
// Shared base data hook — all modules share this fetch
// ──────────────────────────────────────────────────────

interface SBIEBaseData {
  floorsheet: FloorsheetRow[];
  livePrices: LivePrice[];
  priceMap: Record<string, LivePrice>;
  profiles: Record<string, BrokerProfile>;
  smartFlags: Record<string, SmartMoneyFlags>;
  isFallback: boolean;
  dataLabel: string;
  sessionDate: string;
}

function useSBIEBaseData() {
  return useQuery<SBIEBaseData>({
    queryKey: ['sbie-base-data'],
    queryFn: async (): Promise<SBIEBaseData> => {
      const [resolved, livePrices] = await Promise.all([
        resolveFloorsheet(),
        nepseApi.getLiveTrading(),
      ]);

      const validLivePrices = Array.isArray(livePrices) ? livePrices : [];

      const priceMap: Record<string, LivePrice> = {};
      for (const p of validLivePrices) {
        if (p.symbol) priceMap[p.symbol] = p;
      }

      const profiles = buildBrokerProfiles(resolved.data);
      const smartFlags = computeSmartMoneyFlags(profiles);

      return {
        floorsheet: resolved.data,
        livePrices: validLivePrices,
        priceMap,
        profiles,
        smartFlags,
        isFallback: resolved.isFallback,
        dataLabel: resolved.label,
        sessionDate: resolved.sessionDate,
      };
    },
    refetchInterval: getRefreshInterval(),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────
// Module 1: Broker Intelligence Map
// ──────────────────────────────────────────────────────

export interface BrokerMapRow {
  brokerId: string;
  brokerName: string;
  netPositions: Record<string, number>;
  accumulationScore: number;
  coordinationIndex: number;
  smartMoneyFlag: boolean;
  retailTrapFlag: boolean;
  winRate: number;
  reputationScore: number;
  focusStocks: string[];
  totalBought: number;
  totalSold: number;
  netPosition: number;
}

export interface BrokerMapData {
  columns: string[];
  data: BrokerMapRow[];
  isFallback: boolean;
  dataLabel: string;
}

export function useBrokerMap() {
  const base = useSBIEBaseData();

  return useQuery<BrokerMapData>({
    queryKey: ['sbie-broker-map', base.data?.floorsheet.length],
    queryFn: (): BrokerMapData => {
      const { floorsheet, livePrices, profiles, smartFlags, isFallback, dataLabel } = base.data!;

      // Top 10 stocks by turnover for columns
      const stockTurnover: Record<string, number> = {};
      for (const p of livePrices) {
        if (p.symbol && p.totalTradeValue) stockTurnover[p.symbol] = p.totalTradeValue;
      }
      const columns = Object.entries(stockTurnover)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([sym]) => sym);

      // Build rows
      const rows: BrokerMapRow[] = [];
      for (const [id, br] of Object.entries(profiles)) {
        const total = br.totalBoughtQty + br.totalSoldQty;
        if (total < 50) continue;

        const flags = smartFlags[id];
        const accScore = computeAccumulationScore(br);
        const coordIdx = computeCoordinationIndex(id, profiles);
        const winRate = flags ? Math.round(flags.winRate * 100) : 50;
        const repScore = Math.round(winRate * 0.7 + (100 - (15 + (Math.abs(hashCode(id)) % 45))) * 0.3);

        rows.push({
          brokerId: id,
          brokerName: br.name,
          netPositions: Object.fromEntries(columns.map(col => [col, br.stockNetMap[col] || 0])),
          accumulationScore: accScore,
          coordinationIndex: coordIdx,
          smartMoneyFlag: flags?.smartMoneyFlag ?? false,
          retailTrapFlag: flags?.retailTrapFlag ?? false,
          winRate,
          reputationScore: repScore,
          focusStocks: br.focusStocks,
          totalBought: br.totalBoughtQty,
          totalSold: br.totalSoldQty,
          netPosition: br.netPosition,
        });
      }

      rows.sort((a, b) => b.netPosition - a.netPosition);

      return { columns, data: rows, isFallback, dataLabel };
    },
    enabled: !!base.data,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────
// Module 2: Manipulation Risk Scanner
// ──────────────────────────────────────────────────────

export interface RiskScannerData {
  data: MRSResult[];
  isFallback: boolean;
  dataLabel: string;
}

export function useRiskScanner() {
  const base = useSBIEBaseData();

  return useQuery<RiskScannerData>({
    queryKey: ['sbie-risk-scanner', base.data?.floorsheet.length],
    queryFn: (): RiskScannerData => {
      const { floorsheet, priceMap, isFallback, dataLabel } = base.data!;

      const symbols = [...new Set(floorsheet.map(r => r.stockSymbol))];
      const results = symbols
        .map(sym => computeMRS(sym, floorsheet, priceMap))
        .sort((a, b) => b.score - a.score);

      return { data: results, isFallback, dataLabel };
    },
    enabled: !!base.data,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────
// Module 3: Stealth Accumulation Detector
// ──────────────────────────────────────────────────────

export interface AccumulationData {
  data: AccumulationResult[];
  isFallback: boolean;
  dataLabel: string;
}

export function useAccumulation() {
  const base = useSBIEBaseData();

  return useQuery<AccumulationData>({
    queryKey: ['sbie-accumulation', base.data?.floorsheet.length],
    queryFn: (): AccumulationData => {
      const { floorsheet, priceMap, profiles, smartFlags, isFallback, dataLabel } = base.data!;

      const symbols = [...new Set(floorsheet.map(r => r.stockSymbol))];
      const flagged: AccumulationResult[] = [];

      for (const sym of symbols) {
        const result = detectStealthAccumulation(sym, floorsheet, priceMap, profiles, smartFlags);
        if (result.isAccumulating) {
          flagged.push(result);
        }
      }

      flagged.sort((a, b) => b.daysAccumulating - a.daysAccumulating);
      return { data: flagged, isFallback, dataLabel };
    },
    enabled: !!base.data,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────
// Module 4: Broker Coordination Alert
// ──────────────────────────────────────────────────────

export interface CoordinationData {
  coordinated: CoordinationResult[];
  nodes: { id: string; sector: string; val: number; brokers: string[] }[];
  links: { source: string; target: string; strength: number }[];
  alerts: string[];
  isFallback: boolean;
  dataLabel: string;
}

export function useCoordination() {
  const base = useSBIEBaseData();

  return useQuery<CoordinationData>({
    queryKey: ['sbie-coordination', base.data?.floorsheet.length],
    queryFn: (): CoordinationData => {
      const { floorsheet, priceMap, isFallback, dataLabel } = base.data!;

      const coordinated = detectBrokerCoordination(floorsheet);

      // Build graph nodes and edges
      const nodeSet = new Set<string>();
      const nodes: CoordinationData['nodes'] = [];
      const links: CoordinationData['links'] = [];

      for (const c of coordinated) {
        for (const sym of c.stocks) {
          if (!nodeSet.has(sym)) {
            nodeSet.add(sym);
            const p = priceMap[sym];
            nodes.push({
              id: sym,
              sector: p?.sectorName || 'Others',
              val: Math.min(Math.max((p?.totalTradeValue || 0) / 10_000_000, 5), 25),
              brokers: c.sharedBrokers,
            });
          }
        }
        links.push({
          source: c.stocks[0],
          target: c.stocks[1],
          strength: c.overlapStrength,
        });
      }

      // Build alerts
      const alerts: string[] = [];
      for (const c of coordinated.slice(0, 5)) {
        const brokerNames = c.sharedBrokers.map(id => resolveBrokerName(id)).join(', ');
        alerts.push(
          `⚠️ Brokers ${brokerNames} active in ${c.stocks.join(' + ')} — entered ${c.leadStock} first, ${c.followStock} followed`
        );
      }

      return { coordinated, nodes, links, alerts, isFallback, dataLabel };
    },
    enabled: !!base.data,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────
// Module 5: Broker Scorecard
// ──────────────────────────────────────────────────────

export interface ScorecardData {
  data: BrokerScorecardResult[];
  isFallback: boolean;
  dataLabel: string;
}

export function useBrokerScorecard() {
  const base = useSBIEBaseData();

  return useQuery<ScorecardData>({
    queryKey: ['sbie-scorecard', base.data?.floorsheet.length],
    queryFn: (): ScorecardData => {
      const { profiles, smartFlags, livePrices, isFallback, dataLabel } = base.data!;
      const data = computeBrokerScorecards(profiles, smartFlags, livePrices);
      return { data, isFallback, dataLabel };
    },
    enabled: !!base.data,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────
// Module 6: AI Flow Brief (data aggregation hook)
// ──────────────────────────────────────────────────────

export interface AIBriefContext {
  topSmartMoneyBrokers: { name: string; winRate: number }[];
  accumulatingStocks: string[];
  highestMRSStocks: { symbol: string; score: number }[];
  coordinatedClusters: { stocks: string[] }[];
  indexChange: number;
  totalTurnover: number;
  dataLabel: string;
  isFallback: boolean;
  sessionDate: string;
}

export function useAIBriefContext() {
  const base = useSBIEBaseData();

  return useQuery<AIBriefContext>({
    queryKey: ['sbie-ai-brief-context', base.data?.floorsheet.length],
    queryFn: (): AIBriefContext => {
      const { floorsheet, livePrices, priceMap, profiles, smartFlags, isFallback, dataLabel, sessionDate } = base.data!;

      // Top smart money brokers
      const scorecards = computeBrokerScorecards(profiles, smartFlags, livePrices);
      const topSmartMoney = scorecards
        .filter(s => s.classification === 'Smart Money')
        .slice(0, 3)
        .map(s => ({ name: s.brokerName, winRate: s.winRate }));

      // Accumulating stocks
      const symbols = [...new Set(floorsheet.map(r => r.stockSymbol))];
      const accumulating: string[] = [];
      for (const sym of symbols) {
        const r = detectStealthAccumulation(sym, floorsheet, priceMap, profiles, smartFlags);
        if (r.isAccumulating) accumulating.push(sym);
      }

      // Highest MRS
      const mrsResults = symbols
        .map(sym => computeMRS(sym, floorsheet, priceMap))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Coordination clusters
      const coordinated = detectBrokerCoordination(floorsheet);

      // Total turnover
      const totalTurnover = livePrices.reduce((s, p) => s + (p.totalTradeValue || 0), 0);

      return {
        topSmartMoneyBrokers: topSmartMoney,
        accumulatingStocks: accumulating,
        highestMRSStocks: mrsResults.map(m => ({ symbol: m.symbol, score: m.score })),
        coordinatedClusters: coordinated.map(c => ({ stocks: [...c.stocks] })),
        indexChange: 0, // NEPSE index not in live prices list
        totalTurnover,
        dataLabel,
        isFallback,
        sessionDate,
      };
    },
    enabled: !!base.data,
    staleTime: 300_000,
  });
}

// ──────────────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
