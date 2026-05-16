from fastapi import APIRouter
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/indices", tags=["indices"])

@router.get("/nepse")
def get_nepse_index():
    cached = cache.get("nepse_index")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_nepse_index()
    if data:
        cache.set("nepse_index", data, 60)
    return {"status": "ok", "data": data or {}}

@router.get("/sub")
def get_sub_indices():
    cached = cache.get("nepse_sub_indices")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_nepse_sub_indices()
    if data:
        cache.set("nepse_sub_indices", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/all")
def get_all_indices():
    cached = cache.get("all_indices")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_indices()
    if data:
        cache.set("all_indices", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/sectors")
def get_sector_indices():
    cached = cache.get("sector_sub_indices")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_sector_sub_indices()
    if data:
        cache.set("sector_sub_indices", data, 300)
    return {"status": "ok", "data": data or []}
