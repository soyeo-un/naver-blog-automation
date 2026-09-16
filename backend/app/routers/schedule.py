from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import Schedule

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


class ScheduleCreate(BaseModel):
    title: str
    start_date: str
    end_date: Optional[str] = None
    memo: Optional[str] = None
    notify: bool = False


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    memo: Optional[str] = None
    notify: Optional[bool] = None


@router.get("/")
async def list_schedules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).order_by(Schedule.start_date.desc()))
    return [
        {
            "id": s.id,
            "title": s.title,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "memo": s.memo,
            "notify": bool(s.notify),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in result.scalars().all()
    ]


@router.post("/")
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    end_dt = datetime.fromisoformat(data.end_date) if data.end_date else None
    item = Schedule(
        title=data.title,
        start_date=datetime.fromisoformat(data.start_date),
        end_date=end_dt,
        memo=data.memo or None,
        notify=1 if data.notify else 0,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {
        "id": item.id,
        "title": item.title,
        "start_date": item.start_date.isoformat(),
        "end_date": item.end_date.isoformat() if item.end_date else None,
        "memo": item.memo,
        "notify": bool(item.notify),
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.patch("/{schedule_id}")
async def update_schedule(schedule_id: int, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "일정을 찾을 수 없습니다")
    if data.title is not None:
        item.title = data.title
    if data.start_date is not None:
        item.start_date = datetime.fromisoformat(data.start_date)
    if data.end_date is not None:
        item.end_date = datetime.fromisoformat(data.end_date)
    if data.memo is not None:
        item.memo = data.memo
    if data.notify is not None:
        item.notify = 1 if data.notify else 0
    await db.commit()
    await db.refresh(item)
    return {
        "id": item.id,
        "title": item.title,
        "start_date": item.start_date.isoformat(),
        "end_date": item.end_date.isoformat() if item.end_date else None,
        "memo": item.memo,
        "notify": bool(item.notify),
    }


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Schedule).where(Schedule.id == schedule_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "일정을 찾을 수 없습니다")
    await db.delete(item)
    await db.commit()
    return {"ok": True}
