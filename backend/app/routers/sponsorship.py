from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import Sponsorship

router = APIRouter(prefix="/api/sponsorship", tags=["sponsorship"])


class SponsorshipCreate(BaseModel):
    company_name: str
    blog_url: Optional[str] = None
    start_date: datetime
    deadline: datetime
    memo: Optional[str] = None


class SponsorshipUpdate(BaseModel):
    company_name: Optional[str] = None
    blog_url: Optional[str] = None
    start_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    memo: Optional[str] = None
    status: Optional[str] = None


@router.get("/")
async def list_sponsorships(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sponsorship).order_by(desc(Sponsorship.deadline)))
    items = result.scalars().all()
    return [
        {
            "id": s.id, "company_name": s.company_name, "blog_url": s.blog_url,
            "start_date": str(s.start_date), "deadline": str(s.deadline),
            "memo": s.memo, "status": s.status, "notified": s.notified,
            "created_at": str(s.created_at),
        }
        for s in items
    ]


@router.post("/")
async def create_sponsorship(data: SponsorshipCreate, db: AsyncSession = Depends(get_db)):
    item = Sponsorship(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "company_name": item.company_name, "deadline": str(item.deadline)}


@router.patch("/{item_id}")
async def update_sponsorship(item_id: int, data: SponsorshipUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sponsorship).where(Sponsorship.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "company_name": item.company_name, "status": item.status}


@router.delete("/{item_id}")
async def delete_sponsorship(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Sponsorship).where(Sponsorship.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    await db.delete(item)
    await db.commit()
    return {"detail": "deleted"}
