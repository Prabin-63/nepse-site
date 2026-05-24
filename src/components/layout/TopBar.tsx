import { useState, useEffect } from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import { useUIStore } from '../../store';
import { useAlertStore } from '../../store/alertStore';
import { formatNepaliNumber, formatPercent, getPriceColorClass } from '../../utils';
import { useDashboard } from '../../hooks/useNepseData';
import { timeToMarketEvent, getMarketStatus } from '../../utils/marketHours';
import { nepseApi } from '../../lib/api';
import NotificationDropdown from './NotificationDropdown';
import AccountDropdown from './AccountDropdown';
import DropdownPortal from './DropdownPortal';

export default function TopBar() {
  const { toggleSidebar, toggleSearch, sidebarOpen } = useUIStore();
  const { data: dashboardData } = useDashboard();
  const alerts = useAlertStore((s) => s.alerts);

  const [countdown, setCountdown] = useState(timeToMarketEvent());
  const [apiOnline, setApiOnline] = useState(true);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const [notificationBtnEl, setNotificationBtnEl] = useState<HTMLButtonElement | null>(null);
  const [accountBtnEl, setAccountBtnEl] = useState<HTMLButtonElement | null>(null);

  const activeAlertCount = alerts.filter((a) => a.isActive).length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(timeToMarketEvent());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    nepseApi.health()
      .then((r) => setApiOnline(r.status === 'healthy'))
      .catch(() => setApiOnline(false));
  }, []);

  const nepseIndex = dashboardData?.nepse_index?.find((i: { index?: string }) => i.index === 'NEPSE Index') || {
    currentValue: 0,
    change: 0,
    perChange: 0,
  };

  const summary = dashboardData?.market_summary || [];
  let advancing = summary.find((s: { detail?: string }) => s.detail === 'Total Advance')?.value || 0;
  let declining = summary.find((s: { detail?: string }) => s.detail === 'Total Decline')?.value || 0;
  let unchanged = summary.find((s: { detail?: string }) => s.detail === 'Total Unchanged')?.value || 0;

  const liveMarketData = dashboardData?.live_market || [];
  if (advancing === 0 && declining === 0 && liveMarketData.length > 0) {
    advancing = liveMarketData.filter((s: { percentageChange?: number }) => (s.percentageChange ?? 0) > 0).length;
    declining = liveMarketData.filter((s: { percentageChange?: number }) => (s.percentageChange ?? 0) < 0).length;
    unchanged = liveMarketData.filter((s: { percentageChange?: number }) => (s.percentageChange ?? 0) === 0).length;
  }

  const marketStatusObj = dashboardData?.market_status;
  let marketStatus = getMarketStatus() as string;

  if (marketStatusObj?.isOpen) {
    const apiStatus = String(marketStatusObj.isOpen).toUpperCase();
    if (apiStatus === 'HALTED' || apiStatus === 'SUSPENDED') {
      marketStatus = apiStatus;
    }
  }

  let statusColor = 'bg-bear-red';
  let statusPulse = '';

  if (marketStatus === 'OPEN') {
    statusColor = 'bg-bull-green';
    statusPulse = 'animate-pulse';
  } else if (marketStatus === 'PRE_OPEN') {
    statusColor = 'bg-neutral-yellow';
    statusPulse = 'animate-pulse';
  } else if (marketStatus === 'HALTED' || marketStatus === 'SUSPENDED') {
    statusColor = 'bg-brand-gold';
    statusPulse = 'animate-pulse';
  }

  const hours = Math.floor(countdown.seconds / 3600);
  const minutes = Math.floor((countdown.seconds % 3600) / 60);
  const seconds = Math.floor(countdown.seconds % 60);

  const closeMenus = () => {
    setNotificationsOpen(false);
    setAccountOpen(false);
  };

  return (
    <header
      className={`fixed top-0 right-0 z-40 h-auto bg-bg-surface/95 backdrop-blur-md border-b border-bg-border
      transition-all duration-300 ${sidebarOpen ? 'lg:left-60 left-0' : 'lg:left-[68px] left-0'}`}
    >
      <div className="flex items-center gap-4 px-4 h-12 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden text-text-secondary hover:text-text-primary shrink-0"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-text-secondary font-medium">NEPSE</span>
            <span className="font-jetbrains font-bold text-text-primary">
              {formatNepaliNumber(nepseIndex.currentValue)}
            </span>
            <span className={`font-jetbrains font-semibold ${getPriceColorClass(nepseIndex.change)}`}>
              {formatPercent(nepseIndex.perChange)}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-bg-border pl-4 shrink-0">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${statusPulse}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Market {marketStatus}
            </span>
            {countdown.seconds > 0 && (
              <span className="text-[10px] font-jetbrains text-text-secondary">
                ({hours}h {minutes}m {seconds}s to {countdown.nextEvent})
              </span>
            )}
            <span
              className={`text-[10px] font-bold uppercase ${apiOnline ? 'text-bull-green' : 'text-bear-red'}`}
              title={apiOnline ? 'API connected' : 'API offline'}
            >
              · {apiOnline ? 'API' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleSearch}
            className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            title="Search (Ctrl+K)"
            aria-label="Search"
          >
            <Search size={16} />
          </button>

          <button
            ref={setNotificationBtnEl}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAccountOpen(false);
              setNotificationsOpen((v) => !v);
            }}
            className={`p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors relative
              ${notificationsOpen ? 'bg-bg-elevated text-brand-cyan' : 'hover:bg-bg-elevated'}`}
            title="Notifications & price alerts"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell size={16} />
            {(activeAlertCount > 0 || !apiOnline) && (
              <span
                className={`absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center
                  ${activeAlertCount > 0 ? 'bg-brand-cyan text-bg-base' : 'bg-bear-red text-white'}`}
              >
                {activeAlertCount > 0 ? activeAlertCount : '!'}
              </span>
            )}
          </button>

          <button
            ref={setAccountBtnEl}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNotificationsOpen(false);
              setAccountOpen((v) => !v);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
              ${accountOpen ? 'ring-2 ring-brand-cyan ring-offset-2 ring-offset-bg-surface scale-110' : 'hover:scale-105'}`}
            title="Account menu"
            aria-label="Account"
            aria-expanded={accountOpen}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center shadow-lg">
              <User size={14} className="text-white" />
            </div>
          </button>
        </div>
      </div>

      <DropdownPortal
        anchorRef={{ current: notificationBtnEl }}
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        width={360}
        align="right"
      >
        <NotificationDropdown onClose={() => setNotificationsOpen(false)} />
      </DropdownPortal>

      <DropdownPortal
        anchorRef={{ current: accountBtnEl }}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        width={288}
        align="right"
      >
        <AccountDropdown onClose={() => setAccountOpen(false)} />
      </DropdownPortal>
    </header>
  );
}
