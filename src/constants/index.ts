// NEPSE Elite — Constants

export const SECTORS = [
  { id: 'commercial-banks', name: 'Commercial Banks', nameNepali: 'वाणिज्य बैंक' },
  { id: 'development-banks', name: 'Development Banks', nameNepali: 'विकास बैंक' },
  { id: 'finance', name: 'Finance Companies', nameNepali: 'वित्त कम्पनी' },
  { id: 'microfinance', name: 'Microfinance', nameNepali: 'लघुवित्त' },
  { id: 'hydropower', name: 'Hydropower', nameNepali: 'जलविद्युत' },
  { id: 'life-insurance', name: 'Life Insurance', nameNepali: 'जीवन बीमा' },
  { id: 'non-life-insurance', name: 'Non-Life Insurance', nameNepali: 'निर्जीवन बीमा' },
  { id: 'hotels', name: 'Hotels & Tourism', nameNepali: 'होटल तथा पर्यटन' },
  { id: 'manufacturing', name: 'Manufacturing & Processing', nameNepali: 'उत्पादन तथा प्रशोधन' },
  { id: 'trading', name: 'Trading', nameNepali: 'व्यापार' },
  { id: 'mutual-funds', name: 'Mutual Funds', nameNepali: 'म्युचुअल फण्ड' },
  { id: 'investment', name: 'Investment', nameNepali: 'लगानी' },
  { id: 'others', name: 'Others', nameNepali: 'अन्य' },
] as const;

export const BROKER_FEE_TIERS = [
  { maxAmount: 50000, rate: 0.0040 },
  { maxAmount: 500000, rate: 0.0037 },
  { maxAmount: 2000000, rate: 0.0034 },
  { maxAmount: Infinity, rate: 0.0030 },
];

export const SEBON_FEE = 0.00015;
export const DP_CHARGE = 25;

export const CGT_INDIVIDUAL_SHORT = 0.075;
export const CGT_INDIVIDUAL_LONG = 0.05;
export const CGT_INSTITUTION = 0.10;
export const DIVIDEND_TAX = 0.05;

export const STOCK_CIRCUIT = 0.05;
export const INDEX_CIRCUIT_1 = 0.03;
export const INDEX_CIRCUIT_2 = 0.05;

export const MARKET_OPEN_HOUR = 10;
export const MARKET_OPEN_MINUTE = 0;
export const MARKET_CLOSE_HOUR = 15;
export const MARKET_CLOSE_MINUTE = 0;
export const PRE_OPEN_HOUR = 9;
export const PRE_OPEN_MINUTE = 45;

// Nepal trading days: Sunday(0) to Thursday(4)
export const TRADING_DAYS = [0, 1, 2, 3, 4]; // 0=Sunday

export const NEPAL_TIMEZONE_OFFSET = 5.75; // UTC+5:45

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/live-market', label: 'Live Market', icon: 'Activity' },
  { path: '/stock', label: 'Charts', icon: 'CandlestickChart' },
  { path: '/screener', label: 'Screener', icon: 'Filter' },
  { path: '/floorsheet', label: 'Floorsheet', icon: 'FileSpreadsheet' },
  { path: '/broker-intel', label: 'Broker Intel', icon: 'Building2' },
  { path: '/ipo-zone', label: 'IPO Zone', icon: 'Rocket' },
  { path: '/portfolio', label: 'Portfolio', icon: 'Briefcase' },
  { path: '/watchlist', label: 'Watchlist', icon: 'Star' },
  { path: '/fundamentals', label: 'Fundamentals', icon: 'BookOpen' },
  { path: '/sector', label: 'Sectors', icon: 'PieChart' },
  { path: '/mutual-funds', label: 'Mutual Funds', icon: 'Landmark' },
  { path: '/calculators', label: 'Calculators', icon: 'Calculator' },
  { path: '/news-alerts', label: 'News & Alerts', icon: 'Bell' },
  { path: '/education', label: 'Education', icon: 'GraduationCap' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
] as const;

export const NEPSE_HOLIDAYS_2082 = [
  '2082-01-01', // New Year
  '2082-01-11', // Lok Tantra Divas
  '2082-01-18', // Buddha Jayanti
  '2082-02-15', // Republic Day
  '2082-06-17', // Dashain start
  '2082-06-18',
  '2082-06-19',
  '2082-06-20',
  '2082-06-21',
  '2082-06-22',
  '2082-06-23',
  '2082-07-03', // Tihar start
  '2082-07-04',
  '2082-07-05',
  '2082-07-06',
  '2082-07-07',
];
