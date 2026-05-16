from fastapi import APIRouter
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/market", tags=["market"])

@router.get("/live")
def get_live_trading():
    cached = cache.get("live_trading")
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = nepse_client.get_live_trading()
    if data:
        cache.set("live_trading", data, 60)
    return {"status": "ok", "source": "live", "data": data or []}

@router.get("/gainers")
def get_top_gainers():
    cached = cache.get("top_gainers")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_top_gainers()
    if data:
        cache.set("top_gainers", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/losers")
def get_top_losers():
    cached = cache.get("top_losers")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_top_losers()
    if data:
        cache.set("top_losers", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/turnover")
def get_top_turnover():
    cached = cache.get("top_turnover")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_top_turnover()
    if data:
        cache.set("top_turnover", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/volume")
def get_top_volume():
    cached = cache.get("top_volume")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_top_volume()
    if data:
        cache.set("top_volume", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/transactions")
def get_top_transactions():
    cached = cache.get("top_transactions")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_top_transaction()
    if data:
        cache.set("top_transactions", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/status")
def get_market_status():
    data = nepse_client.get_market_status()
    return {"status": "ok", "data": data}

@router.get("/summary")
def get_market_summary():
    cached = cache.get("market_summary")
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = nepse_client.get_market_summary()
    if data:
        cache.set("market_summary", data, 120)
    return {"status": "ok", "source": "live", "data": data or {}}
