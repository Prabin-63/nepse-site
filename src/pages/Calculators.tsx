import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Banknote, PieChart, TrendingUp, TrendingDown, Info, ArrowRightLeft, Percent, Plus, X, Search, Save, Bookmark, Trash2 } from 'lucide-react';
import { calculateBrokerFee, calculateSEBONFee, calculateCGT, DP_CHARGE, formatNepaliNumber, formatPercent, getPriceColorClass } from '../utils';
import { useLiveTrading } from '../hooks/useNepseData';

export default function Calculators() {
  const [activeCalc, setActiveCalc] = useState<'buy-sell' | 'dividend' | 'right'>('buy-sell');
  const { data: liveMarketData } = useLiveTrading();

  // Symbol Search & Selection
  const [symbolQuery, setSymbolQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Buy/Sell State
  const [purchases, setPurchases] = useState<{ id: number, qty: number, price: number }[]>([
    { id: Date.now(), qty: 100, price: 1200 }
  ]);
  const [sellPrice, setSellPrice] = useState<number>(1350);
  const [targetProfit, setTargetProfit] = useState<number>(0);
  const [investorType, setInvestorType] = useState<'individual_short' | 'individual_long' | 'institution'>('individual_short');

  // Dividend State
  const [divMarketPrice, setDivMarketPrice] = useState<number>(500);
  const [bonusPercent, setBonusPercent] = useState<number>(10);
  const [cashPercent, setCashPercent] = useState<number>(5);
  const [paidUpValue] = useState<number>(100);

  // Right State
  const [rightMarketPrice, setRightMarketPrice] = useState<number>(400);
  const [rightRatio, setRightRatio] = useState<number>(50);

  // Saved Calculations State
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const [showSavedPanel, setShowSavedPanel] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nepse_saved_calcs');
    if (saved) {
      try { setSavedCalculations(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const saveCurrentCalculation = () => {
    const newSave = {
      id: Date.now(),
      symbol: symbolQuery || 'Unknown',
      type: activeCalc,
      date: new Date().toLocaleString(),
      state: activeCalc === 'buy-sell' ? { purchases, sellPrice, targetProfit, investorType } :
             activeCalc === 'dividend' ? { divMarketPrice, bonusPercent, cashPercent, paidUpValue } :
             { rightMarketPrice, rightRatio, paidUpValue }
    };
    const updated = [newSave, ...savedCalculations].slice(0, 20); // keep last 20
    setSavedCalculations(updated);
    localStorage.setItem('nepse_saved_calcs', JSON.stringify(updated));
  };

  const loadSavedCalculation = (save: any) => {
    setActiveCalc(save.type);
    setSymbolQuery(save.symbol);
    if (save.type === 'buy-sell') {
      setPurchases(save.state.purchases);
      setSellPrice(save.state.sellPrice);
      setTargetProfit(save.state.targetProfit);
      setInvestorType(save.state.investorType);
    } else if (save.type === 'dividend') {
      setDivMarketPrice(save.state.divMarketPrice);
      setBonusPercent(save.state.bonusPercent);
      setCashPercent(save.state.cashPercent);
    } else {
      setRightMarketPrice(save.state.rightMarketPrice);
      setRightRatio(save.state.rightRatio);
    }
    setShowSavedPanel(false);
  };

  const deleteSavedCalculation = (id: number) => {
    const updated = savedCalculations.filter(s => s.id !== id);
    setSavedCalculations(updated);
    localStorage.setItem('nepse_saved_calcs', JSON.stringify(updated));
  };

  // Symbol Autocomplete handling
  const filteredSymbols = useMemo(() => {
    if (!symbolQuery || !liveMarketData) return [];
    const q = symbolQuery.toLowerCase();
    return liveMarketData.filter((s: any) => 
      s.symbol.toLowerCase().includes(q) || 
      (s.companyName && s.companyName.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [symbolQuery, liveMarketData]);

  const selectSymbol = (s: any) => {
    const ltp = Number(s.lastTradedPrice || s.ltp || 0);
    setSymbolQuery(s.symbol);
    setShowDropdown(false);
    
    // Auto-fill inputs based on active tab
    if (activeCalc === 'buy-sell') {
      setSellPrice(ltp);
      if (purchases.length === 1 && purchases[0].qty === 100 && purchases[0].price === 1200) {
        setPurchases([{ id: Date.now(), qty: 100, price: ltp }]);
      }
    } else if (activeCalc === 'dividend') {
      setDivMarketPrice(ltp);
    } else if (activeCalc === 'right') {
      setRightMarketPrice(ltp);
    }
  };

  // Buy/Sell Calculations
  const buyCalculation = useMemo(() => {
    let totalQty = 0;
    let totalBaseAmount = 0;
    let totalBrokerFee = 0;
    let totalSebonFee = 0;
    let totalDpCharge = 0;

    purchases.forEach(p => {
      const amt = p.qty * p.price;
      const bFee = calculateBrokerFee(amt);
      const sFee = calculateSEBONFee(amt);
      totalQty += p.qty;
      totalBaseAmount += amt;
      totalBrokerFee += bFee;
      totalSebonFee += sFee;
      totalDpCharge += DP_CHARGE; // 25 per purchase transaction
    });

    const totalCost = totalBaseAmount + totalBrokerFee + totalSebonFee + totalDpCharge;
    const wacc = totalQty > 0 ? totalCost / totalQty : 0;

    return { totalQty, totalBaseAmount, totalBrokerFee, totalSebonFee, totalDpCharge, totalCost, wacc };
  }, [purchases]);

  const sellCalculation = useMemo(() => {
    const { totalQty, totalCost, wacc } = buyCalculation;
    if (totalQty === 0) return null;

    const sellBaseAmount = totalQty * sellPrice;
    const sellBrokerFee = calculateBrokerFee(sellBaseAmount);
    const sellSebonFee = calculateSEBONFee(sellBaseAmount);
    const sellDpCharge = DP_CHARGE; // Single charge for selling total qty
    
    const grossReceivable = sellBaseAmount - sellBrokerFee - sellSebonFee - sellDpCharge;
    const profit = grossReceivable - totalCost;
    const cgt = calculateCGT(profit, investorType);
    
    const netReceivable = grossReceivable - cgt;
    const netProfit = netReceivable - totalCost;
    const profitPct = (netProfit / totalCost) * 100;

    // Target Profit Calculation (Reverse calculation to find required sell price)
    // Target Profit = Net Receivable - Total Cost
    // Net Receivable = Target Profit + Total Cost
    // Gross Receivable - CGT = Target Profit + Total Cost
    // Gross Receivable = (Qty * TargetSellPrice) - BrokerFee - SebonFee - DP
    // This is a non-linear equation due to slabs in BrokerFee and CGT.
    // We can approximate it with a binary search to find the required sell price.
    let targetSellPrice = 0;
    if (targetProfit > 0) {
      let low = wacc;
      let high = wacc * 10;
      for (let i = 0; i < 30; i++) {
        let mid = (low + high) / 2;
        let pBase = totalQty * mid;
        let pBroker = calculateBrokerFee(pBase);
        let pSebon = calculateSEBONFee(pBase);
        let pGross = pBase - pBroker - pSebon - sellDpCharge;
        let pProf = pGross - totalCost;
        let pCgt = calculateCGT(pProf, investorType);
        let pNet = (pGross - pCgt) - totalCost;
        
        if (pNet < targetProfit) low = mid;
        else high = mid;
      }
      targetSellPrice = high;
    }

    return {
      sellBaseAmount, sellBrokerFee, sellSebonFee, sellDpCharge, 
      grossReceivable, profit, cgt, netReceivable, netProfit, profitPct, targetSellPrice
    };
  }, [buyCalculation, sellPrice, investorType, targetProfit]);

  const dividendCalculation = useMemo(() => {
    const bonusDecimal = bonusPercent / 100;
    const cashPerShare = (cashPercent / 100) * paidUpValue;
    const adjustedPrice = divMarketPrice / (1 + bonusDecimal);
    const dividendYield = ((cashPerShare + (bonusDecimal * paidUpValue)) / divMarketPrice) * 100;
    return { adjustedPrice, cashPerShare, dividendYield };
  }, [divMarketPrice, bonusPercent, cashPercent, paidUpValue]);

  const rightCalculation = useMemo(() => {
    const ratioDecimal = rightRatio / 100;
    const adjustedPrice = (rightMarketPrice + (paidUpValue * ratioDecimal)) / (1 + ratioDecimal);
    return { adjustedPrice };
  }, [rightMarketPrice, rightRatio, paidUpValue]);

  // Purchase Rows Management
  const addPurchase = () => {
    setPurchases([...purchases, { id: Date.now(), qty: 100, price: purchases[purchases.length-1]?.price || 0 }]);
  };
  const updatePurchase = (id: number, field: 'qty' | 'price', val: number) => {
    setPurchases(purchases.map(p => p.id === id ? { ...p, [field]: val } : p));
  };
  const removePurchase = (id: number) => {
    if (purchases.length > 1) setPurchases(purchases.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-violet/20 flex items-center justify-center text-brand-violet">
            <Calculator size={22} />
          </div>
          <div>
            <h1 className="font-syne text-2xl font-bold">Calculators Suite</h1>
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Trading Tools & Financial Utilities</p>
          </div>
        </div>
        
        {/* Symbol Lookup */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search symbol (e.g. NABIL) for LTP" 
            value={symbolQuery}
            onChange={e => { setSymbolQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="input-field w-full pl-9 py-2 text-sm uppercase"
          />
          <AnimatePresence>
            {showDropdown && filteredSymbols.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-bg-border rounded-lg shadow-xl z-50 overflow-hidden"
              >
                {filteredSymbols.map((s: any) => (
                  <div 
                    key={s.symbol} 
                    onClick={() => selectSymbol(s)}
                    className="px-4 py-2 hover:bg-bg-elevated cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-text-primary text-sm">{s.symbol}</div>
                      <div className="text-[10px] text-text-muted">{s.companyName}</div>
                    </div>
                    <div className="font-jetbrains font-bold text-brand-cyan">Rs. {s.lastTradedPrice || s.ltp}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
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
        
        <div className="flex items-center gap-3">
          <button onClick={saveCurrentCalculation} className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm border-brand-cyan/30 hover:border-brand-cyan text-brand-cyan">
            <Save size={16} /> Save Setup
          </button>
          <button onClick={() => setShowSavedPanel(true)} className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm relative">
            <Bookmark size={16} /> Saved
            {savedCalculations.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-cyan text-bg-base text-[10px] font-bold flex items-center justify-center">
                {savedCalculations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {activeCalc === 'buy-sell' && (
          <>
            {/* Input Side (Left) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="card p-5 space-y-5">
                 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
                   <Banknote size={16} className="text-brand-cyan" /> Purchase Lots
                 </h3>
                 
                 <div className="space-y-3">
                   {purchases.map((p, i) => (
                     <div key={p.id} className="flex gap-2 items-end">
                       <div className="flex-1 space-y-1">
                         {i === 0 && <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Share Qty</label>}
                         <input type="number" value={p.qty} onChange={e => updatePurchase(p.id, 'qty', Number(e.target.value))} className="input-field w-full py-2 font-jetbrains" />
                       </div>
                       <div className="flex-1 space-y-1">
                         {i === 0 && <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Purchase Price</label>}
                         <input type="number" value={p.price} onChange={e => updatePurchase(p.id, 'price', Number(e.target.value))} className="input-field w-full py-2 font-jetbrains" />
                       </div>
                       {purchases.length > 1 && (
                         <button onClick={() => removePurchase(p.id)} className="p-2.5 text-text-muted hover:text-bear-red hover:bg-bear-red/10 rounded-lg transition-colors mb-0.5">
                           <X size={16} />
                         </button>
                       )}
                     </div>
                   ))}
                   <button onClick={addPurchase} className="w-full py-2 border border-dashed border-bg-border text-text-secondary hover:text-brand-cyan hover:border-brand-cyan/50 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all">
                     <Plus size={14} /> Add Purchase Lot
                   </button>
                 </div>

                 <div className="p-3 bg-bg-base/50 rounded-lg border border-bg-border flex justify-between items-center">
                   <span className="text-xs text-text-muted font-bold uppercase tracking-wider">WACC (Avg Buy Price)</span>
                   <span className="font-jetbrains font-bold text-lg text-brand-cyan">Rs. {buyCalculation.wacc.toFixed(2)}</span>
                 </div>

                 <div className="h-px bg-bg-border" />

                 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
                   <TrendingUp size={16} className="text-brand-gold" /> Sell Settings
                 </h3>

                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Selling Price (LTP / Target)</label>
                   <input type="number" value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))} className="input-field w-full py-2.5 font-jetbrains text-bull-green text-lg" />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Holding Period (CGT Rate)</label>
                   <select value={investorType} onChange={e => setInvestorType(e.target.value as any)} className="input-field w-full py-2.5 text-xs font-bold">
                     <option value="individual_short">Individual (Less than 365 days - 7.5%)</option>
                     <option value="individual_long">Individual (More than 365 days - 5%)</option>
                     <option value="institution">Institution (Corporate - 10%)</option>
                   </select>
                 </div>
              </div>
            </div>

            {/* Results Side (Right) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BUY BREAKDOWN */}
                <div className="card p-5 border-l-4 border-brand-violet bg-gradient-to-br from-bg-surface to-bg-base">
                  <h4 className="text-[10px] uppercase font-bold text-brand-violet tracking-widest mb-4">Total Purchase Breakdown</h4>
                  <div className="space-y-3 font-jetbrains">
                    <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">Total Shares</span><span>{buyCalculation.totalQty}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">Purchase Amount</span><span>Rs. {formatNepaliNumber(buyCalculation.totalBaseAmount)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">Broker Commission</span><span>Rs. {formatNepaliNumber(buyCalculation.totalBrokerFee)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">SEBON Fee (0.015%)</span><span>Rs. {formatNepaliNumber(buyCalculation.totalSebonFee)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">DP Charge (Rs. 25 × {purchases.length})</span><span>Rs. {formatNepaliNumber(buyCalculation.totalDpCharge)}</span></div>
                    <div className="h-px bg-bg-border my-1" />
                    <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase font-sans text-text-muted">Total Cost</span><span className="text-lg font-bold text-text-primary">Rs. {formatNepaliNumber(buyCalculation.totalCost)}</span></div>
                  </div>
                </div>

                {/* SELL BREAKDOWN */}
                {sellCalculation && (
                  <div className="card p-5 border-l-4 border-brand-cyan bg-gradient-to-br from-bg-surface to-bg-base">
                    <h4 className="text-[10px] uppercase font-bold text-brand-cyan tracking-widest mb-4">Sale Breakdown</h4>
                    <div className="space-y-3 font-jetbrains">
                      <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">Sell Amount</span><span>Rs. {formatNepaliNumber(sellCalculation.sellBaseAmount)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">Broker Commission</span><span className="text-bear-red">-Rs. {formatNepaliNumber(sellCalculation.sellBrokerFee)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">SEBON Fee (0.015%)</span><span className="text-bear-red">-Rs. {formatNepaliNumber(sellCalculation.sellSebonFee)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">DP Charge (Flat)</span><span className="text-bear-red">-Rs. 25.00</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted font-sans text-xs">Capital Gains Tax (CGT)</span><span className="text-bear-red">-Rs. {formatNepaliNumber(sellCalculation.cgt)}</span></div>
                      <div className="h-px bg-bg-border my-1" />
                      <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase font-sans text-text-muted">Net Receivable</span><span className="text-lg font-bold text-text-primary">Rs. {formatNepaliNumber(sellCalculation.netReceivable)}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* NET PROFIT/LOSS */}
              {sellCalculation && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className={`card p-8 flex flex-col items-center justify-center text-center gap-2 border-2 ${sellCalculation.netProfit >= 0 ? 'border-bull-green/30 bg-bull-green/5' : 'border-bear-red/30 bg-bear-red/5'}`}>
                   <div className="text-xs uppercase font-bold text-text-muted tracking-[0.2em] mb-1">Projected Net Profit/Loss</div>
                   <div className={`font-jetbrains text-5xl font-black ${getPriceColorClass(sellCalculation.netProfit)}`}>
                     {sellCalculation.netProfit >= 0 ? '+' : ''}Rs. {formatNepaliNumber(sellCalculation.netProfit)}
                   </div>
                   <div className={`font-jetbrains text-xl font-bold flex items-center gap-2 ${getPriceColorClass(sellCalculation.profitPct)}`}>
                     {sellCalculation.profitPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />} {formatPercent(sellCalculation.profitPct)}
                   </div>
                </motion.div>
              )}

              {/* TARGET PROFIT CALCULATOR */}
              {sellCalculation && (
                <div className="card p-5 border border-brand-gold/30 bg-brand-gold/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <TrendingUp size={16} className="text-brand-gold" /> Target Profit Calculator
                    </h4>
                    <p className="text-xs text-text-secondary">Enter your desired net profit amount to find the required sell price after all taxes and fees.</p>
                  </div>
                  <div className="flex-1 flex gap-3 items-end">
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Desired Profit (Rs.)</label>
                      <input type="number" value={targetProfit} onChange={e => setTargetProfit(Number(e.target.value))} className="input-field w-full py-2 font-jetbrains" placeholder="e.g. 5000" />
                    </div>
                    {targetProfit > 0 && (
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-gold tracking-wider">Required Sell Price</label>
                        <div className="w-full py-2 px-3 bg-bg-surface border border-brand-gold/30 rounded-lg font-jetbrains font-bold text-brand-gold">
                          Rs. {sellCalculation.targetSellPrice.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* DIVIDEND CALC */}
        {activeCalc === 'dividend' && (
          <>
            <div className="lg:col-span-5 space-y-4">
              <div className="card p-5 space-y-5">
                 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
                   <PieChart size={16} className="text-brand-cyan" /> Bonus Share Details
                 </h3>
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Market Price Before Book Close</label>
                   <input type="number" value={divMarketPrice} onChange={e => setDivMarketPrice(Number(e.target.value))} className="input-field w-full py-2.5 font-jetbrains" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Bonus Share (%)</label>
                   <input type="number" value={bonusPercent} onChange={e => setBonusPercent(Number(e.target.value))} className="input-field w-full py-2.5 font-jetbrains" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Cash Dividend (%)</label>
                   <input type="number" value={cashPercent} onChange={e => setCashPercent(Number(e.target.value))} className="input-field w-full py-2.5 font-jetbrains" />
                 </div>
                 <p className="text-[10px] text-text-muted italic border-t border-bg-border pt-3">
                   Note: TDS of 5% is applicable on both cash dividend and bonus shares. The cash dividend provided by the company is often used to cover the TDS for the bonus shares.
                 </p>
              </div>
            </div>
            <div className="lg:col-span-7 space-y-4">
               <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card p-8 flex flex-col items-center justify-center text-center gap-2 border-2 border-brand-cyan/30 bg-brand-cyan/5 h-full">
                 <div className="text-xs uppercase font-bold text-text-muted tracking-[0.2em] mb-1">Adjusted Price After Book Close</div>
                 <div className="font-jetbrains text-5xl font-black text-text-primary">Rs. {dividendCalculation.adjustedPrice.toFixed(2)}</div>
                 <div className="mt-6 flex flex-col sm:flex-row gap-6 text-sm">
                   <div className="bg-bg-surface px-4 py-3 rounded-lg border border-bg-border flex-1">
                     <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">Cash Per Share</span>
                     <span className="font-jetbrains font-bold text-lg text-brand-gold">Rs. {dividendCalculation.cashPerShare.toFixed(2)}</span>
                   </div>
                   <div className="bg-bg-surface px-4 py-3 rounded-lg border border-bg-border flex-1">
                     <span className="text-[10px] uppercase font-bold text-text-muted block mb-1">Total Dividend Yield</span>
                     <span className="font-jetbrains font-bold text-lg text-bull-green">{dividendCalculation.dividendYield.toFixed(2)}%</span>
                   </div>
                 </div>
              </motion.div>
            </div>
          </>
        )}

        {/* RIGHT CALC */}
        {activeCalc === 'right' && (
          <>
            <div className="lg:col-span-5 space-y-4">
              <div className="card p-5 space-y-5">
                 <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
                   <Percent size={16} className="text-brand-cyan" /> Right Share Details
                 </h3>
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Market Price Before Book Close</label>
                   <input type="number" value={rightMarketPrice} onChange={e => setRightMarketPrice(Number(e.target.value))} className="input-field w-full py-2.5 font-jetbrains" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Right Share Ratio (%) <span className="normal-case text-text-secondary">(e.g. 50 for 1:0.5)</span></label>
                   <input type="number" value={rightRatio} onChange={e => setRightRatio(Number(e.target.value))} className="input-field w-full py-2.5 font-jetbrains" />
                 </div>
              </div>
            </div>
            <div className="lg:col-span-7 space-y-4">
               <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card p-8 flex flex-col items-center justify-center text-center gap-2 border-2 border-brand-violet/30 bg-brand-violet/5 h-full">
                 <div className="text-xs uppercase font-bold text-text-muted tracking-[0.2em] mb-1">Adjusted Price After Right Issue</div>
                 <div className="font-jetbrains text-5xl font-black text-text-primary">Rs. {rightCalculation.adjustedPrice.toFixed(2)}</div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* Saved Calculations Side Panel Overlay */}
      <AnimatePresence>
        {showSavedPanel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSavedPanel(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-bg-surface border-l border-bg-border shadow-2xl z-50 flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-bg-border/50 bg-bg-base/50">
                <h2 className="font-syne font-bold text-xl flex items-center gap-2 text-text-primary">
                  <Bookmark className="text-brand-cyan" /> Saved Setups
                </h2>
                <button onClick={() => setShowSavedPanel(false)} className="p-2 rounded-full hover:bg-bg-elevated transition-colors text-text-muted hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {savedCalculations.length === 0 ? (
                  <div className="text-center p-8 text-text-muted mt-10">No saved calculations yet.</div>
                ) : (
                  savedCalculations.map(save => (
                    <div key={save.id} className="card p-4 bg-bg-base hover:border-brand-cyan/50 transition-colors group cursor-pointer" onClick={() => loadSavedCalculation(save)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${save.type === 'buy-sell' ? 'bg-brand-violet/20 text-brand-violet' : save.type === 'dividend' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-brand-gold/20 text-brand-gold'}`}>
                            {save.type.replace('-', '/')}
                          </span>
                          <span className="font-bold text-text-primary text-sm">{save.symbol}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteSavedCalculation(save.id); }} className="text-text-muted hover:text-bear-red opacity-0 group-hover:opacity-100 transition-opacity p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="text-[10px] text-text-secondary uppercase tracking-widest">{save.date}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
