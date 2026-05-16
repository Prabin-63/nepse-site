// NEPSE Elite — Utility Functions

import { BROKER_FEE_TIERS, SEBON_FEE, DP_CHARGE, CGT_INDIVIDUAL_SHORT, CGT_INDIVIDUAL_LONG, CGT_INSTITUTION } from '../constants';

export { DP_CHARGE };

/**
 * Format number as Nepali Rupees
 */
export function formatNPR(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1e10) return `Rs. ${(value / 1e10).toFixed(2)} Arba`;
    if (Math.abs(value) >= 1e7) return `Rs. ${(value / 1e7).toFixed(2)} Cr`;
    if (Math.abs(value) >= 1e5) return `Rs. ${(value / 1e5).toFixed(2)} L`;
    if (Math.abs(value) >= 1e3) return `Rs. ${(value / 1e3).toFixed(1)}K`;
  }
  return `Rs. ${formatNepaliNumber(value)}`;
}

/**
 * Format number in Nepali notation (1,23,456)
 */
export function formatNepaliNumber(num: number, decimals = 2): string {
  const fixed = Math.abs(num).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  
  if (intPart.length <= 3) {
    return `${num < 0 ? '-' : ''}${intPart}${decPart ? '.' + decPart : ''}`;
  }
  
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  return `${num < 0 ? '-' : ''}${formatted}${decPart ? '.' + decPart : ''}`;
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format change with sign and Rs.
 */
export function formatChange(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Format volume in compact form
 */
export function formatVolume(volume: number): string {
  if (volume >= 1e7) return `${(volume / 1e7).toFixed(2)} Cr`;
  if (volume >= 1e5) return `${(volume / 1e5).toFixed(2)} L`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toString();
}

/**
 * Calculate broker commission based on tiered structure
 */
export function calculateBrokerFee(amount: number): number {
  let fee = 0;
  let remaining = amount;
  let prevMax = 0;
  
  for (const tier of BROKER_FEE_TIERS) {
    const tierAmount = Math.min(remaining, tier.maxAmount - prevMax);
    if (tierAmount <= 0) break;
    fee += tierAmount * tier.rate;
    remaining -= tierAmount;
    prevMax = tier.maxAmount;
  }
  
  return Math.round(fee * 100) / 100;
}

/**
 * Calculate SEBON fee
 */
export function calculateSEBONFee(amount: number): number {
  return Math.round(amount * SEBON_FEE * 100) / 100;
}

/**
 * Calculate Capital Gains Tax
 */
export function calculateCGT(profit: number, type: 'individual_short' | 'individual_long' | 'institution'): number {
  if (profit <= 0) return 0;
  const rates = {
    individual_short: CGT_INDIVIDUAL_SHORT,
    individual_long: CGT_INDIVIDUAL_LONG,
    institution: CGT_INSTITUTION
  };
  return profit * rates[type];
}

/**
 * Calculate total buy cost
 */
export function calcBuyCost(quantity: number, price: number) {
  const grossAmount = quantity * price;
  const brokerFee = calculateBrokerFee(grossAmount);
  const sebonFee = calculateSEBONFee(grossAmount);
  const dpCharge = DP_CHARGE;
  const totalCost = grossAmount + brokerFee + sebonFee + dpCharge;
  const costPerShare = totalCost / quantity;
  
  return {
    grossAmount,
    brokerFee,
    sebonFee,
    dpCharge,
    totalCost,
    costPerShare,
  };
}

/**
 * Calculate total sell proceeds
 */
export function calcSellProceeds(
  quantity: number,
  sellPrice: number,
  buyPrice: number,
  holdingDays: number,
  sellerType: 'individual' | 'institution' = 'individual'
) {
  const grossAmount = quantity * sellPrice;
  const brokerFee = calculateBrokerFee(grossAmount);
  const sebonFee = calculateSEBONFee(grossAmount);
  const dpCharge = DP_CHARGE;
  
  const capitalGain = (sellPrice - buyPrice) * quantity;
  let cgtRate = 0;
  if (capitalGain > 0) {
    if (sellerType === 'institution') {
      cgtRate = CGT_INSTITUTION;
    } else if (holdingDays < 365) {
      cgtRate = CGT_INDIVIDUAL_SHORT;
    } else {
      cgtRate = CGT_INDIVIDUAL_LONG;
    }
  }
  
  const cgt = Math.max(0, capitalGain * cgtRate);
  const totalDeductions = brokerFee + sebonFee + dpCharge + cgt;
  const netReceivable = grossAmount - totalDeductions;
  const netProfit = netReceivable - (buyPrice * quantity);
  
  return {
    grossAmount,
    brokerFee,
    sebonFee,
    dpCharge,
    capitalGain,
    cgtRate,
    cgt,
    totalDeductions,
    netReceivable,
    netProfit,
  };
}

/**
 * Graham Number calculation
 */
export function grahamNumber(eps: number, bookValue: number): number {
  if (eps <= 0 || bookValue <= 0) return 0;
  return Math.sqrt(22.5 * eps * bookValue);
}

/**
 * Bonus Adjusted Price
 */
export function bonusAdjustedPrice(price: number, bonusRate: number): number {
  return price / (1 + bonusRate / 100);
}

/**
 * TERP (Theoretical Ex-Rights Price)
 */
export function terp(marketPrice: number, ratio: number, rightsPrice: number): number {
  return (ratio * marketPrice + rightsPrice) / (ratio + 1);
}

/**
 * Weighted Average Buy Price
 */
export function weightedAvgPrice(transactions: { qty: number; price: number }[]): number {
  const totalCost = transactions.reduce((s, t) => s + t.qty * t.price, 0);
  const totalQty = transactions.reduce((s, t) => s + t.qty, 0);
  return totalQty === 0 ? 0 : totalCost / totalQty;
}

/**
 * Simple BS date approximation (2082 BS ≈ 2025/2026 AD)
 * This is a simplified conversion — real BS conversion needs lookup tables
 */
export function adToBS(adDate: Date): string {
  const bsYear = adDate.getFullYear() + 57;
  const bsMonth = ((adDate.getMonth() + 8) % 12) + 1;
  const bsDay = adDate.getDate();
  return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
}

export function formatBSDate(adDate: Date): string {
  const bs = adToBS(adDate);
  const months = ['बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
  const parts = bs.split('-');
  const monthIdx = parseInt(parts[1]) - 1;
  return `${parts[2]} ${months[monthIdx]} ${parts[0]}`;
}

/**
 * Get current Nepal Time
 */
export function getNepalTime(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 5.75 * 3600000);
}

/**
 * Determine market status
 */
export function getMarketStatus(): 'OPEN' | 'CLOSED' | 'PRE_OPEN' {
  const npt = getNepalTime();
  const day = npt.getDay();
  const hours = npt.getHours();
  const minutes = npt.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Friday(5) and Saturday(6) = closed
  if (day === 5 || day === 6) return 'CLOSED';
  
  const preOpenStart = 9 * 60 + 45;  // 9:45
  const marketOpen = 10 * 60;         // 10:00
  const marketClose = 15 * 60;        // 15:00
  
  if (totalMinutes >= preOpenStart && totalMinutes < marketOpen) return 'PRE_OPEN';
  if (totalMinutes >= marketOpen && totalMinutes < marketClose) return 'OPEN';
  return 'CLOSED';
}

/**
 * Time until next market event
 */
export function getTimeToMarketEvent(): { event: string; hours: number; minutes: number; seconds: number } {
  const npt = getNepalTime();
  const day = npt.getDay();
  const hours = npt.getHours();
  const minutes = npt.getMinutes();
  const seconds = npt.getSeconds();
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  
  const openSeconds = 10 * 3600;
  const closeSeconds = 15 * 3600;
  
  const isTradingDay = day >= 0 && day <= 4;
  
  if (isTradingDay && totalSeconds < openSeconds) {
    const diff = openSeconds - totalSeconds;
    return {
      event: 'Market Opens',
      hours: Math.floor(diff / 3600),
      minutes: Math.floor((diff % 3600) / 60),
      seconds: diff % 60,
    };
  }
  
  if (isTradingDay && totalSeconds >= openSeconds && totalSeconds < closeSeconds) {
    const diff = closeSeconds - totalSeconds;
    return {
      event: 'Market Closes',
      hours: Math.floor(diff / 3600),
      minutes: Math.floor((diff % 3600) / 60),
      seconds: diff % 60,
    };
  }
  
  // Market closed — find next open
  let daysUntilOpen = 0;
  let nextDay = day;
  do {
    nextDay = (nextDay + 1) % 7;
    daysUntilOpen++;
  } while (nextDay > 4);
  
  const secsInDay = 24 * 3600;
  const remaining = (daysUntilOpen - 1) * secsInDay + (secsInDay - totalSeconds) + openSeconds;
  
  return {
    event: 'Market Opens',
    hours: Math.floor(remaining / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}

/**
 * Get color class based on value
 */
export function getPriceColorClass(value: number): string {
  if (value > 0) return 'text-bull-green';
  if (value < 0) return 'text-bear-red';
  return 'text-neutral-yellow';
}

/**
 * Generate a random number within range
 */
export function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Clamp a value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate SMA
 */
export function calcSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

/**
 * Calculate EMA
 */
export function calcEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(sma);
    } else {
      const prev = result[i - 1]!;
      result.push((data[i] - prev) * multiplier + prev);
    }
  }
  return result;
}

/**
 * Calculate RSI
 */
export function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    
    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    } else {
      const prevRSI = result[i - 1]!;
      const prevAvgGain = (100 / (100 - prevRSI) - 1);
      const avgGain = (prevAvgGain * (period - 1) + gains[gains.length - 1]) / period;
      const avgLoss = avgGain === 0 ? 0 : avgGain / (prevRSI / (100 - prevRSI));
      const newAvgLoss = (avgLoss * (period - 1) + losses[losses.length - 1]) / period;
      const rs = newAvgLoss === 0 ? 100 : avgGain / newAvgLoss;
      result.push(clamp(100 - (100 / (1 + rs)), 0, 100));
    }
  }
  return result;
}
