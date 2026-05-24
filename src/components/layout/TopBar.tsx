import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Menu, Wifi, WifiOff } from 'lucide-react';
import { useUIStore } from '../../store';
import { formatNepaliNumber, formatPercent, getPriceColorClass } from '../../utils';
import { useDashboard } from '../../hooks/useNepseData';
import { timeToMarketEvent, getMarketStatus } from '../../utils/marketHours';
import { nepseApi } from '../../lib/api';
import NotificationDropdown from './NotificationDropdown';
import AccountDropdown from './AccountDropdown';
import PriceAlertManager from '../shared/PriceAlertManager';

export default function TopBar() {
  const { toggleSidebar, toggleSearch, sidebarOpen } = useUIStore();
  const { data: dashboardData } = useDashboard();
  
  const [countdown, setCountdown] = useState(timeToMarketEvent());
  const [apiOnline, setApiOnline] = useState(true);
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(timeToMarketEvent());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    nepseApi.health()
      .then(r => r.status === 'healthy' ? setApiOnline(true) : setApiOnline(false))
      .catch(() => setApiOnline(false));
  }, []);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const nepseIndex = dashboardData?.nepse_index?.find((i: any) => i.index === 'NEPSE Index') || { currentValue: 0, change: 0, perChange: 0 };
  const sensitiveIndex = dashboardData?.nepse_index?.find((i: any) => i.index === 'Sensitive Index') || { currentValue: 0, change: 0, perChange: 0 };
  const floatIndex = dashboardData?.nepse_index?.find((i: any) => i.index === 'Float Index') || { currentValue: 0, change: 0, perChange: 0 };
  
  const summary = dashboardData?.market_summary || [];
  const totalTurnover = summary.find((s: any) => s.detail === 'Total Turnover Rs:')?.value || summary.find((s: any) => s.detail === 'Total Turnover')?.value || 0;
  let advancing = summary.find((s: any) => s.detail === 'Total Advance')?.value || 0;
  let declining = summary.find((s: any) => s.detail === 'Total Decline')?.value || 0;
  let unchanged = summary.find((s: any) => s.detail === 'Total Unchanged')?.value || 0;

  const liveMarketData = dashboardData?.live_market || [];
  if (advancing === 0 && declining === 0 && liveMarketData.length > 0) {
    advancing = liveMarketData.filter((s: any) => s.percentageChange > 0).length;
    declining = liveMarketData.filter((s: any) => s.percentageChange < 0).length;
    unchanged = liveMarketData.filter((s: any) => s.percentageChange === 0).length;
  }
  
  const marketStatusObj = dashboardData?.market_status;
  let marketStatus = getMarketStatus() as string; 
  
  if (marketStatusObj?.isOpen) {
    const apiStatus = marketStatusObj.isOpen.toUpperCase();
    // Override local time-based status with API status for mid-day circuit breakers
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
  const total = advancing + declining + unchanged;
  const advanceRatio = total > 0 ? (advancing / total) * 100 : 50;

  const hours = Math.floor(countdown.seconds / 3600);
  const minutes = Math.floor((countdown.seconds % 3600) / 60);
  const seconds = Math.floor(countdown.seconds % 60);

  return (
    <header className={`fixed top-0 right-0 z-20 h-auto bg-bg-surface/95 backdrop-blur-md border-b border-bg-border
      transition-all duration-300 ${sidebarOpen ? 'lg:left-60 left-0' : 'lg:left-[68px] left-0'}`}>
      
      <div className="flex items-center gap-4 px-4 h-12 overflow-x-auto scrollbar-none text-xs">
        <button onClick={toggleSidebar} className="lg:hidden text-text-secondary hover:text-text-primary">
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-text-secondary font-medium">NEPSE</span>
          <span className="font-jetbrains font-bold text-text-primary">{formatNepaliNumber(nepseIndex.currentValue)}</span>
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
        </div>

        <div className="flex-1" />

        <button 
          onClick={toggleSearch} 
          className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-secondary hover:text-text-primary transition-colors" 
          title="Search (Ctrl+K)"
        >
          <Search size={16} />
        </button>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors relative
              ${notificationsOpen ? 'bg-bg-elevated text-brand-cyan' : 'hover:bg-bg-elevated'}`}
            title="Notifications & Alerts"
          >
            <Bell size={16} />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-brand-cyan rounded-full shadow-glow-cyan" />
          </button>
          {notificationsOpen && <NotificationDropdown onClose={() => setNotificationsOpen(false)} />}
        </div>

        <div className="relative" ref={accountRef}>
          <button 
            onClick={() => setAccountOpen(!accountOpen)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300
              ${accountOpen ? 'ring-2 ring-brand-cyan ring-offset-2 ring-offset-bg-surface scale-110' : 'hover:scale-105'}`}
            title="Account"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center shadow-lg">
              <User size={14} className="text-white" />
            </div>
          </button>
          {accountOpen && <AccountDropdown onClose={() => setAccountOpen(false)} />}
        </div>
      </div>
    </header>
  );
}

