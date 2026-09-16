from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import Post, PostStatus
from app.schemas import PostCreate, PostUpdate, PostResponse, PostListResponse
from app.services.text_cleaner import TextCleaner

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("/", response_model=list[PostListResponse])
async def list_posts(
    status: PostStatus | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Post).order_by(desc(Post.created_at))
    if status:
        query = query.where(Post.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=PostResponse, status_code=201)
async def create_post(data: PostCreate, db: AsyncSession = Depends(get_db)):
    post = Post(
        title=data.title,
        keywords=",".join(data.keywords),
        draft_content=TextCleaner.clean(data.draft_text),
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


FIELD_MAP = {
    "draft_text": "draft_content",
    "enhanced_text": "ai_content",
    "clean_html": "final_html",
}


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, data: PostUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # 텍스트 필드에서 히든 유니코드 제거
    TEXT_FIELDS = {"draft_content", "ai_content", "final_content", "final_html"}
    for key, value in data.model_dump(exclude_unset=True).items():
        db_field = FIELD_MAP.get(key, key)
        if db_field == "keywords" and isinstance(value, list):
            value = ",".join(value)
        if db_field in TEXT_FIELDS and isinstance(value, str):
            value = TextCleaner.clean_html(value) if "<" in value else TextCleaner.clean(value)
        setattr(post, db_field, value)
    await db.commit()
    await db.refresh(post)
    return post


@router.delete("/{post_id}")
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.delete(post)
    await db.commit()
    return {"detail": "deleted"}
