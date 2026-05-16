// NEPSE Elite — TypeScript Domain Interfaces

export interface Company {
  symbol: string;
  companyName: string;
  companyNameNepali: string;
  sector: string;
  ltp: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  marketCap: number;
  listedShares: number;
  publicShares: number;
  eps: number;
  peRatio: number;
  bookValue: number;
  pbRatio: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
  lastUpdated: string;
  circuitUp?: boolean;
  circuitDown?: boolean;
}

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover?: number;
}

export interface FloorsheetEntry {
  transactionNo: number;
  symbol: string;
  buyer: number;
  seller: number;
  quantity: number;
  rate: number;
  amount: number;
  timestamp: string;
}

export interface Broker {
  id: number;
  name: string;
  city: string;
  address: string;
  contact: string;
}

export interface IPOEntry {
  company: string;
  symbol: string;
  sector: string;
  issueType: 'IPO' | 'FPO' | 'RIGHT' | 'AUCTION' | 'MUTUAL_FUND' | 'DEBENTURE';
  openDate: string;
  closeDate: string;
  units: number;
  faceValue: number;
  issuePrice: number;
  minApplication: number;
  maxApplication: number;
  purpose: string;
  merchantBanker: string;
  status: 'upcoming' | 'open' | 'closed' | 'listed';
  allotmentDate?: string;
  listingDate?: string;
  oversubscriptionRatio?: number;
  listingPrice?: number;
}

export interface QuarterlyFinancial {
  symbol: string;
  quarter: string;
  fiscalYear: string;
  netProfit: number;
  eps: number;
  revenue: number;
  operatingProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  npa?: number;
  cdRatio?: number;
  car?: number;
  claimRatio?: number;
  distributionExpense?: number;
  roe?: number;
  roa?: number;
}

export interface MutualFund {
  fundName: string;
  symbol: string;
  fundType: 'open' | 'closed';
  fundManager: string;
  nav: number;
  faceValue: number;
  navChange: number;
  totalUnits: number;
  totalAUM: number;
  topHoldings: { symbol: string; weight: number }[];
  sectorAllocation: { sector: string; weight: number }[];
  issueDate: string;
  maturityDate?: string;
  unlockDate?: string;
  dividendHistory: { fy: string; rate: number }[];
}

export interface PortfolioHolding {
  symbol: string;
  companyName: string;
  sector: string;
  quantity: number;
  avgPurchasePrice: number;
  currentLTP: number;
  marketValue: number;
  investedAmount: number;
  gainLoss: number;
  gainLossPercent: number;
  weight: number;
}

export interface Transaction {
  id: string;
  date: string;
  symbol: string;
  type: 'BUY' | 'SELL' | 'BONUS' | 'RIGHTS' | 'DIVIDEND';
  quantity: number;
  rate: number;
  amount: number;
  brokerFee: number;
  sebonFee: number;
  dpFee: number;
  cgt?: number;
  netAmount: number;
}

export interface WatchlistItem {
  symbol: string;
  dateAdded: string;
  priceWhenAdded: number;
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}

export interface Alert {
  id: string;
  type: 'price' | 'technical' | 'event' | 'market';
  symbol?: string;
  condition: string;
  value: number | string;
  triggered: boolean;
  triggeredAt?: string;
  active: boolean;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  publishedDate: string;
  category: string;
  relatedSymbol?: string;
  url?: string;
  summary?: string;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  previousClose: number;
}

export interface SectorData {
  id: string;
  name: string;
  nameNepali: string;
  change: number;
  changePercent: number;
  turnover: number;
  totalMarketCap: number;
  stocksUp: number;
  stocksDown: number;
  totalStocks: number;
  avgPE?: number;
  avgPB?: number;
  avgDividendYield?: number;
}

export interface DividendHistory {
  symbol: string;
  fy: string;
  type: 'cash' | 'bonus' | 'cash+bonus';
  cashRate?: number;
  bonusRate?: number;
  exDate?: string;
  paymentDate?: string;
}

export interface MarketEvent {
  id: string;
  type: 'ipo' | 'agm' | 'book_closure' | 'dividend' | 'bonus' | 'rights' | 'fund_unlock' | 'promoter_unlock';
  title: string;
  company: string;
  symbol?: string;
  date: string;
  description?: string;
}

export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_OPEN';
export type TechnicalSignal = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
