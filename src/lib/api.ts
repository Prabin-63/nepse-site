const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${BASE_URL}${path}`, { ...options, signal: controller.signal });
      if (!res.ok) throw new Error(`API error: ${res.status} on ${path}`);
      const json = await res.json();
      return json.data as T;
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

export const nepseApi = {
  // Dashboard (one call = everything)
  getDashboard: () => apiFetch<any>("/api/summary/dashboard"),

  // Market
  getLiveTrading: () => apiFetch<any[]>("/api/market/live"),
  getTopGainers: () => apiFetch<any[]>("/api/market/gainers"),
  getTopLosers: () => apiFetch<any[]>("/api/market/losers"),
  getTopTurnover: () => apiFetch<any[]>("/api/market/turnover"),
  getTopVolume: () => apiFetch<any[]>("/api/market/volume"),
  getTopTransactions: () => apiFetch<any[]>("/api/market/transactions"),
  getMarketStatus: () => apiFetch<any>("/api/market/status"),
  getMarketSummary: () => apiFetch<any>("/api/market/summary"),

  // Indices
  getNepseIndex: () => apiFetch<any>("/api/indices/nepse"),
  getSubIndices: () => apiFetch<any[]>("/api/indices/sub"),
  getAllIndices: () => apiFetch<any[]>("/api/indices/all"),
  getSectorIndices: () => apiFetch<any[]>("/api/indices/sectors"),

  // Stocks
  getCompanyList: () => apiFetch<any[]>("/api/stocks/list"),
  getStockPrice: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/price`),
  getStockDetail: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/detail`),
  getStockDepth: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/depth`),
  getStockBrokers: (symbol: string) => apiFetch<any[]>(`/api/stocks/${symbol}/brokers`),
  getStockDailyChart: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/chart/daily`),
  getStockChart: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/chart`),
  getScreener: (params: string) => apiFetch<any[]>(`/api/stocks/screener?${params}`),

  // Floorsheet
  getFloorsheet: () => apiFetch<any[]>("/api/floorsheet/"),
  getCompanyFloorsheet: (symbol: string) => apiFetch<any[]>(`/api/floorsheet/${symbol}`),

  // Health
  health: () => fetch(`${BASE_URL}/health`).then(r => r.json()),

  // News
  getNews: () => apiFetch<any[]>("/api/news/"),

  // IPO
  getIpos: () => apiFetch<any[]>("/api/ipo/"),

  // Brokers
  getBrokers: () => apiFetch<any[]>("/api/brokers/"),
  getBrokerDetail: (id: string) => apiFetch<any>(`/api/brokers/${id}`),
  getBrokerBreakdown: (params: { period?: string; from?: string; to?: string; top?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set("period", params.period);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.top) qs.set("top", String(params.top));
    const tail = qs.toString();
    return apiFetch<any>(`/api/brokers/breakdown${tail ? `?${tail}` : ""}`);
  },
  getBrokerTradedStock: (symbol: string, params: { period?: string; from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set("period", params.period);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const tail = qs.toString();
    return apiFetch<any>(`/api/brokers/stock/${encodeURIComponent(symbol)}${tail ? `?${tail}` : ""}`);
  },
  getBrokerHoldings: (symbol: string, params: { period?: string; from?: string; to?: string; top?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set("period", params.period);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.top) qs.set("top", String(params.top));
    const tail = qs.toString();
    return apiFetch<any>(`/api/brokers/holdings/${encodeURIComponent(symbol)}${tail ? `?${tail}` : ""}`);
  },
  getAccumulationDistribution: (params: { period?: string; from?: string; to?: string; type?: "accumulation" | "distribution" | "both"; limit?: number; min_volume?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set("period", params.period);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.type) qs.set("type", params.type);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.min_volume != null) qs.set("min_volume", String(params.min_volume));
    const tail = qs.toString();
    return apiFetch<any>(`/api/brokers/accumulation${tail ? `?${tail}` : ""}`);
  },
  getBrokerProfile: (id: string, params: { period?: string; from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set("period", params.period);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    const tail = qs.toString();
    return apiFetch<any>(`/api/brokers/${encodeURIComponent(id)}${tail ? `?${tail}` : ""}`);
  },

  // SBIE
  getBrokerMap: () => apiFetch<any>("/api/sbie/broker-map"),
  getRiskScanner: () => apiFetch<any[]>("/api/sbie/risk-scanner"),
  getAccumulation: () => apiFetch<any[]>("/api/sbie/accumulation"),
  getCoordination: () => apiFetch<any>("/api/sbie/coordination"),
  getBrokerScorecard: () => apiFetch<any[]>("/api/sbie/broker-scorecard"),
  getBrokerScorecardProfile: (id: string) => apiFetch<any>(`/api/sbie/broker-scorecard/${id}`),
  generateAIBrief: () => apiFetch<any>("/api/sbie/ai-brief", { method: "POST" }),
};
