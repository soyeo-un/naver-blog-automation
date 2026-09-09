from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import StyleProfile
from app.services.style_analyzer import StyleAnalyzer
from app.services.blog_crawler import BlogCrawler

router = APIRouter(prefix="/api/style", tags=["style"])
analyzer = StyleAnalyzer()


class StyleFromURL(BaseModel):
    blog_url: str
    name: str


class StyleFromText(BaseModel):
    sample_texts: list[str]
    name: str


@router.post("/analyze-url")
async def analyze_from_url(data: StyleFromURL, db: AsyncSession = Depends(get_db)):
    posts = await BlogCrawler.fetch_blog_posts(data.blog_url)
    if not posts:
        raise HTTPException(400, "블로그 글을 가져올 수 없습니다")
    style = await analyzer.analyze_style(posts)
    profile = StyleProfile(
        name=data.name, blog_url=data.blog_url,
        sample_texts="\n---\n".join(posts[:5]), analyzed_style=style,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"id": profile.id, "style": style}


@router.post("/analyze-text")
async def analyze_from_text(data: StyleFromText, db: AsyncSession = Depends(get_db)):
    style = await analyzer.analyze_style(data.sample_texts)
    profile = StyleProfile(
        name=data.name, sample_texts="\n---\n".join(data.sample_texts),
        analyzed_style=style,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"id": profile.id, "style": style}


@router.get("/profiles")
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StyleProfile).order_by(StyleProfile.created_at.desc()))
    return [
        {
            "id": p.id,
            "name": p.name,
            "blog_url": p.blog_url,
            "style_summary": p.analyzed_style,
            "is_active": bool(p.is_active),
            "created_at": str(p.created_at),
        }
        for p in result.scalars().all()
    ]


@router.patch("/profiles/{profile_id}")
async def toggle_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StyleProfile).where(StyleProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "프로필을 찾을 수 없습니다")
    profile.is_active = 0 if profile.is_active else 1
    await db.commit()
    return {"id": profile.id, "is_active": bool(profile.is_active)}


@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StyleProfile).where(StyleProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "프로필을 찾을 수 없습니다")
    await db.delete(profile)
    await db.commit()
    return {"ok": True}
