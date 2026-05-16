from fastapi import APIRouter, HTTPException
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/floorsheet", tags=["floorsheet"])

@router.get("/")
def get_full_floorsheet():
    """
    Full day floorsheet. This is the heaviest endpoint.
    Cache TTL = 5 minutes. Only call during market hours.
    """
    cached = cache.get("floorsheet_full")
    if cached:
        return {"status": "ok", "source": "cache", "total": len(cached), "data": cached}
    data = nepse_client.get_floorsheet()
    if data:
        cache.set("floorsheet_full", data, 300)
        return {"status": "ok", "source": "live", "total": len(data), "data": data}
    raise HTTPException(status_code=503, detail="Floorsheet data unavailable")

@router.get("/{symbol}")
def get_company_floorsheet(symbol: str):
    cache_key = f"floorsheet_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "symbol": symbol, "data": cached}
    data = nepse_client.get_company_floorsheet(symbol.upper())
    if data:
        cache.set(cache_key, data, 300)
        return {"status": "ok", "source": "live", "symbol": symbol, "data": data}
    raise HTTPException(status_code=404, detail=f"Floorsheet not found for {symbol}")
