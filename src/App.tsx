import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useUIStore } from './store';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import SearchOverlay from './components/layout/SearchOverlay';
import BrokerDetailModal from './components/shared/BrokerDetailModal';
import Dashboard from './pages/Dashboard';
import LiveMarket from './pages/LiveMarket';
import StockDetail from './pages/StockDetail';
import Screener from './pages/Screener';
import Floorsheet from './pages/Floorsheet';
import IPOZone from './pages/IPOZone';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import Fundamentals from './pages/Fundamentals';
import BrokerIntel from './pages/BrokerIntel';
import SectorAnalysis from './pages/SectorAnalysis';
import Calculators from './pages/Calculators';
import AdvancedCharts from './pages/AdvancedCharts';
import MutualFunds from './pages/MutualFunds';
import NewsAlerts from './pages/NewsAlerts';
import Education from './pages/Education';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { sidebarOpen, theme, accentColor, compactMode } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    
    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.remove('light');
      } else {
        root.classList.add('light');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    if (compactMode) {
      document.documentElement.classList.add('compact');
    } else {
      document.documentElement.classList.remove('compact');
    }
  }, [compactMode]);

  useEffect(() => {
    const root = document.documentElement;
    const hexToRgb = (hex: string) => {
      if (!hex.startsWith('#')) return hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r} ${g} ${b}`;
    };
    root.style.setProperty('--brand-cyan', hexToRgb(accentColor));
  }, [accentColor]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary selection:bg-brand-cyan/20">
      <Sidebar />
      <TopBar />
      <SearchOverlay />
      <BrokerDetailModal />
      
      <main className={`transition-all duration-300 pt-16 min-h-screen ${sidebarOpen ? 'lg:pl-60 pl-0' : 'lg:pl-[68px] pl-0'}`}>
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => useUIStore.getState().toggleSidebar()}
          />
        )}
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/live-market" element={<LiveMarket />} />
            <Route path="/stock/:symbol" element={<StockDetail />} />
            <Route path="/charts" element={<AdvancedCharts />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/floorsheet" element={<Floorsheet />} />
            <Route path="/broker-intel" element={<BrokerIntel />} />
            <Route path="/ipo-zone" element={<IPOZone />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/fundamentals" element={<Fundamentals />} />
            <Route path="/sector" element={<SectorAnalysis />} />
            <Route path="/mutual-funds" element={<MutualFunds />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/news-alerts" element={<NewsAlerts />} />
            <Route path="/education" element={<Education />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'card border-bg-border !bg-bg-surface !text-text-primary',
          duration: 3000,
        }}
      />
    </div>
  );
}
