from fastapi import APIRouter
from pydantic import BaseModel
from app.services.seo_analyzer import SEOAnalyzer

router = APIRouter(prefix="/api/seo", tags=["seo"])


class SEORequest(BaseModel):
    title: str
    keywords: str
    content: str


@router.post("/analyze")
async def analyze_seo(data: SEORequest):
    return SEOAnalyzer.analyze(data.title, data.keywords, data.content)
