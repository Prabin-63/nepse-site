from fastapi import APIRouter, HTTPException
from nepse_client import nepse_client
from cache import cache
from typing import Dict, List, Optional
import logging

router = APIRouter(prefix="/api/brokers", tags=["brokers"])
logger = logging.getLogger("brokers")

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

@router.get("/")
def get_all_brokers():
    """
    Get all brokers summary by aggregating the floorsheet.
    """
    # Try to get pre-aggregated stats from cache
    cached_stats = cache.get("broker_stats_summary")
    if cached_stats:
        return {"status": "ok", "source": "cache", "data": cached_stats}

    floorsheet = cache.get("floorsheet_full")
    if not floorsheet:
        floorsheet = nepse_client.get_floorsheet()
        if floorsheet:
            cache.set("floorsheet_full", floorsheet, 300)
    
    if not floorsheet:
        return {"status": "error", "message": "Floorsheet unavailable"}

    broker_stats = {}

    for trade in floorsheet:
        # Buy
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

        # Sell
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

    # Finalize top buy/sell for each broker and cleanup
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
    
    # Cache for 5 mins
    cache.set("broker_stats_summary", result, 300)

    return {"status": "ok", "source": "live", "data": result}

@router.get("/{broker_id}")
def get_broker_detail(broker_id: str):
    """
    Get specific broker's stock-wise breakdown.
    """
    floorsheet = cache.get("floorsheet_full")
    if not floorsheet:
        floorsheet = nepse_client.get_floorsheet()
        if floorsheet:
            cache.set("floorsheet_full", floorsheet, 300)
    
    if not floorsheet:
        return {"status": "error", "message": "Floorsheet unavailable"}

    stock_stats = {}
    broker_name = BROKER_MAP.get(broker_id, f"Broker #{broker_id}")

    for trade in floorsheet:
        symbol = trade.get('stockSymbol')
        if not symbol: continue

        bid = str(trade.get('buyerMemberId'))
        sid = str(trade.get('sellerMemberId'))

        if bid != broker_id and sid != broker_id:
            continue

        if symbol not in stock_stats:
            stock_stats[symbol] = {"symbol": symbol, "buyAmount": 0, "sellAmount": 0, "buyQty": 0, "sellQty": 0, "trades": 0}

        amount = trade.get('contractRate', 0) * trade.get('contractQuantity', 0)
        qty = trade.get('contractQuantity', 0)

        if bid == broker_id:
            stock_stats[symbol]["buyAmount"] += amount
            stock_stats[symbol]["buyQty"] += qty
            stock_stats[symbol]["trades"] += 1
        
        if sid == broker_id:
            stock_stats[symbol]["sellAmount"] += amount
            stock_stats[symbol]["sellQty"] += qty
            stock_stats[symbol]["trades"] += 1

    result = list(stock_stats.values())
    result.sort(key=lambda x: x["buyAmount"] + x["sellAmount"], reverse=True)

    return {
        "status": "ok",
        "data": {
            "broker_id": broker_id,
            "broker_name": broker_name,
            "stocks": result
        }
    }
