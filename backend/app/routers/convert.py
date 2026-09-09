from fastapi import APIRouter
from pydantic import BaseModel
from app.services.naver_html import NaverHTMLConverter

router = APIRouter(prefix="/api/convert", tags=["convert"])


class ConvertRequest(BaseModel):
    html: str
    font: str = "나눔고딕"


@router.post("/naver-html")
async def convert_to_naver(data: ConvertRequest):
    converted = NaverHTMLConverter.convert(data.html, data.font)
    plain = NaverHTMLConverter.to_plain_text(data.html)
    return {"naver_html": converted, "plain_text": plain, "char_count": len(plain)}
