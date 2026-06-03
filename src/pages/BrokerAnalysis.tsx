import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Building2,
	Search,
	TrendingUp,
	TrendingDown,
	Info,
	BarChart2,
	Filter,
	Download,
	RotateCw,
	AlertTriangle,
	ChevronRight,
} from "lucide-react";
import {
	formatNPR,
	formatVolume,
	formatPercent,
	formatNepaliNumber,
} from "../utils";
import { useBrokers, useFloorsheet } from "../hooks/useNepseData";
import { useUIStore } from "../store";
import { BrokerDetail } from "../components/shared/BrokerDetail";

type Tab = "overview" | "floorsheet";

export default function BrokerAnalysis() {
	const [activeTab, setActiveTab] = useState<Tab>("overview");
	const { data: brokers, isLoading: brokersLoading } = useBrokers();
	const {
		data: rawFloorsheetData,
		isLoading: floorsheetsLoading,
		isError: floorsheetError,
		refetch: refetchFloorsheet,
		isRefetching,
	} = useFloorsheet();
	const { selectedBrokerId, setSelectedBrokerId } = useUIStore();

	const [search, setSearch] = useState("");
	const [brokerFilter, setBrokerFilter] = useState("");
	const [minQty, setMinQty] = useState("");
	const [displayCount, setDisplayCount] = useState(100);

	// Broker Overview tab
	const filteredBrokers = useMemo(() => {
		if (!brokers) return [];
		return brokers.filter(
			(b: any) =>
				b.name.toLowerCase().includes(search.toLowerCase()) ||
				b.id.includes(search),
		);
	}, [brokers, search]);

	const topStats = useMemo(() => {
		if (!brokers || brokers.length === 0) return null;
		const sortedBuy = [...brokers].sort((a, b) => b.buyAmount - a.buyAmount)[0];
		const sortedSell = [...brokers].sort(
			(a, b) => b.sellAmount - a.sellAmount,
		)[0];
		const sortedVol = [...brokers].sort(
			(a, b) => b.buyQty + b.sellQty - (a.buyQty + a.sellQty),
		)[0];
		return { topBuy: sortedBuy, topSell: sortedSell, topVol: sortedVol };
	}, [brokers]);

	// Floorsheet tab
	const floorsheetsData = rawFloorsheetData || [];
	const filteredFloorsheet = floorsheetsData.filter((item) => {
		const symbolMatch = item.stockSymbol
			.toLowerCase()
			.includes(search.toLowerCase());
		const brokerMatch =
			!brokerFilter ||
			item.buyerMemberId.toString() === brokerFilter ||
			item.sellerMemberId.toString() === brokerFilter;
		const qtyMatch = !minQty || item.contractQuantity >= parseInt(minQty);
		return symbolMatch && brokerMatch && qtyMatch;
	});

	const floorsheetsTotal = filteredFloorsheet.reduce(
		(acc, curr) => ({
			qty: acc.qty + curr.contractQuantity,
			amount: acc.amount + curr.contractQuantity * curr.contractRate,
		}),
		{ qty: 0, amount: 0 },
	);

	const displayedFloorsheet = filteredFloorsheet.slice(0, displayCount);

	if (selectedBrokerId) {
		return (
			<div className="p-1">
				<BrokerDetail
					brokerId={selectedBrokerId}
					onBack={() => setSelectedBrokerId(null)}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="font-syne text-2xl font-bold">Broker Analysis</h1>
					<p className="text-xs text-text-secondary">
						Market intelligence & transaction tracking
					</p>
				</div>
			</div>

			{/* Tab Navigation */}
			<div className="flex gap-2 border-b border-bg-border">
				{(["overview", "floorsheet"] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => {
							setActiveTab(tab);
							setSearch("");
							setBrokerFilter("");
							setMinQty("");
							setDisplayCount(100);
						}}
						className={`px-4 py-3 font-semibold text-sm transition-all relative ${
							activeTab === tab
								? "text-brand-cyan"
								: "text-text-secondary hover:text-text-primary"
						}`}>
						{tab === "overview" ? "Broker Overview" : "Floorsheet"}
						{activeTab === tab && (
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />
						)}
					</button>
				))}
			</div>

			<AnimatePresence mode="wait">
				{/* Broker Overview Tab */}
				{activeTab === "overview" && (
					<motion.div
						key="overview"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="space-y-6">
						<div className="flex gap-2">
							<div className="relative flex-1">
								<Search
									size={16}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
								/>
								<input
									type="text"
									placeholder="Search broker name or #..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="input-field pl-9 py-1.5 text-sm w-full"
								/>
							</div>
							<button className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
								<Filter size={14} /> Filter
							</button>
						</div>

						<div className="card p-3 bg-brand-gold/10 border-brand-gold/20 flex gap-3 items-center">
							<Info size={24} className="text-brand-gold shrink-0" />
							<p className="text-xs text-text-secondary">
								<strong className="text-brand-gold font-syne">
									NEPSE API Limitation:
								</strong>{" "}
								Live broker IDs are currently hidden in the public NEPSE
								floorsheet during trading hours. The data below may be
								incomplete or populated with estimated models until full data is
								released at market close.
							</p>
						</div>

						{/* Top 3 Stats */}
						{topStats && (
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="card p-6 border-b-4 border-bull-green bg-gradient-to-br from-bg-surface to-bull-green/5">
									<div className="flex items-center justify-between mb-4">
										<div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
											Top Buying Broker
										</div>
										<TrendingUp size={16} className="text-bull-green" />
									</div>
									<div className="text-xl font-syne font-bold text-text-primary">
										{topStats.topBuy.name} (#{topStats.topBuy.id})
									</div>
									<div className="font-jetbrains text-lg text-bull-green mt-1">
										{formatNPR(topStats.topBuy.buyAmount, true)}
									</div>
								</div>
								<div className="card p-6 border-b-4 border-bear-red bg-gradient-to-br from-bg-surface to-bear-red/5">
									<div className="flex items-center justify-between mb-4">
										<div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
											Top Selling Broker
										</div>
										<TrendingDown size={16} className="text-bear-red" />
									</div>
									<div className="text-xl font-syne font-bold text-text-primary">
										{topStats.topSell.name} (#{topStats.topSell.id})
									</div>
									<div className="font-jetbrains text-lg text-bear-red mt-1">
										{formatNPR(topStats.topSell.sellAmount, true)}
									</div>
								</div>
								<div className="card p-6 border-b-4 border-brand-cyan bg-gradient-to-br from-bg-surface to-brand-cyan/5">
									<div className="flex items-center justify-between mb-4">
										<div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
											Highest Volume Broker
										</div>
										<BarChart2 size={16} className="text-brand-cyan" />
									</div>
									<div className="text-xl font-syne font-bold text-text-primary">
										{topStats.topVol.name} (#{topStats.topVol.id})
									</div>
									<div className="font-jetbrains text-lg text-brand-cyan mt-1">
										{formatVolume(
											topStats.topVol.buyQty + topStats.topVol.sellQty,
										)}{" "}
										shares
									</div>
								</div>
							</div>
						)}

						{/* Broker Table */}
						<div className="card overflow-hidden">
							<div className="p-4 border-b border-bg-border bg-bg-base/30 flex items-center justify-between">
								<h2 className="font-syne font-bold text-sm">
									Broker Performance Rankings
								</h2>
								<div className="hidden md:flex text-[10px] text-text-muted items-center gap-1">
									<Info size={12} /> Click on a broker to see their specific
									stock-wise breakdown
								</div>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-bg-base/20">
											<th className="table-header">#</th>
											<th className="table-header">Broker Name</th>
											<th className="table-header text-right">Buy Amount</th>
											<th className="table-header text-right">Sell Amount</th>
											<th className="table-header text-right">Net Flow</th>
											<th className="table-header">Top Buy</th>
											<th className="table-header">Top Sell</th>
											<th className="table-header text-right">Action</th>
										</tr>
									</thead>
									<tbody>
										{filteredBrokers.map((b: any) => {
											const netFlow = b.buyAmount - b.sellAmount;
											return (
												<tr
													key={b.id}
													onClick={() => setSelectedBrokerId(b.id)}
													className="border-b border-bg-border/30 hover:bg-bg-elevated/50 cursor-pointer transition-colors table-row-zebra group">
													<td className="table-cell font-jetbrains text-xs text-text-muted">
														{b.id}
													</td>
													<td className="table-cell font-bold text-text-primary group-hover:text-brand-cyan transition-colors">
														{b.name}
													</td>
													<td className="table-cell text-right font-jetbrains text-bull-green">
														{formatNPR(b.buyAmount, true)}
													</td>
													<td className="table-cell text-right font-jetbrains text-bear-red">
														{formatNPR(b.sellAmount, true)}
													</td>
													<td
														className={`table-cell text-right font-jetbrains font-bold ${netFlow >= 0 ? "text-bull-green" : "text-bear-red"}`}>
														{netFlow >= 0 ? "+" : ""}
														{formatNPR(netFlow, true)}
													</td>
													<td className="table-cell">
														<span className="badge-cyan text-[10px]">
															{b.topBuy || "N/A"}
														</span>
													</td>
													<td className="table-cell">
														<span className="badge-red text-[10px]">
															{b.topSell || "N/A"}
														</span>
													</td>
													<td className="table-cell text-right">
														<div className="flex justify-end">
															<div className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted group-hover:bg-brand-cyan group-hover:text-bg-base transition-all">
																<ChevronRight size={14} />
															</div>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>

						{brokersLoading && (
							<div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
								<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
								<p className="text-text-secondary animate-pulse text-sm font-syne uppercase tracking-widest">
									Gathering intelligence...
								</p>
							</div>
						)}
					</motion.div>
				)}

				{/* Floorsheet Tab */}
				{activeTab === "floorsheet" && (
					<motion.div
						key="floorsheet"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="space-y-4">
						<div className="flex gap-2">
							<button
								onClick={() =>
									window.open(
										"http://127.0.0.1:8000/api/floorsheet/export",
										"_blank",
									)
								}
								className="btn-secondary py-1.5 px-3 flex items-center gap-2 text-xs">
								<Download size={14} /> Export CSV
							</button>
							<button
								onClick={() => refetchFloorsheet()}
								disabled={isRefetching}
								className="btn-primary py-1.5 px-3 flex items-center gap-2 text-xs">
								<RotateCw
									size={14}
									className={isRefetching ? "animate-spin" : ""}
								/>{" "}
								Refresh
							</button>
						</div>

						{/* Analysis Bar */}
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="card p-4 flex flex-col justify-center">
								<div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
									Total Transactions
								</div>
								<div className="font-jetbrains text-xl font-bold text-text-primary">
									{filteredFloorsheet.length}
								</div>
							</div>
							<div className="card p-4 flex flex-col justify-center">
								<div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
									Total Quantity
								</div>
								<div className="font-jetbrains text-xl font-bold text-brand-cyan">
									{floorsheetsTotal.qty.toLocaleString()}
								</div>
							</div>
							<div className="card p-4 flex flex-col justify-center">
								<div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
									Total Amount
								</div>
								<div className="font-jetbrains text-xl font-bold text-brand-gold">
									{formatNPR(floorsheetsTotal.amount, true)}
								</div>
							</div>
							<div className="card p-4 flex flex-col justify-center bg-brand-violet/5 border-brand-violet/20">
								<div className="text-[10px] text-brand-violet uppercase tracking-wider font-bold mb-1">
									Bulk Deals ({">"} 500)
								</div>
								<div className="font-jetbrains text-xl font-bold text-text-primary">
									{
										filteredFloorsheet.filter((i) => i.contractQuantity >= 500)
											.length
									}
								</div>
							</div>
						</div>

						{/* Filters Bar */}
						<div className="card p-3 flex flex-wrap items-center gap-3">
							<div className="relative flex-1 min-w-[200px]">
								<Search
									size={16}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
								/>
								<input
									type="text"
									placeholder="Filter by Symbol..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="input-field w-full pl-9 text-sm"
								/>
							</div>
							<input
								type="number"
								placeholder="Broker #..."
								value={brokerFilter}
								onChange={(e) => setBrokerFilter(e.target.value)}
								className="input-field text-sm w-32"
							/>
							<input
								type="number"
								placeholder="Min Qty..."
								value={minQty}
								onChange={(e) => setMinQty(e.target.value)}
								className="input-field text-sm w-32"
							/>
							<div className="flex items-center gap-2 text-xs text-text-muted ml-auto bg-bg-base px-3 py-1.5 rounded-lg border border-bg-border">
								<Info size={14} className="text-brand-cyan" />
								<span>Real-time data from NEPSE</span>
							</div>
						</div>

						{/* Floorsheet Table */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="card overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead className="bg-bg-base">
										<tr>
											<th className="table-header">Trans #</th>
											<th className="table-header">Time</th>
											<th className="table-header">Symbol</th>
											<th className="table-header">Buyer</th>
											<th className="table-header">Seller</th>
											<th className="table-header text-right">Qty</th>
											<th className="table-header text-right">Rate</th>
											<th className="table-header text-right">Amount</th>
											<th className="table-header w-10"></th>
										</tr>
									</thead>
									<tbody>
										{displayedFloorsheet.map((item) => (
											<tr
												key={item.contractId}
												className="border-b border-bg-border/30 hover:bg-bg-elevated/50 transition-colors table-row-zebra">
												<td className="table-cell font-jetbrains text-xs text-text-muted">
													#{item.contractId}
												</td>
												<td className="table-cell font-jetbrains text-xs text-text-secondary">
													{item.contractTime}
												</td>
												<td className="table-cell font-bold text-text-primary">
													{item.stockSymbol}
												</td>
												<td className="table-cell font-jetbrains text-xs">
													{item.buyerMemberId ? (
														<span className="px-1.5 py-0.5 rounded bg-bg-elevated text-brand-cyan border border-brand-cyan/20">
															{item.buyerMemberId}
														</span>
													) : (
														<span className="px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted border border-bg-border">
															Hidden
														</span>
													)}
												</td>
												<td className="table-cell font-jetbrains text-xs">
													{item.sellerMemberId ? (
														<span className="px-1.5 py-0.5 rounded bg-bg-elevated text-bear-red border border-bear-red/20">
															{item.sellerMemberId}
														</span>
													) : (
														<span className="px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted border border-bg-border">
															Hidden
														</span>
													)}
												</td>
												<td className="table-cell text-right font-jetbrains font-medium">
													{item.contractQuantity.toLocaleString()}
												</td>
												<td className="table-cell text-right font-jetbrains text-text-secondary">
													{formatNepaliNumber(item.contractRate)}
												</td>
												<td className="table-cell text-right font-jetbrains text-text-primary">
													{formatNepaliNumber(
														item.contractQuantity * item.contractRate,
													)}
												</td>
												<td className="table-cell">
													{item.contractQuantity >= 500 && (
														<div
															className="flex justify-center"
															title="Bulk Transaction">
															<AlertTriangle
																size={14}
																className="text-brand-gold"
															/>
														</div>
													)}
												</td>
											</tr>
										))}
										{filteredFloorsheet.length === 0 &&
											!floorsheetsLoading &&
											!floorsheetError && (
												<tr>
													<td
														colSpan={9}
														className="p-12 text-center text-text-muted">
														No transactions found matching your criteria.
													</td>
												</tr>
											)}
									</tbody>
								</table>
							</div>

							{filteredFloorsheet.length > displayCount &&
								!floorsheetsLoading && (
									<div className="p-4 border-t border-bg-border/30 flex justify-center">
										<button
											onClick={() => setDisplayCount((prev) => prev + 200)}
											className="btn-secondary py-2 px-6 text-sm">
											Load More ({filteredFloorsheet.length - displayCount}{" "}
											remaining)
										</button>
									</div>
								)}

							{floorsheetsLoading && (
								<div className="p-12 text-center">
									<div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-cyan border-t-transparent" />
									<p className="mt-4 text-text-muted text-sm">
										Fetching live floorsheet data... This may take up to a
										minute.
									</p>
								</div>
							)}
							{floorsheetError && (
								<div className="p-12 text-center text-bear-red">
									Failed to load floorsheet data.
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
