const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} on ${path}`);
  const json = await res.json();
  return json.data as T;
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
  getStockDailyChart: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/chart/daily`),
  getStockChart: (symbol: string) => apiFetch<any>(`/api/stocks/${symbol}/chart`),

  // Floorsheet
  getFloorsheet: () => apiFetch<any[]>("/api/floorsheet/"),
  getCompanyFloorsheet: (symbol: string) => apiFetch<any[]>(`/api/floorsheet/${symbol}`),

  // Health
  health: () => fetch(`${BASE_URL}/health`).then(r => r.json()),

  // News
  getNews: () => apiFetch<any[]>("/api/news/"),

  // Brokers
  getBrokers: () => apiFetch<any[]>("/api/brokers/"),
  getBrokerDetail: (id: string) => apiFetch<any>(`/api/brokers/${id}`),
};
