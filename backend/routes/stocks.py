from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import asyncio
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

@router.get("/screener")
async def get_screener_data(
    sector: Optional[List[str]] = Query(None),
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    minChange: Optional[float] = None,
    maxChange: Optional[float] = None,
    minPE: Optional[float] = None,
    maxPE: Optional[float] = None,
    minEPS: Optional[float] = None,
    minDividend: Optional[float] = None,
    near52High: Optional[bool] = None,
    near52Low: Optional[bool] = None,
    volumeSpike: Optional[bool] = None,
    minMomentum: Optional[float] = None,
    maxMomentum: Optional[float] = None,
):
    live_data = cache.get("live_trading")
    if not live_data:
        live_data = await asyncio.to_thread(nepse_client.get_live_trading) or []
        if live_data:
            cache.set("live_trading", live_data, 15)

    companies = cache.get("company_list")
    if not companies:
        companies = await asyncio.to_thread(nepse_client.get_company_list) or []
        if companies:
            cache.set("company_list", companies, 3600)
    
    sector_map = {c.get("symbol"): c.get("sectorName") for c in companies}
    
    # Pre-compute average volume across all stocks for spike detection
    all_volumes = [s.get("totalTradeQuantity") or s.get("volume") or 0 for s in live_data]
    avg_market_vol = (sum(all_volumes) / len(all_volumes)) if all_volumes else 1
    
    result = []
    for s in live_data:
        sym = s.get("symbol")
        scrip_sector = sector_map.get(sym) or s.get("sectorName") or s.get("sector") or "Others"
        
        ltp = s.get("lastTradedPrice") or s.get("ltp") or 0
        change = s.get("percentageChange") or 0
        pe = s.get("peRatio") or 0
        eps = s.get("eps") or 0
        div = s.get("dividendYield") or 0
        prev_close = s.get("previousClose") or 0
        high52 = s.get("fiftyTwoWeekHigh") or 0
        low52 = s.get("fiftyTwoWeekLow") or 0
        vol = s.get("totalTradeQuantity") or s.get("volume") or 0
        
        # Compute server-side indicators
        pct_from_52h = ((high52 - ltp) / high52 * 100) if high52 > 0 else 999
        pct_from_52l = ((ltp - low52) / low52 * 100) if low52 > 0 else 999
        is_near_52h = pct_from_52h <= 5  # within 5% of 52W high
        is_near_52l = pct_from_52l <= 5  # within 5% of 52W low
        is_volume_spike = vol > (avg_market_vol * 3)  # 3x average
        
        # Momentum score: composite of change%, proximity to 52W high, volume
        momentum = 0.0
        if high52 > 0 and low52 > 0 and (high52 - low52) > 0:
            range_position = (ltp - low52) / (high52 - low52) * 100  # 0-100
            momentum = (change * 10) + (range_position * 0.5) + (20 if is_volume_spike else 0)
        
        # Apply basic filters
        if sector and scrip_sector not in sector: continue
        if minPrice is not None and ltp < minPrice: continue
        if maxPrice is not None and ltp > maxPrice: continue
        if minChange is not None and change < minChange: continue
        if maxChange is not None and change > maxChange: continue
        if minPE is not None and pe < minPE: continue
        if maxPE is not None and pe > maxPE: continue
        if minEPS is not None and eps < minEPS: continue
        if minDividend is not None and div < minDividend: continue
        
        # Apply advanced indicator filters
        if near52High is True and not is_near_52h: continue
        if near52Low is True and not is_near_52l: continue
        if volumeSpike is True and not is_volume_spike: continue
        if minMomentum is not None and momentum < minMomentum: continue
        if maxMomentum is not None and momentum > maxMomentum: continue
        
        result.append({
            "symbol": sym,
            "companyName": s.get("securityName") or s.get("companyName") or sym,
            "sector": scrip_sector,
            "ltp": ltp,
            "previousClose": prev_close,
            "changePercent": change,
            "volume": vol,
            "turnover": s.get("totalTradeValue") or s.get("totalTurnover") or s.get("turnover") or 0,
            "marketCap": s.get("marketCap") or 0,
            "eps": eps,
            "peRatio": pe,
            "bookValue": s.get("bookValue") or 0,
            "pbRatio": s.get("pbRatio") or 0,
            "dividendYield": div,
            "week52High": high52,
            "week52Low": low52,
            "near52High": is_near_52h,
            "near52Low": is_near_52l,
            "volumeSpike": is_volume_spike,
            "momentumScore": round(momentum, 2),
        })
        
    return {"status": "ok", "data": result}

def _build_screener_sync(sector, minPrice, maxPrice, minChange, maxChange, minPE, maxPE, minEPS, minDividend, near52High, near52Low, volumeSpike, minMomentum, maxMomentum):
    """Synchronous helper for the export endpoint."""
    live_data = cache.get("live_trading") or nepse_client.get_live_trading() or []
    companies = cache.get("company_list") or nepse_client.get_company_list() or []
    
    sector_map = {c.get("symbol"): c.get("sectorName") for c in companies}
    all_volumes = [s.get("totalTradeQuantity") or s.get("volume") or 0 for s in live_data]
    avg_market_vol = (sum(all_volumes) / len(all_volumes)) if all_volumes else 1
    
    result = []
    for s in live_data:
        sym = s.get("symbol")
        scrip_sector = sector_map.get(sym) or s.get("sectorName") or s.get("sector") or "Others"
        ltp = s.get("lastTradedPrice") or s.get("ltp") or 0
        change = s.get("percentageChange") or 0
        pe = s.get("peRatio") or 0
        eps = s.get("eps") or 0
        div = s.get("dividendYield") or 0
        vol = s.get("totalTradeQuantity") or s.get("volume") or 0
        high52 = s.get("fiftyTwoWeekHigh") or 0
        low52 = s.get("fiftyTwoWeekLow") or 0
        
        pct_from_52h = ((high52 - ltp) / high52 * 100) if high52 > 0 else 999
        pct_from_52l = ((ltp - low52) / low52 * 100) if low52 > 0 else 999
        is_near_52h = pct_from_52h <= 5
        is_near_52l = pct_from_52l <= 5
        is_volume_spike = vol > (avg_market_vol * 3)
        momentum = 0.0
        if high52 > 0 and low52 > 0 and (high52 - low52) > 0:
            range_position = (ltp - low52) / (high52 - low52) * 100
            momentum = (change * 10) + (range_position * 0.5) + (20 if is_volume_spike else 0)
        
        if sector and scrip_sector not in sector: continue
        if minPrice is not None and ltp < minPrice: continue
        if maxPrice is not None and ltp > maxPrice: continue
        if minChange is not None and change < minChange: continue
        if maxChange is not None and change > maxChange: continue
        if minPE is not None and pe < minPE: continue
        if maxPE is not None and pe > maxPE: continue
        if minEPS is not None and eps < minEPS: continue
        if minDividend is not None and div < minDividend: continue
        if near52High is True and not is_near_52h: continue
        if near52Low is True and not is_near_52l: continue
        if volumeSpike is True and not is_volume_spike: continue
        if minMomentum is not None and momentum < minMomentum: continue
        if maxMomentum is not None and momentum > maxMomentum: continue
        
        result.append({
            "symbol": sym, "companyName": s.get("securityName") or sym, "sector": scrip_sector,
            "ltp": ltp, "changePercent": change, "volume": vol, "eps": eps, "peRatio": pe,
            "week52High": high52, "week52Low": low52, "momentumScore": round(momentum, 2),
        })
    return result

@router.get("/screener/export")
async def export_screener_data(
    sector: Optional[List[str]] = Query(None),
    minPrice: Optional[float] = None, maxPrice: Optional[float] = None,
    minChange: Optional[float] = None, maxChange: Optional[float] = None,
    minPE: Optional[float] = None, maxPE: Optional[float] = None,
    minEPS: Optional[float] = None, minDividend: Optional[float] = None,
    near52High: Optional[bool] = None, near52Low: Optional[bool] = None,
    volumeSpike: Optional[bool] = None, minMomentum: Optional[float] = None,
    maxMomentum: Optional[float] = None,
):
    from fastapi import Response
    import io
    import csv
    
    data = await asyncio.to_thread(
        _build_screener_sync, sector, minPrice, maxPrice, minChange, maxChange,
        minPE, maxPE, minEPS, minDividend, near52High, near52Low,
        volumeSpike, minMomentum, maxMomentum
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    if data:
        keys = list(data[0].keys())
        writer.writerow(keys)
        for row in data:
            writer.writerow([row.get(k, "") for k in keys])
            
    headers = {
        "Content-Disposition": "attachment; filename=nepse_screener.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/list")
async def get_company_list():
    cached = cache.get("company_list")
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_company_list)
    if data:
        cache.set("company_list", data, 3600)
        return {"status": "ok", "source": "live", "data": data}
    raise HTTPException(status_code=503, detail="NEPSE company list unavailable")

@router.get("/{symbol}/price")
async def get_stock_price(symbol: str):
    cache_key = f"price_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_company_price_detail, symbol.upper())
    
    if not data:
        # Fallback: try from cached live market data first (instant), then fetch
        live_data = cache.get("live_trading")
        if not live_data:
            live_data = await asyncio.to_thread(nepse_client.get_live_trading)
        if live_data:
            stock = next((s for s in live_data if s.get('symbol') == symbol.upper()), None)
            if stock:
                data = {"securityDailyTradeDto": stock}
                
    if data:
        cache.set(cache_key, data, 15)
        return {"status": "ok", "source": "live", "data": data}
    raise HTTPException(status_code=404, detail=f"Price data not found for {symbol}")

@router.get("/{symbol}/detail")
async def get_stock_detail(symbol: str):
    cache_key = f"detail_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_security_detail, symbol.upper())
    
    if not data:
        # Fallback: try from cached live market data first
        live_data = cache.get("live_trading")
        if not live_data:
            live_data = await asyncio.to_thread(nepse_client.get_live_trading)
        if live_data:
            stock = next((s for s in live_data if s.get('symbol') == symbol.upper()), None)
            if stock:
                data = {"securityDailyTradeDto": stock}

    if data:
        cache.set(cache_key, data, 300)
        return {"status": "ok", "source": "live", "data": data}
    raise HTTPException(status_code=404, detail=f"Detail not found for {symbol}")

_EMPTY_DEPTH = {
    "marketDepth": {
        "buyMarketDepthList": [],
        "sellMarketDepthList": [],
        "totalBuyQty": 0,
        "totalSellQty": 0,
    }
}


@router.get("/{symbol}/brokers")
async def get_stock_broker_activity(symbol: str):
    """Aggregate today's broker buy/sell for a single symbol from floorsheet."""
    sym = symbol.upper()
    cache_key = f"broker_activity_{sym}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}

    from routes.brokers import BROKER_MAP

    floorsheet = cache.get("floorsheet_full")
    if not floorsheet:
        company = await asyncio.to_thread(nepse_client.get_company_floorsheet, sym)
        if company:
            floorsheet = company
        else:
            floorsheet = await asyncio.to_thread(nepse_client.get_floorsheet)
            if floorsheet:
                cache.set("floorsheet_full", floorsheet, 300)

    if not floorsheet:
        return {"status": "ok", "source": "empty", "data": []}

    trades = [t for t in floorsheet if (t.get("stockSymbol") or "").upper() == sym]
    if not trades and floorsheet:
        company = await asyncio.to_thread(nepse_client.get_company_floorsheet, sym)
        trades = company or []

    stats = {}
    for trade in trades:
        amount = (trade.get("contractRate") or 0) * (trade.get("contractQuantity") or 0)
        qty = trade.get("contractQuantity") or 0
        for side, member_key in (("buy", "buyerMemberId"), ("sell", "sellerMemberId")):
            bid = str(trade.get(member_key) or "")
            if not bid or bid == "None":
                continue
            if bid not in stats:
                stats[bid] = {
                    "id": bid,
                    "name": BROKER_MAP.get(bid, f"Broker #{bid}"),
                    "buy": 0,
                    "sell": 0,
                    "buyQty": 0,
                    "sellQty": 0,
                }
            if side == "buy":
                stats[bid]["buy"] += amount
                stats[bid]["buyQty"] += qty
            else:
                stats[bid]["sell"] += amount
                stats[bid]["sellQty"] += qty

    result = sorted(stats.values(), key=lambda x: x["buy"] + x["sell"], reverse=True)
    cache.set(cache_key, result, 120)
    return {"status": "ok", "source": "live", "data": result}


@router.get("/{symbol}/depth")
async def get_stock_depth(symbol: str):
    cache_key = f"depth_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_supply_demand, symbol.upper())
    if data:
        cache.set(cache_key, data, 15)
        return {"status": "ok", "source": "live", "data": data}
    return {"status": "ok", "source": "empty", "data": _EMPTY_DEPTH}

@router.get("/{symbol}/chart/daily")
async def get_stock_daily_chart(symbol: str):
    cache_key = f"chart_daily_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_company_daily_chart, symbol.upper())
    if data:
        cache.set(cache_key, data, 3600)
        return {"status": "ok", "data": data}
    raise HTTPException(status_code=404, detail=f"Chart data not found for {symbol}")

@router.get("/{symbol}/chart")
async def get_stock_chart(symbol: str):
    cache_key = f"chart_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_company_chart, symbol.upper())
    if data:
        cache.set(cache_key, data, 3600)
        return {"status": "ok", "data": data}
    raise HTTPException(status_code=404, detail=f"Chart not found for {symbol}")
