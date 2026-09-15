from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.models import PostStatus


class PostCreate(BaseModel):
    title: str
    keywords: list[str]
    draft_text: str


class PostUpdate(BaseModel):
    title: Optional[str] = None
    keywords: Optional[list[str]] = None
    draft_text: Optional[str] = None
    enhanced_text: Optional[str] = None
    clean_html: Optional[str] = None
    status: Optional[PostStatus] = None
    scheduled_at: Optional[datetime] = None


class PostResponse(BaseModel):
    id: int
    title: str
    keywords: list[str] = Field(default_factory=list)
    draft_text: str = Field(validation_alias="draft_content")
    enhanced_text: Optional[str] = Field(None, validation_alias="ai_content")
    clean_html: Optional[str] = Field(None, validation_alias="final_html")
    status: PostStatus
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    seo_score: Optional[int] = None
    ai_detection_score: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("keywords", mode="before")
    @classmethod
    def split_keywords(cls, v):
        if isinstance(v, str):
            return [k.strip() for k in v.split(",") if k.strip()]
        return v

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    id: int
    title: str
    keywords: list[str] = Field(default_factory=list)
    status: PostStatus
    seo_score: Optional[int] = None
    ai_detection_score: Optional[int] = None
    scheduled_at: Optional[datetime] = None
    created_at: datetime

    @field_validator("keywords", mode="before")
    @classmethod
    def split_keywords(cls, v):
        if isinstance(v, str):
            return [k.strip() for k in v.split(",") if k.strip()]
        return v

    class Config:
        from_attributes = True
