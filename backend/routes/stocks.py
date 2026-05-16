from fastapi import APIRouter, HTTPException
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

@router.get("/list")
def get_company_list():
    cached = cache.get("company_list")
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = nepse_client.get_company_list()
    if data:
        cache.set("company_list", data, 3600)
        return {"status": "ok", "source": "live", "data": data}
    raise HTTPException(status_code=503, detail="NEPSE company list unavailable")

@router.get("/{symbol}/price")
def get_stock_price(symbol: str):
    cache_key = f"price_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = nepse_client.get_company_price_detail(symbol.upper())
    if data:
        cache.set(cache_key, data, 60)
        return {"status": "ok", "source": "live", "data": data}
    raise HTTPException(status_code=404, detail=f"Price data not found for {symbol}")

@router.get("/{symbol}/detail")
def get_stock_detail(symbol: str):
    cache_key = f"detail_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = nepse_client.get_security_detail(symbol.upper())
    if data:
        cache.set(cache_key, data, 300)
        return {"status": "ok", "source": "live", "data": data}
    raise HTTPException(status_code=404, detail=f"Detail not found for {symbol}")

@router.get("/{symbol}/chart/daily")
def get_stock_daily_chart(symbol: str):
    cache_key = f"chart_daily_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_company_daily_chart(symbol.upper())
    if data:
        cache.set(cache_key, data, 3600)
        return {"status": "ok", "data": data}
    raise HTTPException(status_code=404, detail=f"Chart data not found for {symbol}")

@router.get("/{symbol}/chart")
def get_stock_chart(symbol: str):
    cache_key = f"chart_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_company_chart(symbol.upper())
    if data:
        cache.set(cache_key, data, 3600)
        return {"status": "ok", "data": data}
    raise HTTPException(status_code=404, detail=f"Chart not found for {symbol}")
