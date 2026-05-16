const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const https = require('https');

const app = express();
const PORT = 3001;

// Allow self-signed certs from NEPSE
const agent = new https.Agent({ rejectUnauthorized: false });

app.use(cors({ origin: '*' }));
app.use(express.json());
const cache = new Map();
const CACHE_TTL = {
  'market-open': 30 * 1000,        // 30s
  'market-summary': 60 * 1000,     // 1min
  'today-price': 30 * 1000,        // 30s
  'top-gainers': 60 * 1000,
  'top-losers': 60 * 1000,
  'top-volume': 60 * 1000,
  'top-turnover': 60 * 1000,
  'floorsheet': 30 * 1000,
  'index': 30 * 1000,
  'company-list': 300 * 1000,      // 5min
  'security-detail': 120 * 1000,
  'graph': 3600 * 1000,            // 1hr for historical
  default: 60 * 1000,
};

function getCacheTTL(key) {
  for (const [pattern, ttl] of Object.entries(CACHE_TTL)) {
    if (key.includes(pattern)) return ttl;
  }
  return CACHE_TTL.default;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > getCacheTTL(key)) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}
const NEPSE_BASE = 'https://nepalstock.com.np/api';
const NEPSE_NEWWEB = 'https://newweb.nepalstock.com.np/api';

// Common headers to mimic browser
const NEPSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://nepalstock.com.np/',
  'Origin': 'https://nepalstock.com.np',
};
async function fetchNepse(path, baseUrl = NEPSE_BASE, method = 'GET', body = null) {
  const cacheKey = `${method}:${path}:${JSON.stringify(body || '')}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const opts = {
    method,
    headers: { ...NEPSE_HEADERS, 'Content-Type': 'application/json' },
    agent,
    timeout: 15000,
  };
  if (body) opts.body = JSON.stringify(body);

  // Try primary URL first, then fallback
  const urls = [
    `${baseUrl}${path}`,
    `${baseUrl === NEPSE_BASE ? NEPSE_NEWWEB : NEPSE_BASE}${path}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, opts);
      if (res.ok) {
        const data = await res.json();
        setCache(cacheKey, data);
        return data;
      }
    } catch (e) {
      console.log(`Failed ${url}: ${e.message}`);
    }
  }
  return null;
}

// Market Status
app.get('/api/market-status', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/nepse-data/market-open');
    if (data) return res.json(data);
    // Fallback: calculate from Nepal time
    const npt = new Date(Date.now() + 5.75 * 3600000);
    const day = npt.getUTCDay();
    const h = npt.getUTCHours();
    const m = npt.getUTCMinutes();
    const mins = h * 60 + m;
    const isTradingDay = day >= 0 && day <= 4;
    let status = 'CLOSE';
    if (isTradingDay) {
      if (mins >= 585 && mins < 600) status = 'PRE_OPEN';
      else if (mins >= 600 && mins < 900) status = 'OPEN';
    }
    res.json({ isOpen: status === 'OPEN' ? 'OPEN' : status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Market Summary / Indices
app.get('/api/market-summary', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/market-summary');
    if (data) return res.json(data);
    res.status(503).json({ error: 'NEPSE data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// NEPSE Index
app.get('/api/index', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/nepse-index');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Index data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Today's Prices (all stocks)
app.get('/api/today-price', async (req, res) => {
  try {
    // NEPSE uses POST for this endpoint with pagination
    const body = {
      id: '',
      size: 500,
      sort: { sort: [{ field: 'symbol', dir: 'asc' }] },
    };
    const data = await fetchNepse('/nots/security/today-price', NEPSE_BASE, 'POST', body);
    if (data) return res.json(data);
    res.status(503).json({ error: 'Price data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Top Gainers
app.get('/api/top-gainers', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/top-ten/top-gainer');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Top Losers
app.get('/api/top-losers', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/top-ten/top-loser');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Top Volume
app.get('/api/top-volume', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/top-ten/trade-qty');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Top Turnover
app.get('/api/top-turnover', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/top-ten/turnover');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Company List
app.get('/api/companies', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/company/list');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Company list unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Security Detail (single stock)
app.get('/api/security/:id', async (req, res) => {
  try {
    const data = await fetchNepse(`/nots/security/${req.params.id}`);
    if (data) return res.json(data);
    res.status(503).json({ error: 'Security detail unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stock Graph / Historical (chart data)
app.get('/api/graph/:id', async (req, res) => {
  try {
    const data = await fetchNepse(`/nots/market/graphdata/${req.params.id}`);
    if (data) return res.json(data);
    res.status(503).json({ error: 'Graph data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Floorsheet
app.post('/api/floorsheet', async (req, res) => {
  try {
    const body = req.body || {
      id: '',
      size: 200,
      sort: { sort: [{ field: 'contractId', dir: 'asc' }] },
    };
    const data = await fetchNepse('/nots/security/floorsheet', NEPSE_BASE, 'POST', body);
    if (data) return res.json(data);
    res.status(503).json({ error: 'Floorsheet unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sector-wise summary
app.get('/api/sectors', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/sectorwise');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Sector data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Supply Demand
app.get('/api/supply-demand', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/nepse-data/supplydemand');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Broker list
app.get('/api/brokers', async (req, res) => {
  try {
    const data = await fetchNepse('/nots/member?&page=0&size=100&memberCode=');
    if (data) return res.json(data);
    res.status(503).json({ error: 'Broker data unavailable' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/company-price/:symbol', async (req, res) => {
  try {
    // Try to find the stock in today's prices
    const body = {
      id: '',
      size: 500,
      sort: { sort: [{ field: 'symbol', dir: 'asc' }] },
    };
    const data = await fetchNepse('/nots/security/today-price', NEPSE_BASE, 'POST', body);
    if (data?.content) {
      const stock = data.content.find(s => s.symbol === req.params.symbol.toUpperCase());
      if (stock) return res.json(stock);
    }
    res.status(404).json({ error: 'Symbol not found' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cache_size: cache.size, uptime: process.uptime() });
});
app.listen(PORT, () => {
  console.log(`🚀 NEPSE Elite Proxy Server running on http://localhost:${PORT}`);
  console.log(`📊 Proxying NEPSE data from ${NEPSE_BASE}`);
});
