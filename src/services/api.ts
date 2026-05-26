// Legacy API helpers — routed through the Python backend (port 8000)
import { nepseApi } from '@/lib/api';

export async function fetchMarketStatus() {
  return nepseApi.getMarketStatus();
}

export async function fetchMarketSummary() {
  return nepseApi.getMarketSummary();
}

export async function fetchIndex() {
  return nepseApi.getNepseIndex();
}

export async function fetchTodayPrices() {
  return nepseApi.getLiveTrading();
}

export async function fetchTopGainers() {
  return nepseApi.getTopGainers();
}

export async function fetchTopLosers() {
  return nepseApi.getTopLosers();
}

export async function fetchTopVolume() {
  return nepseApi.getTopVolume();
}

export async function fetchTopTurnover() {
  return nepseApi.getTopTurnover();
}

export async function fetchCompanies() {
  return nepseApi.getCompanyList();
}

export async function fetchSecurityDetail(symbol: string | number) {
  return nepseApi.getStockDetail(String(symbol));
}

export async function fetchGraphData(symbol: string | number) {
  return nepseApi.getStockChart(String(symbol));
}

export async function fetchFloorsheet() {
  return nepseApi.getFloorsheet();
}

export async function fetchSectors() {
  return nepseApi.getSectorIndices();
}

export async function fetchBrokers() {
  return nepseApi.getBrokers();
}

export async function fetchCompanyPrice(symbol: string) {
  return nepseApi.getStockPrice(symbol);
}

export async function checkApiHealth() {
  return nepseApi.health();
}
