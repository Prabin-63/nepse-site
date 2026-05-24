from fastapi import APIRouter, HTTPException, Response
import asyncio
import io
import csv
from nepse_client import nepse_client
from cache import cache
import logging

router = APIRouter(prefix="/api/floorsheet", tags=["floorsheet"])
logger = logging.getLogger("floorsheet")

def _fetch_floorsheet_sync():
    """Fetch floorsheet from NEPSE API (blocking). Run in a thread."""
    data = nepse_client.get_floorsheet()
    if data:
        cache.set("floorsheet_full", data, 300)
    return data

@router.get("/export")
async def export_full_floorsheet():
    cached = cache.get("floorsheet_full")
    data = cached if cached else await asyncio.to_thread(_fetch_floorsheet_sync)
    
    if not data:
        raise HTTPException(status_code=503, detail="Floorsheet data unavailable for export")
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    if data:
        keys = list(data[0].keys())
        writer.writerow(keys)
        for row in data:
            writer.writerow([row.get(k, "") for k in keys])
            
    headers = {
        "Content-Disposition": "attachment; filename=nepse_floorsheet.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/")
async def get_full_floorsheet():
    """
    Full day floorsheet. This is the heaviest endpoint.
    Returns cached data immediately; if cache is empty, fetches in background thread.
    """
    cached = cache.get("floorsheet_full")
    if cached:
        return {"status": "ok", "source": "cache", "total": len(cached), "data": cached}
    
    # Fetch in a thread to avoid blocking the event loop
    data = await asyncio.to_thread(_fetch_floorsheet_sync)
    if data:
        return {"status": "ok", "source": "live", "total": len(data), "data": data}
    raise HTTPException(status_code=503, detail="Floorsheet data unavailable")

def _filter_floorsheet_by_symbol(floorsheet: list, symbol: str) -> list:
    sym = symbol.upper()
    return [
        t for t in floorsheet
        if (t.get("stockSymbol") or t.get("stock_symbol") or t.get("symbol") or "").upper() == sym
    ]


@router.get("/{symbol}")
async def get_company_floorsheet(symbol: str):
    sym = symbol.upper()
    cache_key = f"floorsheet_{sym}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "symbol": sym, "data": cached}

    data = await asyncio.to_thread(nepse_client.get_company_floorsheet, sym)
    if data:
        cache.set(cache_key, data, 300)
        return {"status": "ok", "source": "live", "symbol": sym, "data": data}

    # Fallback: filter from full-day floorsheet cache
    full = cache.get("floorsheet_full")
    if not full:
        full = await asyncio.to_thread(_fetch_floorsheet_sync)
    if full:
        filtered = _filter_floorsheet_by_symbol(full, sym)
        if filtered:
            cache.set(cache_key, filtered, 300)
            return {"status": "ok", "source": "floorsheet_filter", "symbol": sym, "data": filtered}

    return {"status": "ok", "source": "live", "symbol": sym, "data": []}
