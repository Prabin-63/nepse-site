from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from nepse_client import nepse_client
from cache import cache
import logging
from datetime import datetime

logger = logging.getLogger("scheduler")

# TTLs in seconds
TTL_LIVE = 15       # Price-sensitive live data
TTL_MEDIUM = 60     # Slightly less volatile data
TTL_SLOW = 600      # Slow-changing data
TTL_STATIC = 3600   # Rarely changes

def is_market_hours() -> bool:
    """Check if current Nepal time is within trading hours."""
    from datetime import timezone, timedelta
    nepal_tz = timezone(timedelta(hours=5, minutes=45))
    now = datetime.now(nepal_tz)
    # Nepal market: Sun(6), Mon(0), Tue(1), Wed(2), Thu(3)
    trading_days = [0, 1, 2, 3, 6]
    if now.weekday() not in trading_days:
        return False
    # 9:55 AM to 3:05 PM with buffers
    total_mins = now.hour * 60 + now.minute
    return 595 <= total_mins < 905

import time
import concurrent.futures
import threading

def _fetch_and_cache(name, fetch_func, ttl):
    try:
        data = fetch_func()
        if data:
            cache.set(name, data, ttl_seconds=ttl)
            logger.debug(f"Scheduler cached '{name}' ({len(data) if isinstance(data, list) else 'obj'})")
    except Exception as e:
        logger.error(f"Error fetching {name}: {e}")

def refresh_live_data():
    """Refresh live data every 15s during market hours, every 60s when closed."""
    market_open = is_market_hours()
    if not market_open:
        # Off-hours: refresh every 4th cycle (~60s) so last session data stays available
        if int(time.time()) % 60 >= 15:
            return
        logger.info("Refreshing market data (off-hours)...")
        ttl = TTL_MEDIUM
    else:
        logger.info("Refreshing live market data (concurrently)...")
        ttl = TTL_LIVE

    tasks = [
        ("live_trading", nepse_client.get_live_trading, ttl),
        ("top_gainers", nepse_client.get_top_gainers, ttl),
        ("top_losers", nepse_client.get_top_losers, ttl),
        ("top_turnover", nepse_client.get_top_turnover, ttl),
        ("nepse_index", nepse_client.get_nepse_index, ttl),
        ("market_summary", nepse_client.get_market_summary, TTL_MEDIUM),
    ]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        for name, func, ttl in tasks:
            executor.submit(_fetch_and_cache, name, func, ttl)

def refresh_floorsheet():
    """Heavy operation. Called every 2 minutes."""
    if not is_market_hours():
        logger.debug("Market closed — skipping floorsheet refresh")
        return
    logger.info("Refreshing full floorsheet...")
    _fetch_and_cache("floorsheet_full", nepse_client.get_floorsheet, TTL_SLOW)

def refresh_slow_data():
    """Called every 10 minutes. Fetches heavier/less time-critical data."""
    logger.info("Refreshing slow data (concurrently)...")
    
    tasks = [
        ("company_list", nepse_client.get_company_list, TTL_STATIC),
        ("sector_sub_indices", nepse_client.get_sector_sub_indices, TTL_SLOW),
    ]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        for name, func, ttl in tasks:
            executor.submit(_fetch_and_cache, name, func, ttl)

def start_scheduler():
    scheduler = BackgroundScheduler()

    # Live data: every 15 seconds
    scheduler.add_job(
        refresh_live_data,
        trigger=IntervalTrigger(seconds=15),
        id="live_data_refresh",
        replace_existing=True,
    )

    # Slow data: every 10 minutes
    scheduler.add_job(
        refresh_slow_data,
        trigger=IntervalTrigger(minutes=10),
        id="slow_data_refresh",
        replace_existing=True,
    )

    # Floorsheet data: every 2 minutes
    scheduler.add_job(
        refresh_floorsheet,
        trigger=IntervalTrigger(minutes=2),
        id="floorsheet_refresh",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started (15s live cycle)")

    # Warm cache in a background thread so we don't block API startup
    def initial_warmup():
        logger.info("Starting initial cache warmup (all data including floorsheet)...")
        
        # Phase 1: Fast data — all in parallel
        fast_tasks = [
            ("live_trading", nepse_client.get_live_trading, TTL_MEDIUM),
            ("top_gainers", nepse_client.get_top_gainers, TTL_MEDIUM),
            ("top_losers", nepse_client.get_top_losers, TTL_MEDIUM),
            ("top_turnover", nepse_client.get_top_turnover, TTL_MEDIUM),
            ("top_volume", nepse_client.get_top_volume, TTL_MEDIUM),
            ("nepse_index", nepse_client.get_nepse_index, TTL_MEDIUM),
            ("market_summary", nepse_client.get_market_summary, TTL_MEDIUM),
            ("company_list", nepse_client.get_company_list, TTL_STATIC),
            ("sector_sub_indices", nepse_client.get_sector_sub_indices, TTL_SLOW),
        ]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            for name, func, ttl in fast_tasks:
                executor.submit(_fetch_and_cache, name, func, ttl)
        
        logger.info("Phase 1 warmup complete (fast data)")
        
        # Invalidate the cached dashboard payload so next request rebuilds it with fresh data
        cache.invalidate("full_dashboard_payload")
        
        # Phase 2: Floorsheet (heavy, runs after fast data is ready)
        _fetch_and_cache("floorsheet_full", nepse_client.get_floorsheet, TTL_SLOW)
        logger.info("Phase 2 warmup complete (floorsheet)")
        
        logger.info("Initial cache warmup fully completed.")
        
    threading.Thread(target=initial_warmup, daemon=True).start()

    return scheduler
