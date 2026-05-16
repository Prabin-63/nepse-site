from fastapi import APIRouter
from nepse_client import nepse_client
from cache import cache
import logging

router = APIRouter(prefix="/api/summary", tags=["summary"])
logger = logging.getLogger("summary")

@router.get("/dashboard")
def get_dashboard_summary():
    """
    Single endpoint that powers the entire Dashboard page.
    Aggregates: index, summary, gainers, losers, turnover, volume, status.
    Returns everything the Dashboard needs in ONE request.
    """
    def get_cached_or_fetch(key, fetch_fn, ttl):
        data = cache.get(key)
        if not data:
            data = fetch_fn()
            if data:
                cache.set(key, data, ttl)
        return data

    return {
        "status": "ok",
        "data": {
            "nepse_index":   get_cached_or_fetch("nepse_index", nepse_client.get_nepse_index, 60),
            "market_summary": get_cached_or_fetch("market_summary", nepse_client.get_market_summary, 120),
            "market_status": nepse_client.get_market_status(),
            "top_gainers":   get_cached_or_fetch("top_gainers", nepse_client.get_top_gainers, 60),
            "top_losers":    get_cached_or_fetch("top_losers", nepse_client.get_top_losers, 60),
            "top_turnover":  get_cached_or_fetch("top_turnover", nepse_client.get_top_turnover, 60),
            "top_volume":    get_cached_or_fetch("top_volume", nepse_client.get_top_volume, 60),
            "sector_indices": get_cached_or_fetch("sector_sub_indices", nepse_client.get_sector_sub_indices, 300),
            "events": [
                {"id": 1, "type": "ipo", "title": "Reliance Spinning Mills Limited", "date": "2024-05-20", "description": "IPO Issue for Public - 1,155,960 units", "symbol": "RSML"},
                {"id": 2, "type": "dividend", "title": "Nabil Bank Limited (NABIL)", "date": "2024-05-25", "description": "11% Bonus Share & 2% Cash Dividend", "symbol": "NABIL"},
                {"id": 3, "type": "agm", "title": "HIDCL 12th AGM", "date": "2024-05-18", "description": "Venue: Amritbhog, Kalikasthan, 11:00 AM", "symbol": "HIDCL"},
                {"id": 4, "type": "ipo", "title": "Sarbottam Cement Limited", "date": "2024-05-15", "description": "Trading commenced after successful IPO", "symbol": "SARBTM"}
            ],
            "live_market": get_cached_or_fetch("live_trading", nepse_client.get_live_trading, 60),
        }
    }

@router.get("/cache-stats")
def get_cache_stats():
    """Internal health check: see what's cached and how many keys."""
    from cache import cache
    return {"status": "ok", "cache": cache.stats()}
