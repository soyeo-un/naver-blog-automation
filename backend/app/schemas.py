from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.models import PostStatus


class PostCreate(BaseModel):
    title: str
    keywords: str
    draft_content: str


class PostUpdate(BaseModel):
    title: Optional[str] = None
    keywords: Optional[str] = None
    draft_content: Optional[str] = None
    final_content: Optional[str] = None
    final_html: Optional[str] = None
    status: Optional[PostStatus] = None
    scheduled_at: Optional[datetime] = None


class PostResponse(BaseModel):
    id: int
    title: str
    keywords: str
    draft_content: str
    ai_content: Optional[str]
    final_content: Optional[str]
    final_html: Optional[str]
    status: PostStatus
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    seo_score: Optional[int]
    ai_detection_score: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    id: int
    title: str
    keywords: str
    status: PostStatus
    seo_score: Optional[int]
    ai_detection_score: Optional[int]
    scheduled_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
