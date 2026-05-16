// Technical Indicator Calculations

export interface OHLCVBar {
  time: number;       // Unix timestamp
  date: string;       // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export function calcSMA(data: OHLCVBar[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, d) => s + d.close, 0) / period;
  });
}
export function calcEMA(data: OHLCVBar[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  for (let i = period - 1; i < data.length; i++) {
    if (i === period - 1) {
      result[i] = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
    } else {
      result[i] = data[i].close * k + (result[i - 1] as number) * (1 - k);
    }
  }
  return result;
}
export function calcBollingerBands(data: OHLCVBar[], period = 20, multiplier = 2) {
  const sma = calcSMA(data, period);
  return data.map((_, i) => {
    const ma = sma[i];
    if (ma === null) return { upper: null, middle: null, lower: null };
    const slice = data.slice(i - period + 1, i + 1);
    const variance = slice.reduce((s, d) => s + Math.pow(d.close - ma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return {
      upper: ma + multiplier * stdDev,
      middle: ma,
      lower: ma - multiplier * stdDev,
    };
  });
}
export function calcRSI(data: OHLCVBar[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        result[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
    }
  }
  return result;
}
export function calcMACD(data: OHLCVBar[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);
  const macdLine = data.map((_, i) => {
    const f = emaFast[i], s = emaSlow[i];
    return f !== null && s !== null ? f - s : null;
  });
  // Signal line = EMA(9) of MACD
  const signalLine: (number | null)[] = new Array(data.length).fill(null);
  const k = 2 / (signal + 1);
  let initialized = false;
  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i];
    if (m === null) continue;
    if (!initialized) {
      signalLine[i] = m;
      initialized = true;
    } else {
      const prev = signalLine[i - 1] ?? m;
      signalLine[i] = m * k + prev * (1 - k);
    }
  }
  const histogram = data.map((_, i) => {
    const m = macdLine[i], s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });
  return { macdLine, signalLine, histogram };
}
export function calcStochastic(data: OHLCVBar[], period = 14, smoothK = 3, smoothD = 3) {
  const rawK: (number | null)[] = data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    if (high === low) return 50;
    return ((data[i].close - low) / (high - low)) * 100;
  });
  // Smooth %K
  const k = rawK.map((_, i) => {
    if (rawK[i] === null) return null;
    const slice = rawK.slice(Math.max(0, i - smoothK + 1), i + 1).filter(v => v !== null) as number[];
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
  // %D = SMA of %K
  const d = k.map((_, i) => {
    const slice = k.slice(Math.max(0, i - smoothD + 1), i + 1).filter(v => v !== null) as number[];
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
  return { k, d };
}
export function calcATR(data: OHLCVBar[], period = 14): (number | null)[] {
  const tr = data.map((d, i) => {
    if (i === 0) return d.high - d.low;
    const prev = data[i - 1].close;
    return Math.max(d.high - d.low, Math.abs(d.high - prev), Math.abs(d.low - prev));
  });
  return tr.map((_, i) => {
    if (i < period - 1) return null;
    return tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}
export function calcOBV(data: OHLCVBar[]): number[] {
  let obv = 0;
  return data.map((d, i) => {
    if (i === 0) return obv;
    if (d.close > data[i - 1].close) obv += d.volume;
    else if (d.close < data[i - 1].close) obv -= d.volume;
    return obv;
  });
}
export function calcWilliamsR(data: OHLCVBar[], period = 14): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    if (high === low) return -50;
    return ((high - data[i].close) / (high - low)) * -100;
  });
}
export function calcVWAP(data: OHLCVBar[]): number[] {
  let cumPV = 0, cumV = 0;
  return data.map(d => {
    const typical = (d.high + d.low + d.close) / 3;
    cumPV += typical * d.volume;
    cumV += d.volume;
    return cumV > 0 ? cumPV / cumV : typical;
  });
}
export function calcHeikinAshi(data: OHLCVBar[]): OHLCVBar[] {
  return data.map((d, i) => {
    const prevOpen = i > 0 ? (data[i-1].open + data[i-1].close) / 2 : d.open;
    const prevClose = i > 0 ? (data[i-1].open + data[i-1].high + data[i-1].low + data[i-1].close) / 4 : d.close;
    const haClose = (d.open + d.high + d.low + d.close) / 4;
    const haOpen = (prevOpen + prevClose) / 2;
    return { ...d, open: haOpen, close: haClose, high: Math.max(d.high, haOpen, haClose), low: Math.min(d.low, haOpen, haClose) };
  });
}
export function generateOHLCV(symbol: string, bars = 300, basePrice = 1000): OHLCVBar[] {
  const data: OHLCVBar[] = [];
  let price = basePrice;
  const seed = symbol.charCodeAt(0) / 100;
  const now = Date.now();
  for (let i = bars; i >= 0; i--) {
    const ts = now - i * 86400000;
    const date = new Date(ts).toISOString().split('T')[0];
    const change = (Math.sin(i * 0.15 + seed) + (Math.random() - 0.48)) * price * 0.025;
    const open = price;
    const close = Math.max(10, price + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.015);
    const volume = Math.floor((Math.random() * 0.8 + 0.2) * 500000 * (1 + Math.abs(change / price) * 5));
    data.push({ time: Math.floor(ts / 1000), date, open, high, low, close, volume });
    price = close;
  }
  return data;
}
