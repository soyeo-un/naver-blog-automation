from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models import PlaceInfo
from app.services.place_searcher import PlaceSearcher

router = APIRouter(prefix="/api/places", tags=["places"])


class PlaceSearchRequest(BaseModel):
    query: str


class PlaceSaveRequest(BaseModel):
    post_id: int | None = None
    place_name: str
    address: str | None = None
    phone: str | None = None
    business_hours: str | None = None
    parking: str | None = None
    reservation: str | None = None
    restroom: str | None = None


@router.post("/search")
async def search_place(data: PlaceSearchRequest):
    return await PlaceSearcher.search_combined(data.query)


@router.post("/save")
async def save_place(data: PlaceSaveRequest, db: AsyncSession = Depends(get_db)):
    place = PlaceInfo(**data.model_dump())
    db.add(place)
    await db.commit()
    await db.refresh(place)
    return {"id": place.id, "place_name": place.place_name, "address": place.address}
