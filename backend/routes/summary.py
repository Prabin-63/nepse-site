from fastapi import APIRouter
import asyncio
import concurrent.futures
from nepse_client import nepse_client
from cache import cache
import logging

router = APIRouter(prefix="/api/summary", tags=["summary"])
logger = logging.getLogger("summary")

def _get_cached_or_fetch(key, fetch_fn, ttl):
    """Check cache first, then fetch from NEPSE API. Used by the thread pool."""
    data = cache.get(key)
    if not data:
        data = fetch_fn()
        if data:
            cache.set(key, data, ttl)
    return data

@router.get("/dashboard")
async def get_dashboard_summary():
    """
    Single endpoint that powers the entire Dashboard page.
    Aggregates: index, summary, gainers, losers, turnover, volume, status.
    Returns everything the Dashboard needs in ONE request.
    """
    cached_dashboard = cache.get("full_dashboard_payload")
    if cached_dashboard:
        return cached_dashboard

    tasks = {
        "nepse_index": ("nepse_index", nepse_client.get_nepse_index, 60),
        "market_summary": ("market_summary", nepse_client.get_market_summary, 120),
        "market_status": ("market_status", nepse_client.get_market_status, 60),
        "top_gainers": ("top_gainers", nepse_client.get_top_gainers, 60),
        "top_losers": ("top_losers", nepse_client.get_top_losers, 60),
        "top_turnover": ("top_turnover", nepse_client.get_top_turnover, 60),
        "top_volume": ("top_volume", nepse_client.get_top_volume, 60),
        "sector_indices": ("sector_sub_indices", nepse_client.get_sector_sub_indices, 300),
        "events": ("dashboard_events", get_recent_news_events, 300),
        "live_market": ("live_trading", nepse_client.get_live_trading, 60),
    }

    def fetch_all():
        results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_key = {
                executor.submit(_get_cached_or_fetch, t[0], t[1], t[2]): key
                for key, t in tasks.items()
            }
            for future in concurrent.futures.as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    results[key] = future.result()
                except Exception as exc:
                    logger.error(f"Error fetching dashboard component '{key}': {exc}")
                    results[key] = [] if key != "market_status" else "CLOSED"
        return results

    results = await asyncio.to_thread(fetch_all)
    
    payload = {
        "status": "ok",
        "data": results
    }
    
    cache.set("full_dashboard_payload", payload, 5)  # Cache the whole payload for 5 seconds
    return payload

def get_recent_news_events():
    """Fetch recent news and map them to dashboard events structure."""
    fallback = [
        {"id": 1, "type": "ipo", "title": "Reliance Spinning Mills Limited", "date": "2026-05-20", "description": "IPO Issue for Public - 1,155,960 units", "symbol": "RSML"},
        {"id": 2, "type": "dividend", "title": "Nabil Bank Limited (NABIL)", "date": "2026-05-25", "description": "11% Bonus Share & 2% Cash Dividend", "symbol": "NABIL"},
        {"id": 3, "type": "agm", "title": "HIDCL 12th AGM", "date": "2026-05-18", "description": "Venue: Amritbhog, Kalikasthan, 11:00 AM", "symbol": "HIDCL"},
    ]
    try:
        import importlib
        news_module = importlib.import_module("routes.news")
        fetch_fn = getattr(news_module, "fetch_sharesansar_news", None)
        if not fetch_fn:
            return fallback
        news_data = fetch_fn()
        if not news_data:
            return fallback
        events = []
        for i, article in enumerate(news_data[:4]):
            events.append({
                "id": i + 1,
                "type": "news",
                "title": article.get("headline", ""),
                "date": article.get("date", "Today"),
                "description": article.get("category", ""),
                "symbol": article.get("source", "NEPSE")
            })
        return events if events else fallback
    except Exception as e:
        logger.error(f"Error mapping news to events: {e}")
        return fallback

@router.get("/cache-stats")
def get_cache_stats():
    """Internal health check: see what's cached and how many keys."""
    from cache import cache
    return {"status": "ok", "cache": cache.stats()}
