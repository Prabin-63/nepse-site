import { useLiveTrading } from "../../hooks/useNepseData";
import { formatNepaliNumber, formatPercent } from "../../utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function TickerStrip() {
	const { data: liveMarket, isLoading } = useLiveTrading();

	if (isLoading || !liveMarket || !Array.isArray(liveMarket) || liveMarket.length === 0) return null;

	// Sort by highest volume/turnover to show most active stocks first
	const activeStocks = [...liveMarket]
		.sort((a, b) => (b.shareTraded || 0) - (a.shareTraded || 0))
		.slice(0, 30); // Top 30 most active

	return (
		<div className="relative w-full overflow-hidden bg-gradient-to-r from-bg-surface via-bg-elevated to-bg-surface border-b border-bg-border/50 py-2">
			<style>{`
        @keyframes scroll-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          animation: scroll-ticker 60s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

			{/* We render the list twice to create an infinite seamless loop effect */}
			<div className="flex whitespace-nowrap ticker-scroll w-max">
				{[...activeStocks, ...activeStocks].map((stock, idx) => {
					const ltp = stock.lastTradedPrice || stock.ltp || 0;
					const change = stock.percentageChange || 0;
					const isUp = change > 0;
					const isDown = change < 0;

					return (
						<div key={`${stock.symbol}-${idx}`} className="flex items-center gap-4 px-6 shrink-0 group cursor-default">
							<span className="font-jetbrains font-bold text-sm text-text-primary group-hover:text-brand-cyan transition-colors">
								{stock.symbol}
							</span>
							
							<div className="flex items-center gap-2">
								<span className="font-jetbrains text-sm font-medium">
									Rs. {formatNepaliNumber(ltp)}
								</span>
								
								<span className={`flex items-center gap-0.5 text-xs font-bold font-jetbrains ${
									isUp ? "text-bull-green" : isDown ? "text-bear-red" : "text-text-muted"
								}`}>
									{isUp ? <TrendingUp size={12} strokeWidth={3} /> : isDown ? <TrendingDown size={12} strokeWidth={3} /> : <Minus size={12} />}
									{formatPercent(Math.abs(change))}
								</span>
							</div>

							{/* Separator */}
							<div className="w-px h-4 bg-bg-border/40 ml-4" />
						</div>
					);
				})}
			</div>
		</div>
	);
}
