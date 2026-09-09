from fastapi import APIRouter
from pydantic import BaseModel

from app.services.text_cleaner import TextCleaner

router = APIRouter(prefix="/api/clean", tags=["clean"])


class CleanRequest(BaseModel):
    text: str
    is_html: bool = False


class CleanResponse(BaseModel):
    cleaned_text: str
    scan_result: dict


@router.post("/", response_model=CleanResponse)
async def clean_text(req: CleanRequest):
    scan_before = TextCleaner.scan(req.text)
    if req.is_html:
        cleaned = TextCleaner.clean_html(req.text)
    else:
        cleaned = TextCleaner.clean(req.text)
    return CleanResponse(cleaned_text=cleaned, scan_result=scan_before)


@router.post("/scan")
async def scan_text(req: CleanRequest):
    return TextCleaner.scan(req.text)
