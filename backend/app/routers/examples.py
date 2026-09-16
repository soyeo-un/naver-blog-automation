from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import SentenceExample, ParagraphExample, CorrectionExample
from app.services.example_extractor import ExampleExtractor
from app.services.example_searcher import ExampleSearcher
from app.services.blog_crawler import BlogCrawler
from app.services.style_updater import StyleUpdater

router = APIRouter(prefix="/api/examples", tags=["examples"])
extractor = ExampleExtractor()
searcher = ExampleSearcher()
updater = StyleUpdater()


class ExtractFromTextRequest(BaseModel):
    text: str
    category: str
    post_id: int | None = None


class ExtractFromURLRequest(BaseModel):
    blog_url: str
    category: str
    max_posts: int = 10


class SearchRequest(BaseModel):
    draft: str
    category: str


@router.post("/extract-text")
async def extract_from_text(data: ExtractFromTextRequest, db: AsyncSession = Depends(get_db)):
    result = await extractor.extract_from_post(
        data.text, data.category, data.post_id, db
    )
    return result


@router.post("/extract-url")
async def extract_from_url(data: ExtractFromURLRequest, db: AsyncSession = Depends(get_db)):
    posts = await BlogCrawler.fetch_blog_posts(data.blog_url, data.max_posts)
    if not posts:
        raise HTTPException(400, "블로그 글을 가져올 수 없습니다")

    total_sentences = 0
    total_paragraphs = 0
    for post_text in posts:
        result = await extractor.extract_from_post(post_text, data.category, None, db)
        total_sentences += result["sentences"]
        total_paragraphs += result["paragraphs"]

    return {
        "posts_processed": len(posts),
        "sentences_extracted": total_sentences,
        "paragraphs_extracted": total_paragraphs,
    }


@router.post("/search")
async def search_examples(data: SearchRequest, db: AsyncSession = Depends(get_db)):
    results = await searcher.search_relevant(data.draft, data.category, db)
    return results


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    stats = await searcher.get_stats(db)
    return stats


@router.post("/update-style")
async def update_style(db: AsyncSession = Depends(get_db)):
    result = await updater.update_style(db)
    return result


@router.get("/corrections")
async def list_corrections(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CorrectionExample)
        .order_by(CorrectionExample.id.desc())
        .limit(limit)
    )
    corrections = result.scalars().all()
    return [
        {
            "id": c.id,
            "post_id": c.post_id,
            "has_diff": bool(c.diff_text),
            "approved": bool(c.approved),
            "category": c.category or "",
            "created_at": str(c.created_at),
        }
        for c in corrections
    ]
