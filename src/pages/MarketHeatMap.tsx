import { useState, useMemo } from "react";
import { useLiveTrading } from "../hooks/useNepseData";
import { generateMockOHLCV } from "../utils/mockData";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { formatNepaliNumber } from "../utils";

type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y";

/**
 * Standard TradingView color scale.
 */
function getStandardColor(change: number) {
	if (change >= 3) return { bg: "#008800", fg: "#ffffff" }; // Dark Green
	if (change > 0) return { bg: "#00C000", fg: "#000000" };  // Light Green
	if (change === 0) return { bg: "#555555", fg: "#ffffff" }; // Neutral Gray
	if (change > -3) return { bg: "#FF5555", fg: "#000000" };  // Light Red
	return { bg: "#CC0000", fg: "#ffffff" };                   // Dark Red
}

// Custom Content for Recharts Treemap
const CustomizedContent = (props: any) => {
	const { root, depth, x, y, width, height, index, name, value, change, ltp } = props;

	if (width < 30 || height < 20) return null; // hide if too small to render anything

	const { bg, fg } = getStandardColor(change);

	return (
		<g>
			{/* Tile Background (Strictly no rounded corners, sharp 1px dark border) */}
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				style={{
					fill: bg,
					stroke: "#000000", // Pure black borders like Finviz
					strokeWidth: 2,
				}}
			/>
			
			{/* Sector Header (Depth 1) */}
			{depth === 1 ? (
				<text
					x={x + 6}
					y={y + 20}
					fill="#ffffff"
					fontSize={14}
					fontWeight="bold"
					fontFamily="Inter, Arial, sans-serif"
				>
					{name}
				</text>
			) : depth === 2 ? (
				/* Stock Data (Depth 2) */
				<g>
					{/* Symbol */}
					<text
						x={x + width / 2}
						y={y + height / 2 - (height > 50 ? 8 : 0)}
						textAnchor="middle"
						fill={fg}
						fontSize={width > 80 ? 16 : width > 50 ? 13 : 11}
						fontWeight="bold"
						fontFamily="Inter, Arial, sans-serif"
					>
						{name}
					</text>
					
					{/* % Change (only show if height/width permit) */}
					{height > 50 && width > 50 && (
						<text
							x={x + width / 2}
							y={y + height / 2 + 12}
							textAnchor="middle"
							fill={fg}
							fontSize={width > 80 ? 14 : 12}
							fontWeight="600"
							fontFamily="Inter, Arial, sans-serif"
						>
							{change > 0 ? "+" : ""}{change.toFixed(2)}%
						</text>
					)}

					{/* LTP (only show if very large) */}
					{height > 70 && width > 70 && (
						<text
							x={x + width / 2}
							y={y + height / 2 + 28}
							textAnchor="middle"
							fill={fg}
							fontSize={12}
							fontFamily="Inter, Arial, sans-serif"
							fontWeight="500"
						>
							{ltp?.toFixed(1)}
						</text>
					)}
				</g>
			) : null}
		</g>
	);
};

// Recharts Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
	if (active && payload && payload.length) {
		const data = payload[0].payload;
		// Don't show tooltip for sector blocks
		if (data.children) return null;

		const { bg } = getStandardColor(data.change);

		return (
			<div className="bg-bg-surface border border-bg-border shadow-2xl p-4 z-50 rounded-xl font-sans min-w-[200px]">
				<p className="font-bold text-text-primary text-lg border-b border-bg-border/50 pb-2 mb-2">{data.name}</p>
				{data.change !== undefined && (
					<div className="flex justify-between items-center gap-6 mt-2">
						<span className="text-xs text-text-muted font-medium">Change</span>
						<span className="font-bold text-sm" style={{ color: bg }}>
							{data.change >= 0 ? "+" : ""}{data.change.toFixed(2)}%
						</span>
					</div>
				)}
				{data.ltp && (
					<div className="flex justify-between items-center gap-6 mt-2">
						<span className="text-xs text-text-muted font-medium">LTP</span>
						<span className="font-bold text-sm text-text-primary">Rs. {formatNepaliNumber(data.ltp)}</span>
					</div>
				)}
				{data.value && (
					<div className="flex justify-between items-center gap-6 mt-2">
						<span className="text-xs text-text-muted font-medium">Turnover</span>
						<span className="font-bold text-sm text-text-primary">Rs. {formatNepaliNumber(data.value)}</span>
					</div>
				)}
			</div>
		);
	}
	return null;
};

export default function MarketHeatMap() {
	const { data, isLoading, isError } = useLiveTrading();
	const [timeframe, setTimeframe] = useState<Timeframe>("1D");

	// Process data into Treemap hierarchy
	const treeData = useMemo(() => {
		if (!data || !Array.isArray(data)) return [];

		const daysFor = (tf: string) => {
			switch (tf) {
				case "1D": return 1;
				case "1W": return 7;
				case "1M": return 22;
				case "3M": return 66;
				case "1Y": return 252;
				default: return 1;
			}
		};
		const days = daysFor(timeframe);

		const sectorsMap = new Map<string, any[]>();

		data.forEach((s: any) => {
			const sector = s.sectorName || "Others";
			const ltp = Number(s.lastTradedPrice || s.ltp || 0);
			const volume = Number(s.shareTraded || s.totalTradeQuantity || 0);

			if (ltp === 0 || volume === 0) return; // Skip inactive

			let change = Number(s.percentageChange || 0);

			if (days > 1) {
				let startPrice = ltp;
				if (s.history && Array.isArray(s.history) && s.history.length >= days) {
					startPrice = Number(s.history[s.history.length - days].close);
				} else {
					const mock = generateMockOHLCV(s.symbol, days + 2, ltp);
					if (mock.length > 0) startPrice = mock[0].close;
				}
				change = startPrice > 0 ? ((ltp - startPrice) / startPrice) * 100 : 0;
			}

			if (!sectorsMap.has(sector)) sectorsMap.set(sector, []);
			sectorsMap.get(sector)!.push({
				name: s.symbol || s.stockSymbol,
				size: volume * ltp, // Sized perfectly by Turnover
				change,
				ltp,
			});
		});

		// Build hierarchy
		const tree = Array.from(sectorsMap.entries()).map(([sectorName, children]) => {
			// Sort and keep top constituents to prevent rendering tiny unreadable slivers
			const topChildren = children.sort((a, b) => b.size - a.size).slice(0, 20);
			return {
				name: sectorName,
				children: topChildren,
			};
		});

		return tree.filter(s => s.children.length > 0);
	}, [data, timeframe]);

	if (isLoading) return <div className="p-12 text-center text-text-muted">Loading Heat Map...</div>;
	if (isError) return <div className="p-12 text-center text-bear-red">Failed to load market data.</div>;

	return (
		<div className="flex flex-col h-[calc(100vh-100px)] bg-bg-base font-sans">
			{/* ── Controls Bar ── */}
			<div className="flex items-center justify-between p-4 border-b border-bg-border bg-bg-surface shrink-0">
				<div className="flex items-center gap-6">
					<h1 className="text-xl font-bold text-text-primary tracking-wide flex items-center gap-3">
						Market Heatmap
					</h1>
					
					{/* Legend */}
					<div className="hidden md:flex items-center text-xs font-bold rounded-lg overflow-hidden border border-[#000000] shadow-sm">
						<div className="px-3 py-1.5 bg-[#CC0000] text-[#ffffff]">&lt; -3%</div>
						<div className="px-3 py-1.5 bg-[#FF5555] text-[#000000]">-3% to 0%</div>
						<div className="px-3 py-1.5 bg-[#555555] text-[#ffffff]">0%</div>
						<div className="px-3 py-1.5 bg-[#00C000] text-[#000000]">0% to +3%</div>
						<div className="px-3 py-1.5 bg-[#008800] text-[#ffffff]">&gt; +3%</div>
					</div>
				</div>

				<div className="flex items-center gap-1 p-1 bg-bg-base border border-bg-border rounded-lg">
					{(["1D", "1W", "1M", "3M", "1Y"] as const).map(tf => (
						<button
							key={tf}
							onClick={() => setTimeframe(tf)}
							className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${
								timeframe === tf
									? "bg-brand-cyan text-bg-base shadow-sm"
									: "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
							}`}
						>
							{tf}
						</button>
					))}
				</div>
			</div>

			{/* ── Standard Treemap View ── */}
			<div className="flex-1 w-full min-h-[500px] p-2">
				<ResponsiveContainer width="100%" height="100%">
					<Treemap
						data={treeData}
						dataKey="size"
						stroke="#111827"
						fill="#374151"
						content={<CustomizedContent />}
						isAnimationActive={false} // Disable animations for strict standard feel
					>
						<Tooltip content={<CustomTooltip />} />
					</Treemap>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
