from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Post, PostStatus, StyleProfile
from app.services.ai_writer import AIWriter

router = APIRouter(prefix="/api/ai", tags=["ai"])
writer = AIWriter()


class EnhanceRequest(BaseModel):
    post_id: int
    style_profile_id: int | None = None


class DetectionRequest(BaseModel):
    text: str


@router.post("/enhance")
async def enhance_post(data: EnhanceRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == data.post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")
    style_json = None
    if data.style_profile_id:
        sr = await db.execute(select(StyleProfile).where(StyleProfile.id == data.style_profile_id))
        profile = sr.scalar_one_or_none()
        if profile:
            style_json = profile.analyzed_style
    enhanced = await writer.enhance_draft(post.keywords, post.draft_content, style_json)
    post.ai_content = enhanced["enhanced"]
    post.status = PostStatus.REVIEWING
    await db.commit()
    return enhanced


@router.post("/detect")
async def detect_ai(data: DetectionRequest):
    return await writer.check_ai_detection(data.text)
