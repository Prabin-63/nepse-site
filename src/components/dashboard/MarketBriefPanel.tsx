import { ChevronLeft, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import {
	formatNepaliNumber,
	formatPercent,
	formatVolume,
	formatNPR,
	getPriceColorClass,
} from "../../utils";

interface MarketBriefPanelProps {
	data: any;
	onBack: () => void;
	isLoading: boolean;
}

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

export default function MarketBriefPanel({
	data,
	onBack,
	isLoading,
}: MarketBriefPanelProps) {
	if (isLoading) {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="space-y-6">
				<button
					onClick={onBack}
					className="flex items-center gap-2 text-brand-cyan hover:text-brand-cyan/80 transition-colors mb-4">
					<ChevronLeft size={20} />
					<span className="text-sm font-medium">Back to Dashboard</span>
				</button>
				<div className="p-8 text-center text-text-muted">
					<div className="h-8 rounded animate-pulse bg-bg-border mb-4" />
					<div className="space-y-3">
						{[1, 2, 3, 4, 5].map((i) => (
							<div
								key={i}
								className="h-20 rounded-lg animate-pulse bg-bg-border"
							/>
						))}
					</div>
				</div>
			</motion.div>
		);
	}

	if (!data) {
		return (
			<div className="space-y-4">
				<button
					onClick={onBack}
					className="flex items-center gap-2 text-brand-cyan hover:text-brand-cyan/80 transition-colors">
					<ChevronLeft size={20} />
					<span className="text-sm font-medium">Back to Dashboard</span>
				</button>
				<div className="p-8 text-center text-text-muted">No data available</div>
			</div>
		);
	}

	const topTransacted = data?.topTransacted || [];
	const { mostBulkBuy, mostBulkSell, largestTransaction } = data || {};

	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={stagger}
			className="space-y-6">
			{/* Back Button */}
			<button
				onClick={onBack}
				className="flex items-center gap-2 text-brand-cyan hover:text-brand-cyan/80 transition-colors text-sm font-medium">
				<ChevronLeft size={18} />
				Back to Dashboard
			</button>

			{/* Title */}
			<motion.div variants={fadeUp} className="mb-6">
				<h2 className="text-2xl font-bold text-text-primary">
					Today's Market Summary
				</h2>
				<p className="text-sm text-text-muted mt-1">
					Simple daily market overview and key highlights
				</p>
			</motion.div>

			{/* Top 5 Most Transacted Stocks */}
			<motion.div
				variants={fadeUp}
				className="card p-6 rounded-2xl border border-bg-border">
				<div className="flex items-center gap-3 mb-4">
					<div className="w-10 h-10 rounded-lg bg-brand-cyan/20 flex items-center justify-center">
						<BarChart3 size={20} className="text-brand-cyan" />
					</div>
					<div>
						<h3 className="font-bold text-text-primary">
							Most Traded Stocks Today
						</h3>
						<p className="text-xs text-text-muted">
							Top 5 by total transaction count
						</p>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-bg-border">
								<th className="text-left py-2 px-3 font-semibold text-text-secondary text-xs">
									Rank
								</th>
								<th className="text-left py-2 px-3 font-semibold text-text-secondary text-xs">
									Stock
								</th>
								<th className="text-right py-2 px-3 font-semibold text-text-secondary text-xs">
									Total Shares
								</th>
								<th className="text-right py-2 px-3 font-semibold text-text-secondary text-xs">
									Total Turnover
								</th>
							</tr>
						</thead>
						<tbody>
							{topTransacted.length === 0 && (
								<tr>
									<td colSpan={4} className="py-8 text-center text-text-muted">
										No transaction data available yet today.
									</td>
								</tr>
							)}
							{topTransacted.map((stock: any, idx: number) => (
								<tr
									key={stock.symbol}
									className="border-b border-bg-border/30 hover:bg-bg-base/50 transition-colors">
									<td className="py-3 px-3 text-text-muted font-jetbrains text-xs">
										#{idx + 1}
									</td>
									<td className="py-3 px-3">
										<div className="font-semibold text-text-primary">
											{stock.symbol}
										</div>
										<div className="text-xs text-text-muted">
											{stock.companyName}
										</div>
									</td>
									<td className="py-3 px-3 text-right font-jetbrains text-text-primary">
										{formatVolume(stock.totalTradeQuantity)}
									</td>
									<td className="py-3 px-3 text-right font-jetbrains text-text-primary">
										{formatNPR(stock.totalTradeValue, true)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</motion.div>

			{/* Bulk Buy & Sell Cards */}
			<motion.div
				variants={fadeUp}
				className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Most Bulk Buy */}
				<div className="card p-5 rounded-2xl border-l-4 border-l-bull-green bg-bull-green/5">
					<div className="flex items-center gap-2 mb-3">
						<TrendingUp size={18} className="text-bull-green" />
						<h3 className="font-bold text-text-primary text-sm">
							Biggest Buy Transaction
						</h3>
					</div>
					<div className="space-y-2">
						<div>
							<p className="text-xs text-text-muted">Stock</p>
							<p className="font-bold text-lg text-text-primary">
								{mostBulkBuy?.symbol || "N/A"}
							</p>
						</div>
						<div>
							<p className="text-xs text-text-muted">Shares</p>
							<p className="font-jetbrains font-bold text-text-primary">
								{formatVolume(mostBulkBuy?.quantity || 0)}
							</p>
						</div>
						<div>
							<p className="text-xs text-text-muted">Broker</p>
							<p className="font-semibold text-text-primary text-sm">
								{mostBulkBuy?.brokerName || mostBulkBuy?.brokerId || "N/A"}
							</p>
						</div>
					</div>
				</div>

				{/* Most Bulk Sell */}
				<div className="card p-5 rounded-2xl border-l-4 border-l-bear-red bg-bear-red/5">
					<div className="flex items-center gap-2 mb-3">
						<TrendingDown size={18} className="text-bear-red" />
						<h3 className="font-bold text-text-primary text-sm">
							Biggest Sell Transaction
						</h3>
					</div>
					<div className="space-y-2">
						<div>
							<p className="text-xs text-text-muted">Stock</p>
							<p className="font-bold text-lg text-text-primary">
								{mostBulkSell?.symbol || "N/A"}
							</p>
						</div>
						<div>
							<p className="text-xs text-text-muted">Shares</p>
							<p className="font-jetbrains font-bold text-text-primary">
								{formatVolume(mostBulkSell?.quantity || 0)}
							</p>
						</div>
						<div>
							<p className="text-xs text-text-muted">Broker</p>
							<p className="font-semibold text-text-primary text-sm">
								{mostBulkSell?.brokerName || mostBulkSell?.brokerId || "N/A"}
							</p>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Highest Transaction Highlight */}
			{largestTransaction && (
				<motion.div
					variants={fadeUp}
					className="card p-6 rounded-2xl border-2 border-brand-gold bg-gradient-to-br from-brand-gold/10 to-brand-gold/5">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-12 h-12 rounded-full bg-brand-gold/20 flex items-center justify-center">
							<span className="text-xl font-bold">⚡</span>
						</div>
						<div>
							<h3 className="font-bold text-text-primary">
								Largest Single Transaction Today
							</h3>
							<p className="text-xs text-text-muted">
								The biggest trade by quantity
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-6">
						<div>
							<p className="text-xs text-text-muted mb-1">Stock Symbol</p>
							<p className="font-bold text-2xl text-text-primary">
								{largestTransaction.symbol}
							</p>
						</div>
						<div>
							<p className="text-xs text-text-muted mb-1">Transaction Type</p>
							<span
								className={`inline-block px-3 py-1.5 rounded-full font-bold text-sm ${
									largestTransaction.type === "BUY"
										? "bg-bull-green/20 text-bull-green"
										: "bg-bear-red/20 text-bear-red"
								}`}>
								{largestTransaction.type}
							</span>
						</div>
						<div>
							<p className="text-xs text-text-muted mb-1">Quantity</p>
							<p className="font-jetbrains font-bold text-lg text-text-primary">
								{formatVolume(largestTransaction.quantity)}
							</p>
						</div>
						<div>
							<p className="text-xs text-text-muted mb-1">Executing Broker</p>
							<p className="font-semibold text-text-primary">
								{largestTransaction.brokerName ||
									largestTransaction.brokerId ||
									"N/A"}
							</p>
						</div>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
}
