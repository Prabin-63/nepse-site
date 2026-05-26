import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store';
import {
  LayoutDashboard, Activity, CandlestickChart, Filter,
  Building, Briefcase, Star, BookOpen, PieChart, Landmark,
  Calculator, Bell, GraduationCap, Settings, ChevronLeft, ChevronRight, TrendingUp,
  ArrowRightLeft, Target, Network, ShieldAlert, Map, Zap, MapPin, Award, Calendar, Clipboard
} from 'lucide-react';

const navGroups = [
  {
    label: 'Market',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/live-market', label: 'Live Market', icon: Activity },
      { path: '/heat-map', label: 'Heat Map', icon: Map },
      { path: '/charts', label: 'Charts', icon: CandlestickChart },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { path: '/signals', label: 'Trading Signals', icon: Zap },
      { path: '/compare', label: 'Compare Stocks', icon: ArrowRightLeft },
      { path: '/screener', label: 'Screener', icon: Filter },
      { path: '/broker-analysis', label: 'Broker Analysis', icon: Building },
      { path: '/fundamentals', label: 'Fundamentals', icon: BookOpen },
      { path: '/sector', label: 'Sectors', icon: PieChart },
    ],
  },
  {
    label: 'Smart Money',
    items: [
      { path: '/sbie/broker-map', label: 'Broker Map', icon: MapPin },
      { path: '/sbie/risk-scanner', label: 'Risk Scanner', icon: ShieldAlert },
      { path: '/sbie/accumulation', label: 'Accumulation', icon: Target },
      { path: '/sbie/coordination', label: 'Coordination', icon: Network },
      { path: '/sbie/scorecards', label: 'Broker Scorecards', icon: Award },
    ],
  },
  {
    label: 'Invest',
    items: [
      { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
      { path: '/watchlist', label: 'Watchlist', icon: Star },
      { path: '/calendar', label: 'Inv. Calendar', icon: Calendar },
      { path: '/mutual-funds', label: 'Mutual Funds', icon: Landmark },
    ],
  },
  {
    label: 'Tools',
    items: [
      { path: '/calculators', label: 'Calculators', icon: Calculator },
      { path: '/notes', label: 'Trading Notes', icon: Clipboard },
      { path: '/news-alerts', label: 'News & Alerts', icon: Bell },
      { path: '/education', label: 'Education', icon: GraduationCap },
    ],
  },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-bg-surface border-r border-bg-border z-40
        flex flex-col transition-transform lg:transition-all duration-300
        ${sidebarOpen ? 'translate-x-0 w-60 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0 w-60 lg:w-[68px]'}`}
    >

      <div className="flex items-center gap-3 px-4 h-16 border-b border-bg-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-violet flex items-center justify-center shadow-glow-cyan/20">
          <TrendingUp size={18} className="text-white" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="font-syne font-bold text-sm text-text-primary tracking-tight">NEPSE Elite</span>
            <span className="text-[10px] text-text-muted">Nepal Stock Analysis</span>
          </div>
        )}
      </div>


      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <div className="nav-section-label">{group.label}</div>
            )}
            {!sidebarOpen && <div className="h-px bg-bg-border/50 mx-2 my-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative
                      ${isActive
                        ? 'text-brand-cyan bg-brand-cyan/[0.08] font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/70'
                      }`
                    }
                    onClick={() => { if (window.innerWidth < 1024 && sidebarOpen) toggleSidebar(); }}
                    title={item.label}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-cyan shadow-glow-cyan" />
                        )}
                        <Icon size={18} className="shrink-0" />
                        {sidebarOpen && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>


      <div className="border-t border-bg-border px-2 py-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
            ${isActive
              ? 'text-brand-cyan bg-brand-cyan/[0.08] font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/70'
            }`
          }
          onClick={() => { if (window.innerWidth < 1024 && sidebarOpen) toggleSidebar(); }}
          title="Settings"
        >
          <Settings size={18} className="shrink-0" />
          {sidebarOpen && <span>Settings</span>}
        </NavLink>
      </div>


      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-elevated/50 transition-all"
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    </aside>
  );
}
