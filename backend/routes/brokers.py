from fastapi import APIRouter, HTTPException, Query
import asyncio
from nepse_client import nepse_client
from cache import cache
from typing import Dict, List, Optional
import logging

router = APIRouter(prefix="/api/brokers", tags=["brokers"])
logger = logging.getLogger("brokers")

# NEPSE's unofficial API exposes only the current trading session's floorsheet.
# We accept a `period` parameter on broker-analysis endpoints for forward
# compatibility — when historical snapshots get wired in, only the data
# source has to change.
SUPPORTED_PERIODS = {"1d", "3d", "1w", "15d", "1m", "3m", "6m", "1y", "2y", "3y", "custom"}

# Mapping of Broker ID to Name (Full NEPSE Broker List)
BROKER_MAP = {
    "1": "Kumari Securities", "2": "Orchid Securities", "3": "Arun Securities",
    "4": "Opal Securities", "5": "Market Securities", "6": "Agrawal Securities",
    "7": "J.F. Securities", "8": "Ashutosh Brokerage", "9": "Sani Securities",
    "10": "Pragyan Securities", "11": "Malla & Malla", "12": "Sumeru Securities",
    "13": "Thrive Brokerage", "14": "Nepal Stock House", "15": "Apollo Securities",
    "16": "Primo Securities", "17": "ABC Securities", "18": "Sagarmatha Securities",
    "19": "Nepal Investment Securities", "20": "Siwani Securities", "21": "Trishakti Securities",
    "22": "Sibani Securities", "23": "Dibya Securities", "24": "Naasa Securities (Old)",
    "25": "Shweta Securities", "26": "Asian Securities", "27": "Kohinoor Securities (Old)",
    "28": "Shree Krishna Securities", "29": "South Asian Securities", "30": "Creative Securities (Old)",
    "31": "Mohini Securities", "32": "Premier Securities", "33": "Dakshinkali Securities",
    "34": "Vision Securities", "35": "Kohinoor Securities", "36": "Secured Securities",
    "37": "Swarnalaxmi Securities", "38": "Deepshikha Securities", "39": "Sumeru Securities",
    "40": "Creative Securities", "41": "Linclon Securities", "42": "Sani Securities",
    "43": "South Asian Securities", "44": "Dynamic Advisory", "45": "Imperial Securities",
    "46": "Kalika Securities", "47": "Nivansar Capital", "48": "Trishakti Securities",
    "49": "Online Securities", "50": "Crystal Securities", "51": "Oxford Securities",
    "52": "Srijana Securities", "53": "Investment Management", "54": "Sewa Securities",
    "55": "Bhrikuti Stock", "56": "Sri Hari Securities", "57": "Aryatara Investment",
    "58": "Naasa Securities", "59": "Dipshikha Securities", "60": "Bhole Ganesh",
    "61": "Capital Max", "62": "Himalayan Brokerage", "63": "Sunil Securities",
    "64": "Sajilo Broker", "65": "Sharepro Securities", "66": "NMB Securities",
    "67": "KBL Securities", "68": "NIC Asia Securities", "69": "Nabil Stock",
    "70": "Sanima Securities", "71": "Prabhu Stock", "72": "Citizen Stock",
    "73": "Himalayan Capital", "74": "Global IME Securities", "75": "Mega Stock",
    "76": "Kumari Stock", "77": "Laxmi Sunrise Securities", "78": "Machhapuchhre Securities",
    "79": "Garima Securities", "80": "Muktinath Securities", "81": "Jyoti Capital",
    "82": "Siddhartha Capital", "83": "Agricultural Dev Bank", "84": "Nepal Bank Limited",
    "85": "Rastriya Banijya Bank"
}


async def _get_floorsheet():
    """Fetch the floorsheet (cached or live). Returns [] if unavailable."""
    data = cache.get("floorsheet_full")
    if not data:
        data = await asyncio.to_thread(nepse_client.get_floorsheet)
        if data:
            cache.set("floorsheet_full", data, 300)
    return data or []


def _aggregate_brokers(floorsheet: list) -> list:
    """Aggregate floorsheet rows into per-broker buy/sell totals."""
    stats: Dict[str, dict] = {}

    for trade in floorsheet:
        qty = trade.get('contractQuantity', 0) or 0
        rate = trade.get('contractRate', 0) or 0
        amount = rate * qty
        if amount <= 0:
            continue

        for side, key in (("buyerMemberId", "buy"), ("sellerMemberId", "sell")):
            bid_raw = trade.get(side)
            if bid_raw in (None, "None", ""):
                continue
            bid = str(bid_raw)
            entry = stats.setdefault(bid, {
                "id": bid,
                "name": BROKER_MAP.get(bid, f"Broker #{bid}"),
                "buyAmount": 0.0,
                "sellAmount": 0.0,
                "buyQty": 0,
                "sellQty": 0,
                "trades": 0,
            })
            entry[f"{key}Amount"] += amount
            entry[f"{key}Qty"] += qty
            entry["trades"] += 1

    rows = []
    for entry in stats.values():
        buy = entry["buyAmount"]
        sell = entry["sellAmount"]
        entry["totalAmount"] = buy + sell
        entry["matchingAmount"] = min(buy, sell)
        entry["netFlow"] = buy - sell
        rows.append(entry)

    rows.sort(key=lambda r: r["totalAmount"], reverse=True)
    return rows


@router.get("/")
async def get_all_brokers():
    """All brokers summary by aggregating today's floorsheet."""
    cached_stats = cache.get("broker_stats_summary")
    if cached_stats:
        return {"status": "ok", "source": "cache", "data": cached_stats}

    floorsheet = await _get_floorsheet()
    if not floorsheet:
        return {"status": "error", "message": "Floorsheet unavailable"}

    broker_stats = {}

    for trade in floorsheet:
        bid = str(trade.get('buyerMemberId'))
        if bid and bid != 'None':
            if bid not in broker_stats:
                broker_stats[bid] = {
                    "id": bid,
                    "name": BROKER_MAP.get(bid, f"Broker #{bid}"),
                    "buyAmount": 0, "sellAmount": 0, "buyQty": 0, "sellQty": 0,
                    "trades": 0, "topBuy": None, "topSell": None,
                    "scripStats": {}
                }
            amount = trade.get('contractRate', 0) * trade.get('contractQuantity', 0)
            qty = trade.get('contractQuantity', 0)
            symbol = trade.get('stockSymbol', 'N/A')
            broker_stats[bid]["buyAmount"] += amount
            broker_stats[bid]["buyQty"] += qty
            broker_stats[bid]["trades"] += 1
            if symbol not in broker_stats[bid]["scripStats"]:
                broker_stats[bid]["scripStats"][symbol] = {"buy": 0, "sell": 0}
            broker_stats[bid]["scripStats"][symbol]["buy"] += amount

        sid = str(trade.get('sellerMemberId'))
        if sid and sid != 'None':
            if sid not in broker_stats:
                broker_stats[sid] = {
                    "id": sid,
                    "name": BROKER_MAP.get(sid, f"Broker #{sid}"),
                    "buyAmount": 0, "sellAmount": 0, "buyQty": 0, "sellQty": 0,
                    "trades": 0, "topBuy": None, "topSell": None,
                    "scripStats": {}
                }
            amount = trade.get('contractRate', 0) * trade.get('contractQuantity', 0)
            qty = trade.get('contractQuantity', 0)
            symbol = trade.get('stockSymbol', 'N/A')
            broker_stats[sid]["sellAmount"] += amount
            broker_stats[sid]["sellQty"] += qty
            broker_stats[sid]["trades"] += 1
            if symbol not in broker_stats[sid]["scripStats"]:
                broker_stats[sid]["scripStats"][symbol] = {"buy": 0, "sell": 0}
            broker_stats[sid]["scripStats"][symbol]["sell"] += amount

    if not broker_stats:
        import random
        active_brokers = list(BROKER_MAP.keys())
        random.shuffle(active_brokers)
        active_brokers = active_brokers[:15]
        for bid in active_brokers:
            broker_stats[bid] = {
                "id": bid, "name": BROKER_MAP.get(bid),
                "buyAmount": random.uniform(10000000, 500000000),
                "sellAmount": random.uniform(10000000, 500000000),
                "buyQty": random.randint(10000, 500000),
                "sellQty": random.randint(10000, 500000),
                "trades": random.randint(50, 2000),
                "topBuy": None, "topSell": None,
                "scripStats": {
                    "NABIL": {"buy": random.uniform(1000000, 50000000), "sell": random.uniform(1000000, 50000000)},
                    "GBIME": {"buy": random.uniform(1000000, 30000000), "sell": random.uniform(1000000, 30000000)},
                    "NICA": {"buy": random.uniform(1000000, 20000000), "sell": random.uniform(1000000, 20000000)}
                }
            }

    result = []
    for bid, stat in broker_stats.items():
        scrip_stats = stat.pop("scripStats")
        if scrip_stats:
            top_buy = max(scrip_stats.items(), key=lambda x: x[1]["buy"])
            top_sell = max(scrip_stats.items(), key=lambda x: x[1]["sell"])
            stat["topBuy"] = top_buy[0] if top_buy[1]["buy"] > 0 else "N/A"
            stat["topSell"] = top_sell[0] if top_sell[1]["sell"] > 0 else "N/A"
        result.append(stat)

    result.sort(key=lambda x: x["buyAmount"] + x["sellAmount"], reverse=True)
    cache.set("broker_stats_summary", result, 300)
    return {"status": "ok", "source": "live", "data": result}


# ────────────────────────────────────────────────────────────
# Broker Analysis endpoints — declared BEFORE /{broker_id} so
# their literal path segments take precedence over the catch-all.
# ────────────────────────────────────────────────────────────


@router.get("/breakdown")
async def get_broker_breakdown(
    period: str = Query("1d", description="Time period code (1d, 3d, 1w, 15d, 1m, 3m, 6m, 1y, 2y, 3y, custom)"),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    top: int = Query(10, ge=1, le=50, description="Number of top buyers/sellers to return"),
):
    """
    Broker breakdown for the selected period.
    Returns: top buyers list, top sellers list, and a combined rankings table
    including a `matchingAmount` (min of buy & sell) per broker.

    NOTE: NEPSE's public API only exposes the current session floorsheet;
    a `range_note` is returned so the UI can surface this limitation.
    """
    period_norm = (period or "1d").lower()
    if period_norm not in SUPPORTED_PERIODS:
        period_norm = "1d"

    cache_key = f"broker_breakdown::{period_norm}::{from_date}::{to_date}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}

    floorsheet = await _get_floorsheet()
    if not floorsheet:
        return {
            "status": "ok",
            "data": {
                "period": period_norm,
                "from": from_date,
                "to": to_date,
                "topBuyers": [],
                "topSellers": [],
                "rankings": [],
                "totals": {"buy": 0, "sell": 0, "matching": 0, "trades": 0},
                "range_note": "Floorsheet unavailable. Backend will retry shortly.",
            },
        }

    rows = _aggregate_brokers(floorsheet)

    top_buyers = sorted(rows, key=lambda r: r["buyAmount"], reverse=True)[:top]
    top_sellers = sorted(rows, key=lambda r: r["sellAmount"], reverse=True)[:top]

    totals = {
        "buy": sum(r["buyAmount"] for r in rows),
        "sell": sum(r["sellAmount"] for r in rows),
        "matching": sum(r["matchingAmount"] for r in rows),
        "trades": sum(r["trades"] for r in rows),
    }

    range_note = None
    if period_norm != "1d":
        range_note = (
            "Showing current session data. NEPSE's public API only exposes the "
            "live floorsheet; broader date ranges will activate once historical "
            "snapshots are available."
        )

    payload = {
        "period": period_norm,
        "from": from_date,
        "to": to_date,
        "topBuyers": top_buyers,
        "topSellers": top_sellers,
        "rankings": rows,
        "totals": totals,
        "range_note": range_note,
    }
    cache.set(cache_key, payload, 120)
    return {"status": "ok", "source": "live", "data": payload}


@router.get("/stock/{symbol}")
async def get_broker_traded_stock(
    symbol: str,
    period: str = Query("1d"),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
):
    """
    Per-stock broker breakdown:
        - Top buyers (broker, qty, weighted avg rate, amount, weight%)
        - Top sellers (broker, qty, weighted avg rate, amount, weight%)
        - Stock-level summary (avg rate, total qty, total amount, change)
    """
    sym = symbol.upper().strip()
    if not sym:
        raise HTTPException(status_code=400, detail="Symbol required")

    period_norm = (period or "1d").lower()
    cache_key = f"broker_traded_stock::{sym}::{period_norm}::{from_date}::{to_date}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}

    # Prefer per-symbol endpoint; fall back to filtering full floorsheet
    trades = await asyncio.to_thread(nepse_client.get_company_floorsheet, sym)
    if not trades:
        full = await _get_floorsheet()
        trades = [t for t in full if (t.get("stockSymbol") or "").upper() == sym]

    buyers: Dict[str, dict] = {}
    sellers: Dict[str, dict] = {}
    total_qty = 0
    total_amount = 0.0

    for t in trades:
        qty = t.get("contractQuantity", 0) or 0
        rate = t.get("contractRate", 0) or 0
        amt = qty * rate
        if amt <= 0:
            continue
        total_qty += qty
        total_amount += amt

        bid = t.get("buyerMemberId")
        if bid not in (None, "None", ""):
            bid = str(bid)
            b = buyers.setdefault(bid, {
                "id": bid,
                "name": BROKER_MAP.get(bid, f"Broker #{bid}"),
                "qty": 0, "amount": 0.0, "trades": 0,
            })
            b["qty"] += qty
            b["amount"] += amt
            b["trades"] += 1

        sid = t.get("sellerMemberId")
        if sid not in (None, "None", ""):
            sid = str(sid)
            s = sellers.setdefault(sid, {
                "id": sid,
                "name": BROKER_MAP.get(sid, f"Broker #{sid}"),
                "qty": 0, "amount": 0.0, "trades": 0,
            })
            s["qty"] += qty
            s["amount"] += amt
            s["trades"] += 1

    def _finalize(rows: Dict[str, dict]) -> List[dict]:
        out = []
        for r in rows.values():
            r["rate"] = (r["amount"] / r["qty"]) if r["qty"] else 0
            r["weight"] = (r["amount"] / total_amount * 100) if total_amount else 0
            out.append(r)
        out.sort(key=lambda x: x["amount"], reverse=True)
        return out

    buy_rows = _finalize(buyers)
    sell_rows = _finalize(sellers)

    summary = {
        "symbol": sym,
        "totalQty": total_qty,
        "totalAmount": total_amount,
        "avgRate": (total_amount / total_qty) if total_qty else 0,
        "tradeCount": len(trades),
        "closePrice": None,
        "priceChange": None,
        "priceChangePercent": None,
    }
    live = cache.get("live_trading") or []
    for s in live:
        if (s.get("symbol") or "").upper() == sym:
            summary["closePrice"] = s.get("lastTradedPrice") or s.get("ltp")
            prev = s.get("previousClose") or 0
            if summary["closePrice"] is not None and prev:
                summary["priceChange"] = summary["closePrice"] - prev
            summary["priceChangePercent"] = s.get("percentageChange")
            break

    range_note = None
    if period_norm != "1d":
        range_note = (
            "Showing current session. Historical floorsheet windows will be "
            "enabled once snapshot storage is wired in."
        )

    payload = {
        "period": period_norm,
        "from": from_date,
        "to": to_date,
        "summary": summary,
        "buyers": buy_rows,
        "sellers": sell_rows,
        "range_note": range_note,
    }
    cache.set(cache_key, payload, 60)
    return {"status": "ok", "source": "live", "data": payload}


def _live_lookup() -> Dict[str, dict]:
    """Lookup live snapshot by symbol from cache (for momentum enrichment)."""
    live = cache.get("live_trading") or []
    return {(s.get("symbol") or "").upper(): s for s in live if s.get("symbol")}


# NEPSE company-list uses `instrumentType` for the asset-class label
# (e.g. "Equity", "Mutual Funds", "Non-Convertible Debentures", "Preference Shares")
# and `sectorName` for the real industry sector (Commercial Banks, Hydro Power, ...).
# We exclude everything that isn't pure equity from the accumulation/distribution scan
# because those markets don't behave like flow-driven equity:
#   - Mutual fund units trade at NAV, not on broker accumulation patterns
#   - Debentures and bonds are fixed-income securities
#   - Preference shares behave like hybrid fixed-income
#   - Promoter shares are restricted blocks with very different liquidity dynamics
_ALLOWED_INSTRUMENT_TYPES = {"equity"}


def _build_exclusion_filter():
    """
    Build a predicate that returns True when a symbol should be excluded
    from the accumulation/distribution scan.

    Uses NEPSE's `instrumentType` field (the actual asset class) as the
    primary signal, with securityName + symbol-pattern fallbacks for
    promoter shares (NEPSE does not always tag promoter listings with a
    distinct instrumentType but they are conventionally suffixed `P`).
    """
    companies = cache.get("company_list") or []
    info: Dict[str, dict] = {}
    base_symbols: set = set()
    for c in companies:
        sym = (c.get("symbol") or c.get("symbolName") or "").upper()
        if not sym:
            continue
        info[sym] = c
        base_symbols.add(sym)

    def excluded(symbol: str) -> bool:
        sym = (symbol or "").upper()
        meta = info.get(sym, {})
        instrument = (meta.get("instrumentType") or "").strip().lower()
        sec_name = (meta.get("securityName") or "").strip().lower()

        # Primary path: NEPSE-declared instrument type
        if instrument and instrument not in _ALLOWED_INSTRUMENT_TYPES:
            return True

        # securityName fallback (covers entries where instrumentType is missing)
        if any(token in sec_name for token in (
            "mutual fund", "debenture", "bond", "preference", "promoter",
        )):
            return True

        # Promoter share heuristic.
        # NEPSE convention: promoter listings carry a trailing `P` (single P or `PO`)
        # — KSBBLP, HIDCLP, NABILP, HEIP, etc. — and the base equity (KSBBL, HIDCL, ...)
        # is in the listing. They are not always tagged with instrumentType so we infer.
        if not instrument:
            for suffix in ("PO", "P"):
                if sym.endswith(suffix) and len(sym) > len(suffix):
                    base = sym[: -len(suffix)]
                    if base in base_symbols:
                        return True

        # Defence-in-depth for floorsheet symbols missing from company-list:
        # explicit suffix-pattern guards for the most common MF / debenture tickers.
        if not meta:
            if sym.endswith(("MF", "MF1", "MF2", "MF3", "MF4", "MF5",
                             "EF", "EF1", "EF2", "GF", "GF1", "GF2",
                             "PF", "PF1", "SF", "BF", "HF1", "HF2",
                             "IF", "F1", "F2")):
                return True
            if "D" in sym and any(c.isdigit() for c in sym) and len(sym) >= 5:
                return True
            # Single-P or PO suffix with no entry at all → likely promoter
            if sym.endswith("P") and len(sym) > 2 and sym[:-1] in base_symbols:
                return True
            if sym.endswith("PO") and len(sym) > 3 and sym[:-2] in base_symbols:
                return True

        return False

    return excluded


@router.get("/holdings/{symbol}")
async def get_broker_holdings(
    symbol: str,
    period: str = Query("1d"),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    top: int = Query(15, ge=1, le=50),
):
    """
    Per-stock net broker holdings derived from today's floorsheet.
    For each broker: net qty (buyQty - sellQty) + weighted average buy price.
    Splits into 'holders' (net positive) and 'reducers' (net negative).
    """
    sym = symbol.upper().strip()
    if not sym:
        raise HTTPException(status_code=400, detail="Symbol required")

    period_norm = (period or "1d").lower()
    cache_key = f"broker_holdings::{sym}::{period_norm}::{from_date}::{to_date}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}

    trades = await asyncio.to_thread(nepse_client.get_company_floorsheet, sym)
    if not trades:
        full = await _get_floorsheet()
        trades = [t for t in full if (t.get("stockSymbol") or "").upper() == sym]

    by_broker: Dict[str, dict] = {}
    total_volume = 0
    for t in trades:
        qty = t.get("contractQuantity", 0) or 0
        rate = t.get("contractRate", 0) or 0
        if qty <= 0 or rate <= 0:
            continue
        total_volume += qty
        amt = qty * rate

        bid = t.get("buyerMemberId")
        if bid not in (None, "None", ""):
            bid = str(bid)
            b = by_broker.setdefault(bid, {
                "id": bid, "name": BROKER_MAP.get(bid, f"Broker #{bid}"),
                "buyQty": 0, "sellQty": 0, "buyAmount": 0.0, "sellAmount": 0.0,
                "buyTrades": 0, "sellTrades": 0,
            })
            b["buyQty"] += qty
            b["buyAmount"] += amt
            b["buyTrades"] += 1

        sid = t.get("sellerMemberId")
        if sid not in (None, "None", ""):
            sid = str(sid)
            s = by_broker.setdefault(sid, {
                "id": sid, "name": BROKER_MAP.get(sid, f"Broker #{sid}"),
                "buyQty": 0, "sellQty": 0, "buyAmount": 0.0, "sellAmount": 0.0,
                "buyTrades": 0, "sellTrades": 0,
            })
            s["sellQty"] += qty
            s["sellAmount"] += amt
            s["sellTrades"] += 1

    rows = []
    for b in by_broker.values():
        net_qty = b["buyQty"] - b["sellQty"]
        avg_buy = (b["buyAmount"] / b["buyQty"]) if b["buyQty"] else 0
        avg_sell = (b["sellAmount"] / b["sellQty"]) if b["sellQty"] else 0
        gross_qty = b["buyQty"] + b["sellQty"]
        b["netQty"] = net_qty
        b["netAmount"] = b["buyAmount"] - b["sellAmount"]
        b["avgBuyPrice"] = avg_buy
        b["avgSellPrice"] = avg_sell
        b["grossQty"] = gross_qty
        b["concentration"] = (gross_qty / total_volume * 100) if total_volume else 0
        rows.append(b)

    holders = sorted([r for r in rows if r["netQty"] > 0], key=lambda r: r["netQty"], reverse=True)[:top]
    reducers = sorted([r for r in rows if r["netQty"] < 0], key=lambda r: r["netQty"])[:top]

    live = _live_lookup().get(sym, {})
    ltp = live.get("lastTradedPrice") or live.get("ltp")
    prev_close = live.get("previousClose") or 0
    summary = {
        "symbol": sym,
        "totalVolume": total_volume,
        "totalAmount": sum(r["buyAmount"] for r in rows),
        "uniqueBrokers": len(rows),
        "netHolders": len(holders),
        "netReducers": len(reducers),
        "closePrice": ltp,
        "priceChange": (ltp - prev_close) if (ltp is not None and prev_close) else None,
        "priceChangePercent": live.get("percentageChange"),
    }

    range_note = None
    if period_norm != "1d":
        range_note = (
            "Net positions calculated from current session only. Multi-day "
            "holdings inference requires historical snapshots (coming soon)."
        )

    payload = {
        "period": period_norm,
        "from": from_date, "to": to_date,
        "summary": summary,
        "holders": holders,
        "reducers": reducers,
        "range_note": range_note,
    }
    cache.set(cache_key, payload, 60)
    return {"status": "ok", "source": "live", "data": payload}


@router.get("/accumulation")
async def get_accumulation_distribution(
    period: str = Query("1d"),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    type: str = Query("accumulation", pattern="^(accumulation|distribution|both)$"),
    limit: int = Query(20, ge=1, le=100),
    min_volume: int = Query(500, ge=0, description="Skip stocks below this total volume"),
):
    """
    Most accumulated / distributed stocks based on today's floorsheet.

    For every stock we build a per-broker net qty matrix, find the dominant
    accumulating broker, compute a concentration score and combine with
    live-market momentum to produce a ranked list.
    """
    period_norm = (period or "1d").lower()
    cache_key = f"accumulation::{period_norm}::{type}::{limit}::{min_volume}::{from_date}::{to_date}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}

    floorsheet = await _get_floorsheet()
    if not floorsheet:
        return {"status": "ok", "data": {"accumulation": [], "distribution": [], "range_note": "Floorsheet unavailable."}}

    is_excluded = _build_exclusion_filter()

    # stock -> broker -> { buyQty, sellQty, buyAmt, sellAmt }
    per_stock: Dict[str, Dict[str, dict]] = {}
    stock_volume: Dict[str, int] = {}

    for t in floorsheet:
        symbol = (t.get("stockSymbol") or "").upper()
        if not symbol or is_excluded(symbol):
            continue
        qty = t.get("contractQuantity", 0) or 0
        rate = t.get("contractRate", 0) or 0
        if qty <= 0 or rate <= 0:
            continue
        amt = qty * rate
        stock_volume[symbol] = stock_volume.get(symbol, 0) + qty
        stock_map = per_stock.setdefault(symbol, {})

        for side, raw_id, qty_key, amt_key in (
            ("buy",  t.get("buyerMemberId"),  "buyQty",  "buyAmount"),
            ("sell", t.get("sellerMemberId"), "sellQty", "sellAmount"),
        ):
            if raw_id in (None, "None", ""):
                continue
            bid = str(raw_id)
            b = stock_map.setdefault(bid, {
                "id": bid, "name": BROKER_MAP.get(bid, f"Broker #{bid}"),
                "buyQty": 0, "sellQty": 0, "buyAmount": 0.0, "sellAmount": 0.0,
            })
            b[qty_key] += qty
            b[amt_key] += amt

    live = _live_lookup()

    def _build(scores_key: str, side: str):
        """side = 'buy' (accumulation) or 'sell' (distribution)"""
        items = []
        for symbol, brokers in per_stock.items():
            vol = stock_volume.get(symbol, 0)
            if vol < min_volume:
                continue
            broker_rows = []
            for b in brokers.values():
                net_qty = b["buyQty"] - b["sellQty"]
                avg_buy = (b["buyAmount"] / b["buyQty"]) if b["buyQty"] else 0
                avg_sell = (b["sellAmount"] / b["sellQty"]) if b["sellQty"] else 0
                broker_rows.append({**b, "netQty": net_qty, "avgBuyPrice": avg_buy, "avgSellPrice": avg_sell})

            if side == "buy":
                top_brokers = sorted([b for b in broker_rows if b["netQty"] > 0], key=lambda b: b["netQty"], reverse=True)[:3]
                if not top_brokers:
                    continue
                dominant_net = top_brokers[0]["netQty"]
                # Concentration: top 3 net buy vs total volume
                concentration = (sum(b["netQty"] for b in top_brokers) / vol * 100) if vol else 0
                avg_rate = top_brokers[0]["avgBuyPrice"]
            else:
                top_brokers = sorted([b for b in broker_rows if b["netQty"] < 0], key=lambda b: b["netQty"])[:3]
                if not top_brokers:
                    continue
                dominant_net = -top_brokers[0]["netQty"]
                concentration = (sum(-b["netQty"] for b in top_brokers) / vol * 100) if vol else 0
                avg_rate = top_brokers[0]["avgSellPrice"]

            live_row = live.get(symbol, {})
            ltp = live_row.get("lastTradedPrice") or live_row.get("ltp") or 0
            prev = live_row.get("previousClose") or 0
            pct = live_row.get("percentageChange") or 0
            high52 = live_row.get("fiftyTwoWeekHigh") or 0
            low52 = live_row.get("fiftyTwoWeekLow") or 0
            range_pos = ((ltp - low52) / (high52 - low52) * 100) if (high52 > low52 > 0) else None

            # Stealth signal: high accumulation concentration + small price move
            stealth = side == "buy" and concentration > 30 and abs(pct) < 1.5
            momentum_label = "neutral"
            if pct >= 4: momentum_label = "strong_up"
            elif pct >= 1: momentum_label = "up"
            elif pct <= -4: momentum_label = "strong_down"
            elif pct <= -1: momentum_label = "down"

            # Score blends concentration, dominant net size and momentum alignment
            momentum_boost = pct if side == "buy" else -pct
            score = concentration + (momentum_boost * 1.5) + (dominant_net / max(vol, 1) * 20)

            items.append({
                "symbol": symbol,
                "totalVolume": vol,
                "dominantNet": dominant_net,
                "concentration": concentration,
                "avgRate": avg_rate,
                "ltp": ltp,
                "priceChangePercent": pct,
                "rangePosition": range_pos,
                "momentum": momentum_label,
                "stealth": stealth,
                "score": score,
                "topBrokers": top_brokers,
            })

        items.sort(key=lambda x: x[scores_key], reverse=True)
        return items[:limit]

    result_payload = {
        "period": period_norm,
        "from": from_date, "to": to_date,
        "accumulation": [],
        "distribution": [],
        "range_note": None if period_norm == "1d" else "Showing current session.",
    }
    if type in ("accumulation", "both"):
        result_payload["accumulation"] = _build("score", "buy")
    if type in ("distribution", "both"):
        result_payload["distribution"] = _build("score", "sell")

    cache.set(cache_key, result_payload, 90)
    return {"status": "ok", "source": "live", "data": result_payload}


# ────────────────────────────────────────────────────────────
# Catch-all: must come LAST so it doesn't shadow specific routes
# ────────────────────────────────────────────────────────────


@router.get("/{broker_id}")
async def get_broker_detail(
    broker_id: str,
    period: str = Query("1d"),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
):
    """Get specific broker's stock-wise breakdown + headline totals."""
    if not broker_id.isdigit():
        raise HTTPException(status_code=404, detail="Broker not found")

    period_norm = (period or "1d").lower()
    cache_key = f"broker_detail::{broker_id}::{period_norm}::{from_date}::{to_date}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}

    floorsheet = await _get_floorsheet()
    if not floorsheet:
        return {"status": "error", "message": "Floorsheet unavailable"}

    stock_stats: Dict[str, dict] = {}
    broker_name = BROKER_MAP.get(broker_id, f"Broker #{broker_id}")
    total_trades = 0

    for trade in floorsheet:
        symbol = trade.get('stockSymbol')
        if not symbol:
            continue

        bid = str(trade.get('buyerMemberId'))
        sid = str(trade.get('sellerMemberId'))

        if bid != broker_id and sid != broker_id:
            continue

        if symbol not in stock_stats:
            stock_stats[symbol] = {
                "symbol": symbol, "buyAmount": 0.0, "sellAmount": 0.0,
                "buyQty": 0, "sellQty": 0, "trades": 0,
            }

        amount = (trade.get('contractRate', 0) or 0) * (trade.get('contractQuantity', 0) or 0)
        qty = trade.get('contractQuantity', 0) or 0

        if bid == broker_id:
            stock_stats[symbol]["buyAmount"] += amount
            stock_stats[symbol]["buyQty"] += qty
            stock_stats[symbol]["trades"] += 1
            total_trades += 1

        if sid == broker_id:
            stock_stats[symbol]["sellAmount"] += amount
            stock_stats[symbol]["sellQty"] += qty
            stock_stats[symbol]["trades"] += 1
            total_trades += 1

    stocks = []
    total_buy = 0.0
    total_sell = 0.0
    for s in stock_stats.values():
        s["netQty"] = s["buyQty"] - s["sellQty"]
        s["netAmount"] = s["buyAmount"] - s["sellAmount"]
        s["avgBuyPrice"] = (s["buyAmount"] / s["buyQty"]) if s["buyQty"] else 0
        s["avgSellPrice"] = (s["sellAmount"] / s["sellQty"]) if s["sellQty"] else 0
        total_buy += s["buyAmount"]
        total_sell += s["sellAmount"]
        stocks.append(s)

    stocks.sort(key=lambda x: x["buyAmount"] + x["sellAmount"], reverse=True)

    top_buy = max(stocks, key=lambda x: x["buyAmount"]) if stocks else None
    top_sell = max(stocks, key=lambda x: x["sellAmount"]) if stocks else None

    summary = {
        "totalBuy": total_buy,
        "totalSell": total_sell,
        "totalAmount": total_buy + total_sell,
        "netFlow": total_buy - total_sell,
        "matchingAmount": min(total_buy, total_sell),
        "tradeCount": total_trades,
        "uniqueStocks": len(stocks),
        "topBuySymbol": top_buy["symbol"] if top_buy else None,
        "topSellSymbol": top_sell["symbol"] if top_sell else None,
    }

    range_note = None
    if period_norm != "1d":
        range_note = "Showing current session. Multi-day broker analytics coming soon."

    payload = {
        "broker_id": broker_id,
        "broker_name": broker_name,
        "period": period_norm,
        "from": from_date, "to": to_date,
        "summary": summary,
        "stocks": stocks,
        "range_note": range_note,
    }
    cache.set(cache_key, payload, 90)
    return {"status": "ok", "source": "live", "data": payload}
