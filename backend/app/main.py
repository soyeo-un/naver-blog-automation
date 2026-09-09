from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import init_db, async_session
from app.models import Sponsorship
from app.config import settings
from app.services.kakao_notify import KakaoNotify
from app.routers import posts, clean, style, ai, places
from app.routers import seo, convert, upload, sponsorship

scheduler = AsyncIOScheduler()


async def check_sponsorship_deadlines():
    async with async_session() as db:
        three_days_later = datetime.now() + timedelta(days=3)
        today = datetime.now().replace(hour=0, minute=0, second=0)
        result = await db.execute(
            select(Sponsorship).where(
                Sponsorship.deadline.between(today, three_days_later),
                Sponsorship.notified == 0,
            )
        )
        items = result.scalars().all()
        for item in items:
            msg = f"[블로그 협찬 알림]\n업체: {item.company_name}\n마감: {item.deadline.strftime('%Y-%m-%d')}\n3일 남았습니다!"
            if settings.kakao_access_token:
                await KakaoNotify.send_to_me(msg, settings.kakao_access_token)
            item.notified = 1
        await db.commit()


scheduler.add_job(check_sponsorship_deadlines, "cron", hour=9, minute=0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Naver Blog Automation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router)
app.include_router(clean.router)
app.include_router(style.router)
app.include_router(ai.router)
app.include_router(places.router)
app.include_router(seo.router)
app.include_router(convert.router)
app.include_router(upload.router)
app.include_router(sponsorship.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Naver Blog Automation API"}


@app.get("/health")
async def health():
    return {"status": "ok"}
