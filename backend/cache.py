import time
from typing import Any, Optional
import logging

logger = logging.getLogger("cache")

class TTLCache:
    def __init__(self):
        self._store: dict[str, dict] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() > entry["expires_at"]:
            del self._store[key]
            logger.debug(f"Cache MISS (expired): {key}")
            return None
        logger.debug(f"Cache HIT: {key}")
        return entry["data"]

    def set(self, key: str, data: Any, ttl_seconds: int):
        self._store[key] = {
            "data": data,
            "expires_at": time.time() + ttl_seconds,
            "cached_at": time.time(),
        }
        logger.debug(f"Cache SET: {key} (TTL={ttl_seconds}s)")

    def invalidate(self, key: str):
        self._store.pop(key, None)

    def clear_all(self):
        self._store.clear()
        logger.info("Cache cleared")

    def stats(self) -> dict:
        now = time.time()
        active = {k: v for k, v in self._store.items() if v["expires_at"] > now}
        return {"total_keys": len(self._store), "active_keys": len(active)}

# Singleton
cache = TTLCache()
