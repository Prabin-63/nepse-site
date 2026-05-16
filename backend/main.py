import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.market import router as market_router
from routes.stocks import router as stocks_router
from routes.floorsheet import router as floorsheet_router
from routes.indices import router as indices_router
from routes.summary import router as summary_router
from scheduler import start_scheduler

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("main")

scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    global scheduler
    logger.info("Starting NEPSE Elite Backend...")
    scheduler = start_scheduler()
    logger.info("Backend ready. Cache warming complete.")
    yield
    # SHUTDOWN
    if scheduler:
        scheduler.shutdown()
    logger.info("Backend shut down cleanly.")

app = FastAPI(
    title="NEPSE Elite API",
    description="Live NEPSE data backend powered by NepseUnofficialApi",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("CORS_ORIGIN", "http://localhost:5174"),
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Register all route groups
app.include_router(market_router)
app.include_router(stocks_router)
app.include_router(floorsheet_router)
app.include_router(indices_router)
app.include_router(summary_router)

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "NEPSE Elite API"}

@app.get("/")
def root():
    return {
        "service": "NEPSE Elite API",
        "docs": "/docs",
        "endpoints": [
            "GET /api/summary/dashboard",
            "GET /api/market/live",
            "GET /api/market/gainers",
            "GET /api/market/losers",
            "GET /api/market/turnover",
            "GET /api/market/volume",
            "GET /api/market/status",
            "GET /api/market/summary",
            "GET /api/indices/nepse",
            "GET /api/indices/sub",
            "GET /api/indices/all",
            "GET /api/indices/sectors",
            "GET /api/stocks/list",
            "GET /api/stocks/{symbol}/price",
            "GET /api/stocks/{symbol}/detail",
            "GET /api/stocks/{symbol}/chart/daily",
            "GET /api/stocks/{symbol}/chart",
            "GET /api/floorsheet/",
            "GET /api/floorsheet/{symbol}",
            "GET /api/summary/cache-stats",
        ]
    }
