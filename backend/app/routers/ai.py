from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Post, PostStatus, StyleProfile
from app.services.ai_writer import AIWriter
from app.services.correction_tracker import CorrectionTracker
from app.services.text_cleaner import TextCleaner

router = APIRouter(prefix="/api/ai", tags=["ai"])
writer = AIWriter()
tracker = CorrectionTracker()


class EnhanceRequest(BaseModel):
    post_id: int
    style_profile_id: int | None = None
    category: str | None = None


class TitleSuggestRequest(BaseModel):
    keywords: list[str]


class DetectionRequest(BaseModel):
    text: str


class ApproveRequest(BaseModel):
    post_id: int
    user_final: str
    category: str = ""


@router.post("/enhance")
async def enhance_post(data: EnhanceRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == data.post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")
    style_json = None
    sample_texts = None
    category = data.category or ""
    if data.category:
        sr = await db.execute(
            select(StyleProfile).where(
                StyleProfile.category == data.category, StyleProfile.is_active == 1
            )
        )
        profile = sr.scalar_one_or_none()
        if profile:
            style_json = profile.analyzed_style
            sample_texts = profile.sample_texts
    elif data.style_profile_id:
        sr = await db.execute(select(StyleProfile).where(StyleProfile.id == data.style_profile_id))
        profile = sr.scalar_one_or_none()
        if profile:
            style_json = profile.analyzed_style
            sample_texts = profile.sample_texts
    enhanced = await writer.enhance_draft(
        post.keywords,
        post.draft_content,
        category=category,
        style_profile=style_json,
        sample_texts=sample_texts,
        db=db,
    )
    post.ai_content = enhanced["enhanced"]
    post.status = PostStatus.REVIEWING
    await db.commit()
    return enhanced


@router.post("/approve")
async def approve_correction(data: ApproveRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == data.post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "Post not found")

    before_text = post.draft_content or ""
    ai_output = post.ai_content or ""

    post.final_content = TextCleaner.clean(data.user_final)
    post.status = PostStatus.SCHEDULED

    correction_result = await tracker.save_correction(
        db=db,
        post_id=data.post_id,
        before_text=before_text,
        ai_output=ai_output,
        user_final=data.user_final,
        category=data.category,
    )

    await db.commit()
    return {
        "ok": True,
        "correction": correction_result,
    }


@router.post("/suggest-titles")
async def suggest_titles(data: TitleSuggestRequest):
    if not data.keywords:
        raise HTTPException(400, "키워드를 입력해주세요")
    titles = await writer.suggest_titles(data.keywords)
    return {"titles": titles}


@router.post("/detect")
async def detect_ai(data: DetectionRequest):
    return await writer.check_ai_detection(data.text)
