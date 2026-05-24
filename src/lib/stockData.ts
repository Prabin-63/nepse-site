import { seedCompanies } from '../data/seed';

export interface FloorsheetTrade {
  contractId: string | number;
  stockSymbol: string;
  buyerMemberId: string;
  sellerMemberId: string;
  contractQuantity: number;
  contractRate: number;
  contractTime: string;
  contractAmount?: number;
}

export interface MarketDepthView {
  buyDepth: { orderCount: number; quantity: number; orderPrice: number }[];
  sellDepth: { orderCount: number; quantity: number; orderPrice: number }[];
  totalBuyQty: number;
  totalSellQty: number;
  hasData: boolean;
}

export interface EnrichedFundamentals {
  eps: number;
  peRatio: number;
  bookValue: number;
  pbRatio: number;
  dividendYield: number;
  roe: number;
  roa: number;
  nim: number;
  marketCap: number;
  week52High: number;
  week52Low: number;
  listedShares?: number;
  source: 'api' | 'seed' | 'computed';
}

/** Deterministic proxy fundamentals when API has no EPS (same logic as Fundamentals page). */
export function generateFallbackFundamentals(symbol: string, sector: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rand = () => {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };

  let baseEps = 10;
  let basePe = 15;
  let baseBv = 120;
  const sec = (sector || '').toLowerCase();
  if (sec.includes('bank')) {
    baseEps = 20;
    basePe = 18;
    baseBv = 180;
  } else if (sec.includes('hydro')) {
    baseEps = 8;
    basePe = 35;
    baseBv = 105;
  } else if (sec.includes('insurance')) {
    baseEps = 30;
    basePe = 25;
    baseBv = 250;
  } else if (sec.includes('microfinance')) {
    baseEps = 40;
    basePe = 30;
    baseBv = 220;
  } else if (sec.includes('manufacturing')) {
    baseEps = 50;
    basePe = 20;
    baseBv = 300;
  }

  const eps = baseEps + rand() * 20 - 5;
  const peRatio = basePe + rand() * 20 - 5;
  const bookValue = baseBv + rand() * 100 - 20;
  const pbRatio = (eps * peRatio) / bookValue;
  const dividendYield = rand() > 0.3 ? rand() * 5 + 1 : 0;

  return {
    eps: parseFloat(Math.max(0.1, eps).toFixed(2)),
    peRatio: parseFloat(Math.max(5, peRatio).toFixed(2)),
    bookValue: parseFloat(Math.max(50, bookValue).toFixed(2)),
    pbRatio: parseFloat(Math.max(0.5, pbRatio).toFixed(2)),
    dividendYield: parseFloat(dividendYield.toFixed(2)),
  };
}

export function enrichFundamentals(
  symbol: string,
  sector: string,
  raw: {
    ltp?: number;
    eps?: number;
    peRatio?: number;
    bookValue?: number;
    pbRatio?: number;
    dividendYield?: number;
    roe?: number;
    roa?: number;
    nim?: number;
    marketCap?: number;
    week52High?: number;
    week52Low?: number;
    listedShares?: number;
  }
): EnrichedFundamentals {
  const seedData = seedCompanies.find((c) => c.symbol === symbol);
  let eps = raw.eps;
  let peRatio = raw.peRatio;
  let bookValue = raw.bookValue;
  let pbRatio = raw.pbRatio;
  let dividendYield = raw.dividendYield;
  let source: EnrichedFundamentals['source'] = eps ? 'api' : 'computed';

  if (!eps || eps === 0) {
    if (seedData) {
      eps = seedData.eps;
      peRatio = seedData.peRatio;
      bookValue = seedData.bookValue;
      pbRatio = seedData.pbRatio;
      dividendYield = seedData.dividendYield;
      source = 'seed';
    } else {
      const fallback = generateFallbackFundamentals(symbol, sector);
      eps = fallback.eps;
      peRatio = fallback.peRatio;
      bookValue = fallback.bookValue;
      pbRatio = fallback.pbRatio;
      dividendYield = fallback.dividendYield;
      source = 'computed';
    }
  }

  const ltp = raw.ltp || 0;
  if (ltp > 0 && eps && eps > 0 && (!peRatio || peRatio === 0)) {
    peRatio = parseFloat((ltp / eps).toFixed(2));
  }
  if (ltp > 0 && bookValue && bookValue > 0 && (!pbRatio || pbRatio === 0)) {
    pbRatio = parseFloat((ltp / bookValue).toFixed(2));
  }

  return {
    eps: eps || 0,
    peRatio: peRatio || 0,
    bookValue: bookValue || 0,
    pbRatio: pbRatio || 0,
    dividendYield: dividendYield || 0,
    roe: raw.roe || 0,
    roa: raw.roa || 0,
    nim: raw.nim || 0,
    marketCap: raw.marketCap || 0,
    week52High: raw.week52High || seedData?.week52High || 0,
    week52Low: raw.week52Low || seedData?.week52Low || 0,
    listedShares: raw.listedShares,
    source,
  };
}

export function normalizeFloorsheetTrades(raw: any[] | undefined | null, symbol?: string): FloorsheetTrade[] {
  if (!raw?.length) return [];
  const sym = symbol?.toUpperCase();
  return raw
    .map((r) => ({
      contractId: r.contractId ?? r.id ?? `${r.contractTime}-${r.contractRate}`,
      stockSymbol: (r.stockSymbol || r.stock_symbol || r.symbol || sym || '').toUpperCase(),
      buyerMemberId: String(r.buyerMemberId ?? r.buyer_broker_id ?? r.buyer ?? ''),
      sellerMemberId: String(r.sellerMemberId ?? r.seller_broker_id ?? r.seller ?? ''),
      contractQuantity: r.contractQuantity ?? r.quantity ?? 0,
      contractRate: r.contractRate ?? r.price ?? r.rate ?? 0,
      contractTime: r.contractTime ?? r.tradeTime ?? r.timestamp ?? r.businessDate ?? '—',
      contractAmount: r.contractAmount ?? (r.contractQuantity || 0) * (r.contractRate || 0),
    }))
    .filter((t) => !sym || t.stockSymbol === sym);
}

export function normalizeMarketDepth(raw: any): MarketDepthView {
  const empty: MarketDepthView = {
    buyDepth: [],
    sellDepth: [],
    totalBuyQty: 0,
    totalSellQty: 0,
    hasData: false,
  };
  if (!raw) return empty;

  const md = raw.marketDepth ?? raw.market_depth ?? raw;
  const buyList =
    md.buyMarketDepthList ??
    md.buy_market_depth_list ??
    md.buyOrders ??
    md.buy ??
    raw.buyMarketDepthList ??
    [];
  const sellList =
    md.sellMarketDepthList ??
    md.sell_market_depth_list ??
    md.sellOrders ??
    md.sell ??
    raw.sellMarketDepthList ??
    [];

  const mapRow = (d: any) => ({
    orderCount: d.orderCount ?? d.orders ?? d.order_count ?? 0,
    quantity: d.quantity ?? d.qty ?? 0,
    orderPrice: d.orderPrice ?? d.price ?? d.rate ?? 0,
  });

  const buyDepth = (Array.isArray(buyList) ? buyList : []).map(mapRow);
  const sellDepth = (Array.isArray(sellList) ? sellList : []).map(mapRow);
  const totalBuyQty =
    md.totalBuyQty ?? md.total_buy_qty ?? buyDepth.reduce((s, r) => s + r.quantity, 0);
  const totalSellQty =
    md.totalSellQty ?? md.total_sell_qty ?? sellDepth.reduce((s, r) => s + r.quantity, 0);

  return {
    buyDepth,
    sellDepth,
    totalBuyQty,
    totalSellQty,
    hasData: buyDepth.length > 0 || sellDepth.length > 0,
  };
}

export function filterNewsForStock(
  news: any[],
  symbol: string,
  companyName: string,
  sector: string
) {
  const sym = symbol.toLowerCase();
  const words = (companyName || '')
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 3);
  const sectorWords = (sector || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);

  const scored = (news || []).map((n) => {
    const title = (n.headline || n.title || '').toLowerCase();
    let score = 0;
    if (title.includes(sym)) score += 10;
    words.forEach((w) => {
      if (title.includes(w)) score += 3;
    });
    sectorWords.forEach((w) => {
      if (title.includes(w)) score += 2;
    });
    if (n.category === 'Financial' && sectorWords.some((w) => title.includes(w))) score += 1;
    return { ...n, _score: score };
  });

  const direct = scored.filter((n) => n._score >= 3).sort((a, b) => b._score - a._score);
  if (direct.length > 0) return direct;

  const sectorRelated = scored.filter((n) => n._score >= 2).slice(0, 8);
  if (sectorRelated.length > 0) return sectorRelated;

  return scored.slice(0, 6);
}

export function newsItemTitle(n: any) {
  return n.headline || n.title || 'Untitled';
}

export function newsItemLink(n: any) {
  const url = n.url || n.link || '';
  if (!url) return undefined;
  return url.startsWith('http') ? url : `https://www.sharesansar.com${url}`;
}

export function newsItemDate(n: any) {
  return n.date || n.pubDate || '';
}

export function sectorsMatch(a?: string, b?: string) {
  if (!a || !b) return false;
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  return sa.includes(sb) || sb.includes(sa) || sa.split(/\s+/)[0] === sb.split(/\s+/)[0];
}

export function computeStockInsight(params: {
  symbol: string;
  changePercent: number;
  peRatio: number;
  week52High: number;
  week52Low: number;
  ltp: number;
  depthBuyQty: number;
  depthSellQty: number;
  brokerNetFlow: number;
  rsi?: number | null;
  aboveSma20?: boolean;
}) {
  const {
    symbol,
    changePercent,
    peRatio,
    week52High,
    week52Low,
    ltp,
    depthBuyQty,
    depthSellQty,
    brokerNetFlow,
    rsi,
    aboveSma20,
  } = params;

  let score = 50;
  score += Math.max(-15, Math.min(15, changePercent * 3));
  if (aboveSma20 === true) score += 8;
  if (aboveSma20 === false) score -= 8;
  if (rsi !== null && rsi !== undefined) {
    if (rsi < 35) score += 6;
    if (rsi > 70) score -= 8;
  }
  const depthTotal = depthBuyQty + depthSellQty;
  if (depthTotal > 0) {
    const buyPct = depthBuyQty / depthTotal;
    score += (buyPct - 0.5) * 20;
  }
  if (brokerNetFlow > 0) score += 5;
  if (brokerNetFlow < 0) score -= 5;
  if (peRatio > 0 && peRatio < 18) score += 4;
  if (peRatio > 35) score -= 4;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const signal = score >= 62 ? 'BUY' : score <= 38 ? 'SELL' : 'HOLD';
  const sentiment =
    changePercent > 0.5 ? 'Bullish' : changePercent < -0.5 ? 'Bearish' : 'Neutral';

  let risk = 'Medium';
  if (week52High > week52Low && ltp > 0) {
    const rangePct = ((week52High - week52Low) / ltp) * 100;
    if (rangePct > 80 || Math.abs(changePercent) > 4) risk = 'High';
    else if (rangePct < 35 && Math.abs(changePercent) < 1.5) risk = 'Low';
  }

  const bullets: string[] = [];
  bullets.push(
    `📈 ${symbol} is ${changePercent >= 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(2)}% today, reflecting ${sentiment.toLowerCase()} session momentum.`
  );
  if (depthTotal > 0) {
    const ratio = ((depthBuyQty / depthTotal) * 100).toFixed(0);
    bullets.push(
      `📊 Order book shows ${ratio}% buy-side quantity (${depthBuyQty.toLocaleString()} vs ${depthSellQty.toLocaleString()} sell), indicating ${Number(ratio) >= 55 ? 'demand pressure' : Number(ratio) <= 45 ? 'supply pressure' : 'balanced liquidity'}.`
    );
  } else {
    bullets.push('📊 Order book depth is empty — typical when the market is closed or no limit orders are queued.');
  }
  if (brokerNetFlow !== 0) {
    bullets.push(
      `🏦 Broker net flow today is ${brokerNetFlow > 0 ? 'positive' : 'negative'} (${brokerNetFlow > 0 ? 'net buying' : 'net selling'} from aggregated floorsheet).`
    );
  }
  if (peRatio > 0) {
    bullets.push(
      `💡 P/E of ${peRatio.toFixed(1)} suggests the stock is ${peRatio < 20 ? 'relatively inexpensive vs typical NEPSE multiples' : peRatio > 30 ? 'priced for growth or sector premium' : 'in line with market averages'}.`
    );
  }
  if (rsi !== null && rsi !== undefined) {
    bullets.push(`⚙️ RSI at ${rsi.toFixed(1)} — ${rsi > 70 ? 'overbought territory' : rsi < 30 ? 'oversold territory' : 'neutral momentum zone'}.`);
  }

  return { signal, score, sentiment, risk, bullets };
}
