import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, TrendingUp, TrendingDown, Bell, AlertTriangle } from 'lucide-react';
import { useDashboard } from './useNepseData';
import { useAlertStore } from '../store/alertStore';
import { formatPercent, getPriceColorClass } from '../utils';
import { getMarketStatus } from '../utils/marketHours';

export interface SystemNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  href?: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function useSystemNotifications(): SystemNotification[] {
  const { data: dashboard } = useDashboard();
  const { alerts } = useAlertStore();

  return useMemo(() => {
    const items: SystemNotification[] = [];
    const now = new Date().toISOString();

    const marketStatusObj = dashboard?.market_status;
    let status = getMarketStatus();
    if (marketStatusObj?.isOpen) {
      const apiStatus = String(marketStatusObj.isOpen).toUpperCase();
      if (apiStatus === 'OPEN' || apiStatus === 'CLOSED' || apiStatus === 'PRE_OPEN') {
        status = apiStatus as typeof status;
      }
    }

    items.push({
      id: 'market-status',
      title: `Market is ${status}`,
      description:
        status === 'OPEN'
          ? 'Live NEPSE data is streaming. Prices and floorsheet update automatically.'
          : status === 'PRE_OPEN'
            ? 'Pre-open session. Final prices may update before continuous trading.'
            : 'Market is closed. Showing latest available session data.',
      time: 'Live',
      icon: Activity,
      color: status === 'OPEN' ? 'text-bull-green' : 'text-brand-gold',
      bg: status === 'OPEN' ? 'bg-bull-green/10' : 'bg-brand-gold/10',
      href: '/live-market',
    });

    const live = dashboard?.live_market || [];
    const gainers = [...live]
      .filter((s: { percentageChange?: number }) => (s.percentageChange ?? 0) > 0)
      .sort((a: { percentageChange?: number }, b: { percentageChange?: number }) => (b.percentageChange ?? 0) - (a.percentageChange ?? 0));
    const losers = [...live]
      .filter((s: { percentageChange?: number }) => (s.percentageChange ?? 0) < 0)
      .sort((a: { percentageChange?: number }, b: { percentageChange?: number }) => (a.percentageChange ?? 0) - (b.percentageChange ?? 0));

    if (gainers[0]) {
      const g = gainers[0];
      items.push({
        id: `top-gainer-${g.symbol}`,
        title: `${g.symbol} leading gainers`,
        description: `Up ${formatPercent(g.percentageChange ?? 0)} at Rs. ${g.lastTradedPrice ?? g.ltp ?? '—'}`,
        time: now,
        icon: TrendingUp,
        color: 'text-bull-green',
        bg: 'bg-bull-green/10',
        href: `/stock/${g.symbol}`,
      });
    }

    if (losers[0]) {
      const l = losers[0];
      items.push({
        id: `top-loser-${l.symbol}`,
        title: `${l.symbol} among top losers`,
        description: `Down ${formatPercent(l.percentageChange ?? 0)} at Rs. ${l.lastTradedPrice ?? l.ltp ?? '—'}`,
        time: now,
        icon: TrendingDown,
        color: 'text-bear-red',
        bg: 'bg-bear-red/10',
        href: `/stock/${l.symbol}`,
      });
    }

    const activeAlerts = alerts.filter((a) => a.isActive);
    if (activeAlerts.length > 0) {
      items.push({
        id: 'price-alerts-active',
        title: `${activeAlerts.length} active price alert${activeAlerts.length > 1 ? 's' : ''}`,
        description: activeAlerts
          .slice(0, 3)
          .map((a) => `${a.symbol} ${a.condition.toLowerCase()} ${a.targetPrice}`)
          .join(' · '),
        time: 'Alerts',
        icon: Bell,
        color: 'text-brand-cyan',
        bg: 'bg-brand-cyan/10',
        href: '/news-alerts',
      });
    }

    const triggered = alerts.filter((a) => !a.isActive);
    if (triggered.length > 0) {
      items.push({
        id: 'price-alerts-triggered',
        title: `${triggered.length} alert${triggered.length > 1 ? 's' : ''} triggered`,
        description: 'Review triggered alerts in the Price Alerts tab or News & Alerts page.',
        time: relativeTime(triggered[0]?.createdAt || now),
        icon: AlertTriangle,
        color: 'text-brand-gold',
        bg: 'bg-brand-gold/10',
      });
    }

    const nepse = dashboard?.nepse_index?.find((i: { index?: string }) => i.index === 'NEPSE Index');
    if (nepse && Math.abs(nepse.perChange ?? 0) >= 1) {
      items.push({
        id: 'index-move',
        title: `NEPSE Index ${(nepse.perChange ?? 0) >= 0 ? 'surge' : 'decline'}`,
        description: `Index at ${nepse.currentValue ?? '—'} (${formatPercent(nepse.perChange ?? 0)})`,
        time: now,
        icon: (nepse.perChange ?? 0) >= 0 ? TrendingUp : TrendingDown,
        color: getPriceColorClass(nepse.perChange ?? 0),
        bg: (nepse.perChange ?? 0) >= 0 ? 'bg-bull-green/10' : 'bg-bear-red/10',
        href: '/dashboard',
      });
    }

    return items.slice(0, 8);
  }, [dashboard, alerts]);
}
