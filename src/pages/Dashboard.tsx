import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
	TrendingUp,
	TrendingDown,
	BarChart3,
	Volume2,
	Banknote,
	Calendar,
	Zap,
	Activity,
	Flame,
	ChevronRight,
	Sparkles,
	Eye,
} from "lucide-react";
import {
	AreaChart,
	Area,
	ResponsiveContainer,
	XAxis,
	YAxis,
	Tooltip,
} from "recharts";
import { useDashboard } from "../hooks/useNepseData";
import {
	formatNPR,
	formatPercent,
	formatVolume,
	getPriceColorClass,
	formatNepaliNumber,
	formatNepaliWords,
} from "../utils";
import { generateMockOHLCV } from "../utils/mockData";
import TickerStrip from "../components/dashboard/TickerStrip";
import MarketBriefPanel from "../components/dashboard/MarketBriefPanel";
import TopMoverModal from "../components/dashboard/TopMoverModal";
import AIFlowBrief from "../components/sbie/AIFlowBrief";

const fadeUp = {
	hidden: { opacity: 0, y: 24 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.5,
			ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
		},
	},
};
const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			<AIFlowBrief />
			<div className="rounded-2xl bg-bg-surface border border-bg-border h-52 skeleton" />
			<div className="flex gap-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="h-9 rounded-full skeleton flex-1" />
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{[1, 2, 3].map((i) => (
					<div
						key={i}
						className="rounded-xl skeleton h-72 border border-bg-border"
					/>
				))}
			</div>
		</div>
	);
}

function MoverCard({
	stock,
	rank,
	type,
	onClick,
}: {
	stock: any;
	rank: number;
	type: "gainer" | "loser" | "volume" | "turnover";
	onClick: () => void;
}) {
	// Simplified flat design - no gradients, glowing effects
	const borderColor =
		type === "gainer"
			? "border-l-bull-green"
			: type === "loser"
				? "border-l-bear-red"
				: type === "turnover"
					? "border-l-brand-gold"
					: "border-l-brand-cyan";
	const rankBg =
		rank === 1
			? "bg-brand-gold text-bg-base"
			: rank === 2
				? "bg-text-secondary text-bg-base"
				: rank === 3
					? "bg-brand-violet text-white"
					: "bg-bg-border text-text-muted";

	return (
		<div
			onClick={onClick}
			className={`flex items-center gap-3 p-3 rounded-lg border border-bg-border/50 border-l-[3px] ${borderColor}
        bg-white dark:bg-bg-surface hover:bg-bg-elevated/50 cursor-pointer transition-colors group`}>
			<div
				className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankBg}`}>
				{rank}
			</div>
			<div className="flex-1 min-w-0">
				<div className="font-semibold text-text-primary text-sm group-hover:text-brand-cyan transition-colors truncate">
					{stock.symbol}
				</div>
				<div className="text-[10px] text-text-muted truncate">
					{stock.securityName || stock.companyName || ""}
				</div>
			</div>
			<div className="text-right shrink-0">
				{type === "volume" ? (
					<div className="font-jetbrains text-sm font-bold text-text-primary">
						{formatVolume(stock.shareTraded || stock.totalTradeQuantity || 0)}
					</div>
				) : type === "turnover" ? (
					<div className="font-jetbrains text-sm font-bold text-text-primary">
						{formatNPR(stock.turnover || stock.totalTradeValue || 0, true)}
					</div>
				) : (
					<>
						<div className="font-jetbrains text-sm font-medium text-text-primary">
							Rs. {formatNepaliNumber(stock.ltp || stock.lastTradedPrice || 0)}
						</div>
						<div
							className={`font-jetbrains text-xs font-bold ${getPriceColorClass(stock.percentageChange || 0)}`}>
							{formatPercent(stock.percentageChange || 0)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

const eventStyles: Record<string, string> = {
	ipo: "border-brand-cyan bg-brand-cyan/10 text-brand-cyan",
	agm: "border-brand-violet bg-brand-violet/10 text-brand-violet",
	dividend: "border-bull-green bg-bull-green/10 text-bull-green",
	bonus: "border-brand-gold bg-brand-gold/10 text-brand-gold",
	book_closure:
		"border-neutral-yellow bg-neutral-yellow/10 text-neutral-yellow",
	rights: "border-brand-cyan bg-brand-cyan/10 text-brand-cyan",
};

export default function Dashboard() {
	const navigate = useNavigate();
	const { data, isLoading, isError } = useDashboard();
	const [showMarketBrief, setShowMarketBrief] = useState(false);
	const [viewMoreList, setViewMoreList] = useState<
		"gainer" | "loser" | "volume" | "turnover" | null
	>(null);

	const derived = useMemo(() => {
		if (!data) return null;
		const {
			nepse_index,
			market_summary,
			top_gainers,
			top_losers,
			top_turnover,
			top_volume,
			sector_indices,
			live_market,
			floorsheet,
			events: apiEvents,
		} = data;
		const nepseIdxRaw = Array.isArray(nepse_index) 
			? nepse_index.find((i: any) => i.index === "NEPSE Index") || {}
			: {};
		const closeVal = nepseIdxRaw.currentValue ?? nepseIdxRaw.close ?? 0;
		const prevClose = nepseIdxRaw.previousClose ?? closeVal;
		const changeVal = nepseIdxRaw.change ?? closeVal - prevClose;
		const perChangeVal =
			nepseIdxRaw.perChange ??
			(prevClose > 0 ? (changeVal / prevClose) * 100 : 0);

		const nepseIdx = {
			currentValue: closeVal,
			change: changeVal,
			perChange: perChangeVal,
		};
		const summary = Array.isArray(market_summary) ? market_summary : [];
		const findSummary = (key: string) => {
			const val = summary.find((s: any) => s.detail?.includes(key))?.value || 0;
			if (typeof val === "string")
				return parseFloat(val.replace(/,/g, "")) || 0;
			return val;
		};

		const liveMarketData = Array.isArray(live_market) ? live_market : [];
		const advancing = liveMarketData.filter(
			(s: any) => s.percentageChange > 0,
		).length;
		const declining = liveMarketData.filter(
			(s: any) => s.percentageChange < 0,
		).length;

		const turnover = findSummary("Turnover");
		const sharesTraded = findSummary("Traded Shares");
		const transactions = findSummary("Transactions");
		const sectors = Array.isArray(sector_indices) 
			? sector_indices.slice().sort((a: any, b: any) => (b.perChange || 0) - (a.perChange || 0))
			: [];
		const leadingSector = sectors[0];
		const events = Array.isArray(apiEvents) ? apiEvents : [];

		// Prepare market brief data
		let topTransacted: any[] = [];
		let mostBulkBuy: any = null;
		let mostBulkSell: any = null;
		let largestTransaction: any = null;

		if (Array.isArray(floorsheet) && floorsheet.length > 0) {
			// Top 5 by transaction count
			const symbolMap = new Map();
			floorsheet.forEach((t: any) => {
				if (!symbolMap.has(t.symbol)) {
					symbolMap.set(t.symbol, {
						symbol: t.symbol,
						companyName: t.companyName,
						totalTradeQuantity: 0,
						totalTradeValue: 0,
						count: 0,
					});
				}
				const item = symbolMap.get(t.symbol);
				item.totalTradeQuantity += t.quantity || 0;
				item.totalTradeValue += (t.quantity || 0) * (t.tradedPrice || 0);
				item.count += 1;
			});
			topTransacted = Array.from(symbolMap.values())
				.sort((a: any, b: any) => b.count - a.count)
				.slice(0, 5);

			// Find bulk buy/sell
			const buys = floorsheet.filter((t: any) => t.type === "BUY" || !t.type);
			const sells = floorsheet.filter((t: any) => t.type === "SELL");

			if (buys.length > 0) {
				mostBulkBuy = buys.reduce((max: any, t: any) =>
					(t.quantity || 0) > (max.quantity || 0) ? t : max,
					buys[0]
				);
			}
			if (sells.length > 0) {
				mostBulkSell = sells.reduce((max: any, t: any) =>
					(t.quantity || 0) > (max.quantity || 0) ? t : max,
					sells[0]
				);
			}

			// Largest transaction
			if (floorsheet.length > 0) {
			    largestTransaction = floorsheet.reduce((max: any, t: any) =>
				    (t.quantity || 0) > (max.quantity || 0) ? t : max,
				    floorsheet[0]
			    );
			    if (largestTransaction) {
				    largestTransaction.type =
					    largestTransaction.type ||
					    (largestTransaction.buyerBrokerId ? "BUY" : "SELL");
			    }
			}
		}

		const insights: { emoji: string; text: string; color: string }[] = [];
		const hasBreadth = advancing > 0 || declining > 0;

		if (hasBreadth) {
			if (advancing > declining) {
				insights.push({
					emoji: "🟢",
					text: `${advancing} stocks moved up, ${declining} moved down`,
					color: "bull-green",
				});
			} else if (declining > advancing) {
				insights.push({
					emoji: "🔴",
					text: `${declining} stocks moved down, ${advancing} moved up`,
					color: "bear-red",
				});
			} else {
				insights.push({
					emoji: "🟡",
					text: `${advancing} stocks up and ${declining} down today`,
					color: "neutral-yellow",
				});
			}
		}
		const tg = (top_gainers || [])[0];
		if (tg)
			insights.push({
				emoji: "🔥",
				text: `${tg.symbol} gained the most at ${formatPercent(tg.percentageChange)}`,
				color: "bull-green",
			});
		if (leadingSector)
			insights.push({
				emoji: "📊",
				text: `${leadingSector.index} sector led with ${formatPercent(leadingSector.perChange || 0)} gain`,
				color: "brand-cyan",
			});

		return {
			nepseIdx,
			advancing,
			declining,
			turnover,
			sharesTraded,
			transactions,
			sectors,
			insights,
			events,
			topGainers: Array.isArray(top_gainers) ? top_gainers : [],
			topLosers: Array.isArray(top_losers) ? top_losers : [],
			topVolume: Array.isArray(top_volume) ? top_volume : [],
			topTurnover: Array.isArray(top_turnover) ? top_turnover : [],
			marketBriefData: {
				topTransacted,
				mostBulkBuy,
				mostBulkSell,
				largestTransaction,
			},
		};
	}, [data]);

	if (isLoading) return <DashboardSkeleton />;
	if (isError || !derived)
		return (
			<div className="card p-8 text-center border-bear-red/30">
				<span className="text-2xl">⚠️</span>
				<p className="text-bear-red mt-2">
					Could not load market data. Check your connection.
				</p>
			</div>
		);

	const {
		nepseIdx,
		advancing,
		declining,
		turnover,
		sharesTraded,
		transactions,
		sectors,
		insights,
		events,
		topGainers,
		topLosers,
		topVolume,
		marketBriefData,
	} = derived;

	const viewMoreData =
		viewMoreList === "gainer"
			? topGainers
			: viewMoreList === "loser"
				? topLosers
				: viewMoreList === "volume"
					? topVolume
					: derived.topTurnover;

	// Prepare NEPSE index chart data using history
	const nepseChartData = useMemo(() => {
		const rawIdx = data?.nepse_index?.find((i: any) => i.index === "NEPSE Index");
		if (rawIdx && Array.isArray(rawIdx.history) && rawIdx.history.length > 0) {
			return rawIdx.history.map((d: any, idx: number) => {
				let timeStr = `Point ${idx}`;
				if (d.time) {
					timeStr = d.time;
				} else if (d.date) {
					try {
						timeStr = new Date(d.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
					} catch (e) {}
				}
				return {
					time: timeStr,
					val: d.close || d.index || 0,
				};
			});
		}
		// Fallback mock if no history from API
		return generateMockOHLCV("NEPSE", 20, nepseIdx.currentValue).map((d) => ({
			time: d.time,
			val: d.close,
		}));
	}, [data, nepseIdx.currentValue]);

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={stagger}
			className="space-y-0">
			{/* Ticker Strip */}
			<TickerStrip />

			<TopMoverModal
				isOpen={!!viewMoreList}
				onClose={() => setViewMoreList(null)}
				type={viewMoreList}
				data={viewMoreData}
			/>

			{/* Detailed Market Briefing Modal Fullscreen */}
			{showMarketBrief && (
			  <div className="fixed inset-0 z-50 bg-bg-base/95 overflow-y-auto">
			      <div className="max-w-5xl mx-auto p-4 py-12">
			          <AIFlowBrief />
					  <MarketBriefPanel
						data={marketBriefData}
						onBack={() => setShowMarketBrief(false)}
						isLoading={isLoading}
					  />
				  </div>
			  </div>
			)}

			<div className="space-y-6 px-6 py-6">
				<motion.div
					variants={fadeUp}
					className="flex items-center justify-between gap-4 mb-2">
					<h2 className="font-syne text-xl font-bold flex items-center gap-2 text-text-primary">
						Market Overview
					</h2>
					<button
						onClick={() => setShowMarketBrief(true)}
						className="btn-primary py-2 px-6 whitespace-nowrap text-sm flex items-center gap-2">
						<Sparkles size={16} /> Detailed Briefing
					</button>
				</motion.div>

				{/* NEPSE Index Card - Change 3 */}
				<motion.div
					variants={fadeUp}
					className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-surface via-bg-surface to-bg-elevated border border-bg-border/80 p-6 lg:p-8">
					<div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-cyan/[0.04] rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-20 -left-20 w-56 h-56 bg-brand-violet/[0.04] rounded-full blur-3xl pointer-events-none" />

					<div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
								<span className="text-[11px] text-text-secondary uppercase tracking-[0.15em] font-medium">
									NEPSE Index
								</span>
							</div>
							<motion.div
								className="font-jetbrains text-5xl lg:text-6xl font-black text-text-primary tracking-tight"
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.6, ease: "easeOut" }}>
								{formatNepaliNumber(nepseIdx.currentValue)}
							</motion.div>
							<div className="flex items-center gap-3 flex-wrap">
								<span
									className={`font-jetbrains text-xl font-bold ${getPriceColorClass(nepseIdx.change)}`}>
									{nepseIdx.change >= 0 ? "+" : ""}
									{(nepseIdx.change || 0).toFixed(2)}
								</span>
								<span
									className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold font-jetbrains ${
										(nepseIdx.perChange || 0) >= 0
											? "bg-bull-green/15 text-bull-green"
											: "bg-bear-red/15 text-bear-red"
									}`}>
									{(nepseIdx.perChange || 0) >= 0 ? (
										<TrendingUp size={14} />
									) : (
										<TrendingDown size={14} />
									)}
									{formatPercent(nepseIdx.perChange || 0)}
								</span>
							</div>
						</div>

						<div className="h-40 w-full flex justify-center opacity-90 pl-4 pt-4">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={nepseChartData}>
									<defs>
										<linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor={nepseIdx.change >= 0 ? "#00e676" : "#ff1744"}
												stopOpacity={0.4}
											/>
											<stop
												offset="95%"
												stopColor={nepseIdx.change >= 0 ? "#00e676" : "#ff1744"}
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<XAxis
										dataKey="time"
										stroke="#8a91a5"
										fontSize={10}
										tickLine={false}
										axisLine={false}
										minTickGap={20}
									/>
									<YAxis
										domain={["auto", "auto"]}
										stroke="#8a91a5"
										fontSize={10}
										tickLine={false}
										axisLine={false}
										width={45}
										tickFormatter={(val) => val.toFixed(0)}
										orientation="right"
										tickCount={5}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "#1e222d",
											borderColor: "#2a2e39",
											borderRadius: "8px",
											color: "#e0e3eb"
										}}
										itemStyle={{ color: nepseIdx.change >= 0 ? "#089981" : "#f23645", fontWeight: "bold" }}
										labelStyle={{ color: "#8a91a5", marginBottom: "4px" }}
										formatter={(value: any) => [`${Number(value).toFixed(2)}`, "Index"]}
										labelFormatter={(label: any) => `Time: ${label}`}
									/>
									<Area
										type="monotone"
										dataKey="val"
										name="Index"
										stroke={nepseIdx.change >= 0 ? "#00e676" : "#ff1744"}
										strokeWidth={2}
										fillOpacity={1}
										fill="url(#colorIndex)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>

						<div className="grid grid-cols-2 gap-3">
							{[
								{
									label: "कारोबार रकम",
									value: formatNepaliWords(turnover),
									icon: Banknote,
									color: "text-brand-gold",
								},
								{
									label: "Volume",
									value: formatVolume(sharesTraded),
									icon: Volume2,
									color: "text-brand-cyan",
								},
								{
									label: "Transactions",
									value: formatNepaliNumber(transactions, 0),
									icon: Activity,
									color: "text-brand-violet",
								},
								{
									label: "Breadth",
									value:
										advancing > 0 || declining > 0
											? `${advancing}↑ ${declining}↓`
											: "N/A",
									icon: BarChart3,
									color: "text-text-primary",
								},
							].map((stat) => (
								<div
									key={stat.label}
									className="rounded-xl bg-bg-base/60 border border-bg-border/50 p-3">
									<div className="flex items-center gap-1.5 mb-1">
										<stat.icon size={12} className={stat.color} />
										<span className="text-[10px] text-text-muted uppercase tracking-wider">
											{stat.label}
										</span>
									</div>
									<div
										className={`font-jetbrains text-xs font-bold ${stat.color}`}>
										{stat.value}
									</div>
								</div>
							))}
						</div>
					</div>
				</motion.div>

				<motion.div variants={fadeUp} className="flex flex-wrap gap-2">
					<div className="flex items-center gap-1.5 mr-1">
						<Sparkles size={14} className="text-brand-gold" />
						<span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
							Insights
						</span>
					</div>
					{insights.map((ins, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.3 + i * 0.1 }}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                bg-${ins.color}/10 text-${ins.color} border border-${ins.color}/20`}>
							<span>{ins.emoji}</span>
							<span>{ins.text}</span>
						</motion.div>
					))}
				</motion.div>

				{/* Top Gainers, Losers, Top Transactions, Top Turnover - Change 4 */}
				<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
					<motion.div variants={fadeUp} className="card p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="font-syne text-base font-bold flex items-center gap-2">
								<TrendingUp size={16} className="text-bull-green" /> Top Gainers
							</h2>
							<button
								onClick={() => setViewMoreList("gainer")}
								className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
								View more <ChevronRight size={12} />
							</button>
						</div>
						<motion.div variants={stagger} className="space-y-2">
							{topGainers.slice(0, 5).map((s: any, i: number) => (
								<MoverCard
									key={s.symbol}
									stock={s}
									rank={i + 1}
									type="gainer"
									onClick={() => navigate(`/stock/${s.symbol}`)}
								/>
							))}
							{topGainers.length === 0 && (
								<p className="text-sm text-text-muted text-center py-8">
									No data available
								</p>
							)}
						</motion.div>
					</motion.div>

					<motion.div variants={fadeUp} className="card p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="font-syne text-base font-bold flex items-center gap-2">
								<TrendingDown size={16} className="text-bear-red" /> Top Losers
							</h2>
							<button
								onClick={() => setViewMoreList("loser")}
								className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
								View more <ChevronRight size={12} />
							</button>
						</div>
						<motion.div variants={stagger} className="space-y-2">
							{topLosers.slice(0, 5).map((s: any, i: number) => (
								<MoverCard
									key={s.symbol}
									stock={s}
									rank={i + 1}
									type="loser"
									onClick={() => navigate(`/stock/${s.symbol}`)}
								/>
							))}
							{topLosers.length === 0 && (
								<p className="text-sm text-text-muted text-center py-8">
									No data available
								</p>
							)}
						</motion.div>
					</motion.div>

					<motion.div variants={fadeUp} className="card p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="font-syne text-base font-bold flex items-center gap-2">
								<Activity size={16} className="text-brand-cyan" /> Top
								Transactions
							</h2>
							<button
								onClick={() => setViewMoreList("volume")}
								className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
								View more <ChevronRight size={12} />
							</button>
						</div>
						<motion.div variants={stagger} className="space-y-2">
							{topVolume.slice(0, 5).map((s: any, i: number) => (
								<MoverCard
									key={s.symbol}
									stock={s}
									rank={i + 1}
									type="volume"
									onClick={() => navigate(`/stock/${s.symbol}`)}
								/>
							))}
							{topVolume.length === 0 && (
								<p className="text-sm text-text-muted text-center py-8">
									No data available
								</p>
							)}
						</motion.div>
					</motion.div>

					<motion.div variants={fadeUp} className="card p-5">
						<div className="flex items-center justify-between mb-4">
							<h2 className="font-syne text-base font-bold flex items-center gap-2">
								<Banknote size={16} className="text-brand-gold" /> Top Turnover
							</h2>
							<button
								onClick={() => setViewMoreList("turnover")}
								className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
								View more <ChevronRight size={12} />
							</button>
						</div>
						<motion.div variants={stagger} className="space-y-2">
							{derived.topTurnover.slice(0, 5).map((s: any, i: number) => (
								<MoverCard
									key={s.symbol}
									stock={s}
									rank={i + 1}
									type="turnover"
									onClick={() => navigate(`/stock/${s.symbol}`)}
								/>
							))}
							{derived.topTurnover.length === 0 && (
								<p className="text-sm text-text-muted text-center py-8">
									No data available
								</p>
							)}
						</motion.div>
					</motion.div>
				</div>

				<motion.div variants={fadeUp} className="card p-5">
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-syne text-base font-bold flex items-center gap-2">
							<Zap size={16} className="text-brand-cyan" /> Sector Performance
						</h2>
						<button
							onClick={() => navigate("/sector")}
							className="text-xs text-text-muted hover:text-brand-cyan flex items-center gap-0.5 transition-colors">
							Details <ChevronRight size={12} />
						</button>
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
						{sectors.map((sector: any) => {
							const pc = sector.perChange || 0;
							const intensity = Math.min(Math.abs(pc) / 3, 1);
							const bg =
								pc >= 0
									? `rgba(0,196,140,${0.08 + intensity * 0.3})`
									: `rgba(255,77,79,${0.08 + intensity * 0.3})`;

							const sectorStocks = (data?.live_market || []).filter(
								(s: any) =>
									s.sector === sector.index ||
									s.sectorName === sector.index ||
									s.sector_name === sector.index,
							);
							let up = sector.stocksUp;
							let down = sector.stocksDown;
							if (up === undefined && sectorStocks.length > 0) {
								up = sectorStocks.filter(
									(s: any) => s.percentageChange > 0,
								).length;
								down = sectorStocks.filter(
									(s: any) => s.percentageChange < 0,
								).length;
							}

							const hasBreadth = up !== undefined && down !== undefined;

							return (
								<motion.div
									key={sector.id || sector.index}
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.98 }}
									onClick={() => navigate("/sector")}
									className="rounded-xl p-3 border border-bg-border/50 cursor-pointer transition-shadow hover:shadow-lg flex flex-col justify-between"
									style={{ background: bg, minHeight: "84px" }}>
									<div>
										<div
											className="text-xs font-semibold text-text-primary truncate"
											title={sector.index}>
											{sector.index}
										</div>
										<div
											className={`font-jetbrains text-lg font-black mt-1 ${getPriceColorClass(pc)}`}>
											{formatPercent(pc)}
										</div>
									</div>
									{hasBreadth && (
										<div className="flex items-center gap-1 mt-2 text-[10px] bg-bg-surface/30 w-max px-1.5 py-0.5 rounded">
											<span className="text-bull-green font-bold">{up}↑</span>
											<span className="text-text-muted">/</span>
											<span className="text-bear-red font-bold">{down}↓</span>
										</div>
									)}
								</motion.div>
							);
						})}
					</div>
				</motion.div>

				<div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
					<motion.div variants={fadeUp} className="lg:col-span-2 card p-5">
						<h2 className="font-syne text-base font-bold mb-4 flex items-center gap-2">
							<Eye size={16} className="text-brand-violet" /> Quick Actions
						</h2>
						<div className="grid grid-cols-2 gap-2">
							{[
								{
									label: "Live Market",
									desc: "All stocks & prices",
									path: "/live-market",
									color: "from-brand-cyan/20 to-brand-cyan/5",
									icon: Activity,
								},
								{
									label: "Screener",
									desc: "Filter & find stocks",
									path: "/screener",
									color: "from-brand-violet/20 to-brand-violet/5",
									icon: BarChart3,
								},
								{
									label: "Portfolio",
									desc: "Track your holdings",
									path: "/portfolio",
									color: "from-bull-green/20 to-bull-green/5",
									icon: TrendingUp,
								},
								{
									label: "Calculators",
									desc: "Profit & fee calc",
									path: "/calculators",
									color: "from-brand-gold/20 to-brand-gold/5",
									icon: Banknote,
								},
							].map((action) => (
								<motion.button
									key={action.path}
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => navigate(action.path)}
									className={`rounded-xl p-4 bg-gradient-to-br ${action.color} border border-bg-border/50
                    text-left hover:border-bg-border transition-all group`}>
									<action.icon
										size={20}
										className="text-text-secondary group-hover:text-text-primary transition-colors mb-2"
									/>
									<div className="font-semibold text-sm text-text-primary">
										{action.label}
									</div>
									<div className="text-[10px] text-text-muted mt-0.5">
										{action.desc}
									</div>
								</motion.button>
							))}
						</div>
					</motion.div>

					<motion.div variants={fadeUp} className="lg:col-span-3 card p-5">
						<h2 className="font-syne text-base font-bold mb-4 flex items-center gap-2">
							<Calendar size={16} className="text-brand-gold" /> Upcoming Events
						</h2>
						<div className="space-y-2">
							{events.slice(0, 5).map((evt: any) => (
								<div
									key={evt.id}
									className={`rounded-xl p-3 border ${eventStyles[evt.type] || "border-bg-border bg-bg-base/30"} cursor-pointer
                    hover:scale-[1.01] transition-all`}
									onClick={() =>
										evt.symbol && navigate(`/stock/${evt.symbol}`)
									}>
									<div className="flex items-center justify-between mb-1">
										<span className="text-[10px] uppercase tracking-wider font-bold">
											{evt.type.replace("_", " ")}
										</span>
										<span className="text-[10px] text-text-muted font-jetbrains">
											{evt.date}
										</span>
									</div>
									<div className="text-sm font-medium text-text-primary">
										{evt.title}
									</div>
									{evt.description && (
										<div className="text-xs text-text-secondary mt-0.5">
											{evt.description}
										</div>
									)}
								</div>
							))}
						</div>
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
}
