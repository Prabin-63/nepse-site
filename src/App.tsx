import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useUIStore } from './store';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import SearchOverlay from './components/layout/SearchOverlay';
import BrokerDetailModal from './components/shared/BrokerDetailModal';
import SaarathiChat from './components/shared/SaarathiChat';
import Dashboard from './pages/Dashboard';
import LiveMarket from './pages/LiveMarket';
import StockDetail from './pages/StockDetail';
import Screener from './pages/Screener';
import Floorsheet from './pages/Floorsheet';
import IPOZone from './pages/IPOZone';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import Fundamentals from './pages/Fundamentals';
import SectorAnalysis from './pages/SectorAnalysis';
import Calculators from './pages/Calculators';
import AdvancedCharts from './pages/AdvancedCharts';
import MutualFunds from './pages/MutualFunds';
import NewsAlerts from './pages/NewsAlerts';
import Education from './pages/Education';
import LearnFromVideos from './pages/education/LearnFromVideos';
import VideoCourse from './pages/education/VideoCourse';
import SettingsPage from './pages/SettingsPage';
import MarketHeatMap from './pages/MarketHeatMap';
import TradingSignals from './pages/TradingSignals';
import CompareStocks from './pages/CompareStocks';
import InvestmentCalendar from './pages/InvestmentCalendar';
import TradingNotes from './pages/TradingNotes';
import BrokerIntelligenceMap from './pages/sbie/BrokerIntelligenceMap';
import ManipulationRiskScanner from './pages/sbie/ManipulationRiskScanner';
import StealthAccumulationDetector from './pages/sbie/StealthAccumulationDetector';
import BrokerCoordinationAlert from './pages/sbie/BrokerCoordinationAlert';
import BrokerScorecard from './pages/sbie/BrokerScorecard';
import BrokerAnalysis from './pages/broker-analysis/BrokerAnalysis';
import BrokerBreakdown from './pages/broker-analysis/BrokerBreakdown';
import BrokerTradeSummary from './pages/broker-analysis/BrokerTradeSummary';
import BrokerTradedStocks from './pages/broker-analysis/BrokerTradedStocks';
import BrokerHoldings from './pages/broker-analysis/BrokerHoldings';
import AccumulationDistribution from './pages/broker-analysis/AccumulationDistribution';
import { useAlertChecker } from './hooks/useAlertChecker';

export default function App() {
  const { sidebarOpen, theme, accentColor, compactMode } = useUIStore();
  
  // Initialize background alert checker
  useAlertChecker();

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
            <Route path="/floorsheet" element={<Navigate to="/broker-analysis/floorsheet" replace />} />
            <Route path="/broker-intel" element={<Navigate to="/broker-analysis/summary" replace />} />
            <Route path="/broker-analysis" element={<BrokerAnalysis />}>
              <Route index element={<Navigate to="breakdown" replace />} />
              <Route path="breakdown" element={<BrokerBreakdown />} />
              <Route path="summary" element={<BrokerTradeSummary />} />
              <Route path="profile" element={<Navigate to="../summary" replace />} />
              <Route path="traded-stocks" element={<BrokerTradedStocks />} />
              <Route path="holdings" element={<BrokerHoldings />} />
              <Route path="accum-dist" element={<AccumulationDistribution />} />
              <Route path="floorsheet" element={<Floorsheet />} />
            </Route>
            <Route path="/ipo-zone" element={<IPOZone />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/fundamentals" element={<Fundamentals />} />
            <Route path="/sector" element={<SectorAnalysis />} />
            <Route path="/mutual-funds" element={<MutualFunds />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/news-alerts" element={<NewsAlerts />} />
            <Route path="/education" element={<Education />} />
            <Route path="/education/videos" element={<LearnFromVideos />} />
            <Route path="/education/videos/:courseId" element={<VideoCourse />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/heat-map" element={<MarketHeatMap />} />
            <Route path="/signals" element={<TradingSignals />} />
            <Route path="/compare" element={<CompareStocks />} />
            <Route path="/calendar" element={<InvestmentCalendar />} />
            <Route path="/notes" element={<TradingNotes />} />
            <Route path="/sbie/broker-map" element={<BrokerIntelligenceMap />} />
            <Route path="/sbie/risk-scanner" element={<ManipulationRiskScanner />} />
            <Route path="/sbie/accumulation" element={<StealthAccumulationDetector />} />
            <Route path="/sbie/coordination" element={<BrokerCoordinationAlert />} />
            <Route path="/sbie/scorecards" element={<BrokerScorecard />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <SaarathiChat />

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
