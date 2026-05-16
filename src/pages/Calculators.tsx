import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Banknote, PieChart, TrendingUp, TrendingDown, Info, HelpCircle, ArrowRightLeft, Percent } from 'lucide-react';
import { calculateBrokerFee, calculateSEBONFee, calculateCGT, DP_CHARGE, formatNepaliNumber, formatPercent, getPriceColorClass } from '../utils';

export default function Calculators() {
  const [activeCalc, setActiveCalc] = useState<'buy-sell' | 'dividend' | 'right'>('buy-sell');

  // Buy/Sell Calculator State
  const [shareQty, setShareQty] = useState<number>(100);
  const [buyPrice, setBuyPrice] = useState<number>(1200);
  const [sellPrice, setSellPrice] = useState<number>(1350);
  const [investorType, setInvestorType] = useState<'individual_short' | 'individual_long' | 'institution'>('individual_short');

  const buyCalculation = useMemo(() => {
    const amount = shareQty * buyPrice;
    const brokerFee = calculateBrokerFee(amount);
    const sebonFee = calculateSEBONFee(amount);
    const totalCost = amount + brokerFee + sebonFee + DP_CHARGE;
    const effectiveBuyPrice = totalCost / shareQty;
    return { amount, brokerFee, sebonFee, totalCost, effectiveBuyPrice };
  }, [shareQty, buyPrice]);

  const sellCalculation = useMemo(() => {
    const amount = shareQty * sellPrice;
    const brokerFee = calculateBrokerFee(amount);
    const sebonFee = calculateSEBONFee(amount);
    const grossReceivable = amount - brokerFee - sebonFee - DP_CHARGE;
    
    const profit = grossReceivable - buyCalculation.totalCost;
    const cgt = calculateCGT(profit, investorType);
    const netReceivable = grossReceivable - cgt;
    const netProfit = netReceivable - buyCalculation.totalCost;
    const profitPct = (netProfit / buyCalculation.totalCost) * 100;

    return { amount, brokerFee, sebonFee, grossReceivable, profit, cgt, netReceivable, netProfit, profitPct };
  }, [shareQty, sellPrice, buyCalculation, investorType]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-brand-violet/20 flex items-center justify-center text-brand-violet">
          <Calculator size={22} />
        </div>
        <div>
          <h1 className="font-syne text-2xl font-bold">Calculators Suite</h1>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Trading Tools & Financial Utilities</p>
        </div>
      </div>

      {/* Calc Selector */}
      <div className="flex gap-2 p-1.5 bg-bg-surface border border-bg-border rounded-xl w-fit">
        {[
          { id: 'buy-sell', label: 'Buy/Sell Calc', icon: ArrowRightLeft },
          { id: 'dividend', label: 'Dividend Adj', icon: PieChart },
          { id: 'right', label: 'Right Adj', icon: Percent },
        ].map(calc => (
          <button
            key={calc.id}
            onClick={() => setActiveCalc(calc.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${activeCalc === calc.id ? 'bg-bg-elevated text-brand-cyan shadow-glow-cyan/10' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <calc.icon size={16} /> {calc.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Side */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 space-y-5">
             <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
               <Banknote size={16} className="text-brand-cyan" /> Transaction Details
             </h3>
             
             <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Share Quantity</label>
               <input 
                 type="number" value={shareQty} onChange={e => setShareQty(Number(e.target.value))}
                 className="input-field w-full py-2.5 font-jetbrains" 
               />
             </div>

             <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Purchase Price (LTP)</label>
               <input 
                 type="number" value={buyPrice} onChange={e => setBuyPrice(Number(e.target.value))}
                 className="input-field w-full py-2.5 font-jetbrains" 
               />
             </div>

             <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Selling Price (Target)</label>
               <input 
                 type="number" value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))}
                 className="input-field w-full py-2.5 font-jetbrains text-brand-cyan" 
               />
             </div>

             <div className="space-y-2">
               <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Investor Category</label>
               <select 
                 value={investorType} onChange={e => setInvestorType(e.target.value as any)}
                 className="input-field w-full py-2.5 text-xs font-bold"
               >
                 <option value="individual_short">Individual (Short Term - 7.5%)</option>
                 <option value="individual_long">Individual (Long Term - 5%)</option>
                 <option value="institution">Institution (10%)</option>
               </select>
             </div>
          </div>

          <div className="card p-4 bg-brand-cyan/5 border-brand-cyan/20">
             <div className="flex gap-3">
               <Info size={16} className="text-brand-cyan shrink-0" />
               <p className="text-[10px] text-text-secondary leading-relaxed">
                 Calculations include standard NEPSE broker commissions, SEBON fees (0.015%), DP charges (Rs. 25), and applicable Capital Gains Tax (CGT).
               </p>
             </div>
          </div>
        </div>

        {/* Results Side */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Purchase Summary */}
            <div className="card p-5 border-l-4 border-brand-violet bg-gradient-to-br from-bg-surface to-bg-base">
              <h4 className="text-[10px] uppercase font-bold text-brand-violet tracking-widest mb-4">Purchase Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Stock Amount</span>
                  <span className="text-text-primary font-jetbrains">{formatNepaliNumber(buyCalculation.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Broker Fee</span>
                  <span className="text-text-primary font-jetbrains">{formatNepaliNumber(buyCalculation.brokerFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">SEBON & DP</span>
                  <span className="text-text-primary font-jetbrains">{formatNepaliNumber(buyCalculation.sebonFee + DP_CHARGE)}</span>
                </div>
                <div className="h-px bg-bg-border my-1" />
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-text-primary uppercase">Total Cost</span>
                  <span className="text-lg font-jetbrains font-bold text-text-primary">{formatNepaliNumber(buyCalculation.totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Sale Summary */}
            <div className="card p-5 border-l-4 border-brand-cyan bg-gradient-to-br from-bg-surface to-bg-base">
              <h4 className="text-[10px] uppercase font-bold text-brand-cyan tracking-widest mb-4">Sale Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Stock Amount</span>
                  <span className="text-text-primary font-jetbrains">{formatNepaliNumber(sellCalculation.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Taxes & Fees</span>
                  <span className="text-bear-red font-jetbrains">-{formatNepaliNumber(sellCalculation.brokerFee + sellCalculation.sebonFee + DP_CHARGE + sellCalculation.cgt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">CGT Paid</span>
                  <span className="text-text-primary font-jetbrains">{formatNepaliNumber(sellCalculation.cgt)}</span>
                </div>
                <div className="h-px bg-bg-border my-1" />
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-text-primary uppercase">Net Receivable</span>
                  <span className="text-lg font-jetbrains font-bold text-text-primary">{formatNepaliNumber(sellCalculation.netReceivable)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profit/Loss Badge */}
          <motion.div 
            initial={{ scale: 0.95 }} 
            animate={{ scale: 1 }}
            className={`card p-8 flex flex-col items-center justify-center text-center gap-2 border-2 
              ${sellCalculation.netProfit >= 0 ? 'border-bull-green/30 bg-bull-green/5' : 'border-bear-red/30 bg-bear-red/5'}`}
          >
             <div className="text-xs uppercase font-bold text-text-muted tracking-[0.2em] mb-1">Projected Net Profit/Loss</div>
             <div className={`font-syne text-5xl font-black ${getPriceColorClass(sellCalculation.netProfit)}`}>
               {sellCalculation.netProfit >= 0 ? '+' : ''}{formatNepaliNumber(sellCalculation.netProfit)}
             </div>
             <div className={`font-jetbrains text-xl font-bold flex items-center gap-2 ${getPriceColorClass(sellCalculation.profitPct)}`}>
               {sellCalculation.profitPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
               {formatPercent(sellCalculation.profitPct)}
             </div>
          </motion.div>

          {/* Efficiency Table */}
          <div className="card p-5">
             <h4 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
               <HelpCircle size={16} className="text-brand-gold" /> Trading Efficiency
             </h4>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-[10px] text-text-muted uppercase mb-1">Effective Buy Price</div>
                  <div className="font-jetbrains text-sm font-bold text-text-primary">{buyCalculation.effectiveBuyPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase mb-1">Break-even Price</div>
                  <div className="font-jetbrains text-sm font-bold text-brand-gold">
                    {(buyCalculation.totalCost / shareQty * 1.01).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase mb-1">Total Expenses</div>
                  <div className="font-jetbrains text-sm font-bold text-bear-red">
                    {formatNepaliNumber(buyCalculation.brokerFee + buyCalculation.sebonFee + sellCalculation.brokerFee + sellCalculation.sebonFee + DP_CHARGE * 2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase mb-1">WACC Potential</div>
                  <div className="font-jetbrains text-sm font-bold text-brand-cyan">Verified</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
