// NEPSE Elite — API Service Layer
// Fetches real data from NEPSE via our proxy server
// Falls back to seed data when API is unavailable

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    console.warn(`API fetch failed: ${path}`);
    return null;
  }
}
export async function fetchMarketStatus() {
  return apiFetch<{ isOpen: string }>('/market-status');
}
export async function fetchMarketSummary() {
  return apiFetch<any>('/market-summary');
}

export async function fetchIndex() {
  return apiFetch<any>('/index');
}
export async function fetchTodayPrices() {
  return apiFetch<any>('/today-price');
}
export async function fetchTopGainers() {
  return apiFetch<any[]>('/top-gainers');
}

export async function fetchTopLosers() {
  return apiFetch<any[]>('/top-losers');
}

export async function fetchTopVolume() {
  return apiFetch<any[]>('/top-volume');
}

export async function fetchTopTurnover() {
  return apiFetch<any[]>('/top-turnover');
}
export async function fetchCompanies() {
  return apiFetch<any[]>('/companies');
}

export async function fetchSecurityDetail(id: string | number) {
  return apiFetch<any>(`/security/${id}`);
}

export async function fetchGraphData(id: string | number) {
  return apiFetch<any>(`/graph/${id}`);
}
export async function fetchFloorsheet(size = 200) {
  return apiFetch<any>('/floorsheet', {
    method: 'POST',
    body: JSON.stringify({
      id: '',
      size,
      sort: { sort: [{ field: 'contractId', dir: 'asc' }] },
    }),
  });
}
export async function fetchSectors() {
  return apiFetch<any[]>('/sectors');
}
export async function fetchSupplyDemand() {
  return apiFetch<any>('/supply-demand');
}
export async function fetchBrokers() {
  return apiFetch<any>('/brokers');
}
export async function fetchCompanyPrice(symbol: string) {
  return apiFetch<any>(`/company-price/${symbol}`);
}
export async function checkApiHealth() {
  return apiFetch<{ status: string; cache_size: number }>('/health');
}
