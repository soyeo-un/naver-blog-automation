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

CATEGORIES = ["맛집", "여행", "숙소", "카페", "미용실", "피부관리", "일상", "기타"]


class StyleFromURL(BaseModel):
    blog_url: str
    category: str
    name: str = ""


class StyleFromText(BaseModel):
    sample_texts: list[str]
    category: str
    name: str = ""


@router.get("/categories")
async def list_categories():
    return CATEGORIES


MAX_SAMPLES = 15


def _accumulate_samples(existing_texts: str | None, new_samples: list[str]) -> list[str]:
    existing = existing_texts.split("\n---\n") if existing_texts else []
    combined = existing + new_samples
    return combined[-MAX_SAMPLES:]


@router.post("/analyze-url")
async def analyze_from_url(data: StyleFromURL, db: AsyncSession = Depends(get_db)):
    posts = await BlogCrawler.fetch_blog_posts(data.blog_url)
    if not posts:
        raise HTTPException(400, "블로그 글을 가져올 수 없습니다")

    result = await db.execute(
        select(StyleProfile).where(StyleProfile.category == data.category)
    )
    profile = result.scalar_one_or_none()

    all_samples = _accumulate_samples(
        profile.sample_texts if profile else None, posts[:5]
    )
    style = await analyzer.analyze_style(all_samples, data.category)

    if profile:
        profile.blog_url = data.blog_url
        profile.sample_texts = "\n---\n".join(all_samples)
        profile.analyzed_style = style
    else:
        profile = StyleProfile(
            name=data.category, category=data.category, blog_url=data.blog_url,
            sample_texts="\n---\n".join(all_samples), analyzed_style=style,
        )
        db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"id": profile.id, "style": style, "sample_count": len(all_samples)}


@router.post("/analyze-text")
async def analyze_from_text(data: StyleFromText, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StyleProfile).where(StyleProfile.category == data.category)
    )
    profile = result.scalar_one_or_none()

    all_samples = _accumulate_samples(
        profile.sample_texts if profile else None, data.sample_texts
    )
    style = await analyzer.analyze_style(all_samples, data.category)

    if profile:
        profile.sample_texts = "\n---\n".join(all_samples)
        profile.analyzed_style = style
    else:
        profile = StyleProfile(
            name=data.category, category=data.category,
            sample_texts="\n---\n".join(all_samples), analyzed_style=style,
        )
        db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return {"id": profile.id, "style": style, "sample_count": len(all_samples)}


@router.get("/profiles")
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StyleProfile).order_by(StyleProfile.created_at.desc()))
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category or "",
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
