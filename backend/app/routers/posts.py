from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import Post, PostStatus
from app.schemas import PostCreate, PostUpdate, PostResponse, PostListResponse

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
    post = Post(**data.model_dump())
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


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, data: PostUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(post, key, value)
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
