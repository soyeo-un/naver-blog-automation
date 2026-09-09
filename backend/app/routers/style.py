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
    result = await db.execute(select(StyleProfile).where(StyleProfile.is_active == 1))
    return [{"id": p.id, "name": p.name, "blog_url": p.blog_url, "analyzed_style": p.analyzed_style, "created_at": str(p.created_at)} for p in result.scalars().all()]
