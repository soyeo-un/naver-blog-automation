from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
import enum

from app.database import Base


class PostStatus(str, enum.Enum):
    DRAFT = "draft"
    AI_PROCESSING = "ai_processing"
    REVIEWING = "reviewing"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    keywords = Column(String(500), nullable=False)
    draft_content = Column(Text, nullable=False)
    ai_content = Column(Text, nullable=True)
    final_content = Column(Text, nullable=True)
    final_html = Column(Text, nullable=True)
    status = Column(SQLEnum(PostStatus), default=PostStatus.DRAFT)
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    seo_score = Column(Integer, nullable=True)
    ai_detection_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StyleProfile(Base):
    __tablename__ = "style_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=True)
    blog_url = Column(String(500), nullable=True)
    sample_texts = Column(Text, nullable=True)
    analyzed_style = Column(Text, nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())


class PlaceInfo(Base):
    __tablename__ = "place_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, nullable=True)
    place_name = Column(String(300), nullable=False)
    address = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    business_hours = Column(Text, nullable=True)
    parking = Column(String(100), nullable=True)
    reservation = Column(String(100), nullable=True)
    restroom = Column(String(100), nullable=True)
    menu_info = Column(Text, nullable=True)
    facilities = Column(Text, nullable=True)
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Sponsorship(Base):
    __tablename__ = "sponsorships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(300), nullable=False)
    blog_url = Column(String(500), nullable=True)
    start_date = Column(DateTime, nullable=False)
    deadline = Column(DateTime, nullable=False)
    memo = Column(Text, nullable=True)
    status = Column(String(50), default="pending")
    notified = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
