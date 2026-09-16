import json
import uuid
import io
from pathlib import Path
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from PIL import Image
import httpx

from app.database import get_db
from app.models import PhotoPost, PhotoItem, CorrectionExample
from app.services.photo_analyzer import PhotoAnalyzer
from app.services.draft_generator import DraftGenerator
from app.services.correction_tracker import CorrectionTracker

router = APIRouter(prefix="/api/photo-post", tags=["photo-post"])
analyzer = PhotoAnalyzer()
generator = DraftGenerator()
tracker = CorrectionTracker()

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_WIDTH = 1200


class UploadUrlsRequest(BaseModel):
    urls: list[str]
    category: str = ""
    client_request: str = ""
    keywords: str = ""


class AnalyzeRequest(BaseModel):
    photo_post_id: int
    category: str = ""
    client_request: str = ""


class GenerateRequest(BaseModel):
    photo_post_id: int
    keywords: str = ""


class ApproveRequest(BaseModel):
    photo_post_id: int
    user_final: str
    category: str = ""


@router.post("/upload")
async def upload_photos(
    files: list[UploadFile] = File(...),
    category: str = Form(""),
    client_request: str = Form(""),
    keywords: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """사진 다중 업로드 + PhotoPost 생성"""
    if len(files) > 50:
        raise HTTPException(400, "최대 50장까지 업로드 가능합니다")

    # PhotoPost 생성
    post = PhotoPost(
        category=category,
        keywords=keywords,
        client_request=client_request,
        status="uploading",
        photo_count=len(files),
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    # 사진 저장
    filenames = []
    for idx, file in enumerate(files):
        if not file.content_type or not file.content_type.startswith("image/"):
            continue

        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            continue

        img = Image.open(io.BytesIO(contents))
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_size = (MAX_WIDTH, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = UPLOAD_DIR / filename

        img_bytes = io.BytesIO()
        fmt = img.format or "JPEG"
        if fmt.upper() == "MPO":
            fmt = "JPEG"
        img.save(img_bytes, format=fmt, quality=85)
        filepath.write_bytes(img_bytes.getvalue())

        db.add(PhotoItem(
            photo_post_id=post.id,
            order_index=idx + 1,
            filename=filename,
        ))
        filenames.append(filename)

    post.status = "uploaded"
    post.photo_count = len(filenames)
    await db.commit()

    return {
        "photo_post_id": post.id,
        "uploaded": len(filenames),
    }


@router.post("/upload-urls")
async def upload_from_urls(data: UploadUrlsRequest, db: AsyncSession = Depends(get_db)):
    """이미지 URL 목록을 받아서 다운로드 후 PhotoPost 생성"""
    urls = data.urls[:50]
    if not urls:
        raise HTTPException(400, "URL이 없습니다")

    post = PhotoPost(
        category=data.category,
        keywords=data.keywords,
        client_request=data.client_request,
        status="uploading",
        photo_count=len(urls),
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)

    filenames = []
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        for idx, url in enumerate(urls):
            try:
                resp = await client.get(url, headers={
                    "Referer": "https://blog.naver.com/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                })
                if resp.status_code != 200:
                    continue
                ct = resp.headers.get("content-type", "")
                if not ct.startswith("image/"):
                    continue

                img = Image.open(io.BytesIO(resp.content))
                if img.width > MAX_WIDTH:
                    ratio = MAX_WIDTH / img.width
                    img = img.resize((MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)

                parsed = urlparse(url)
                ext = parsed.path.rsplit(".", 1)[-1] if "." in parsed.path else "jpg"
                if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
                    ext = "jpg"
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = UPLOAD_DIR / filename

                img_bytes = io.BytesIO()
                fmt = img.format or "JPEG"
                if fmt.upper() == "MPO":
                    fmt = "JPEG"
                img.save(img_bytes, format=fmt, quality=85)
                filepath.write_bytes(img_bytes.getvalue())

                db.add(PhotoItem(
                    photo_post_id=post.id,
                    order_index=idx + 1,
                    filename=filename,
                ))
                filenames.append(filename)
            except Exception:
                continue

    if not filenames:
        await db.delete(post)
        await db.commit()
        raise HTTPException(400, "이미지를 다운로드할 수 없습니다")

    post.status = "uploaded"
    post.photo_count = len(filenames)
    await db.commit()

    return {
        "photo_post_id": post.id,
        "uploaded": len(filenames),
    }


@router.post("/analyze")
async def analyze_photos(data: AnalyzeRequest, db: AsyncSession = Depends(get_db)):
    """업로드된 사진 batch 분석 + scene 그룹화"""
    result = await db.execute(
        select(PhotoPost).where(PhotoPost.id == data.photo_post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "PhotoPost not found")

    # 사진 목록 조회
    items_result = await db.execute(
        select(PhotoItem)
        .where(PhotoItem.photo_post_id == post.id)
        .order_by(PhotoItem.order_index)
    )
    items = items_result.scalars().all()
    if not items:
        raise HTTPException(400, "업로드된 사진이 없습니다")

    filenames = [item.filename for item in items]
    category = data.category or post.category or ""
    client_request = data.client_request or post.client_request or ""

    if data.category:
        post.category = data.category
    if data.client_request:
        post.client_request = data.client_request

    # batch 분석
    summary = await analyzer.analyze_photos(filenames, category, client_request)

    # 개별 사진에 scene 정보 업데이트
    photos_data = summary.get("photos", [])
    for photo_data in photos_data:
        order = photo_data.get("order", 0)
        for item in items:
            if item.order_index == order:
                item.description = photo_data.get("description", "")
                item.scene_category = photo_data.get("scene_category", "")
                break

    # scene 기반으로 scene_id 할당
    for scene in summary.get("scenes", []):
        for order in scene.get("photo_orders", []):
            for item in items:
                if item.order_index == order:
                    item.scene_id = scene.get("scene_id")
                    break

    post.photo_summary_json = json.dumps(summary, ensure_ascii=False)
    post.status = "analyzed"
    await db.commit()

    return {
        "photo_post_id": post.id,
        "total_photos": summary["total_photos"],
        "total_scenes": summary["total_scenes"],
        "scenes": [
            {
                "scene_id": s["scene_id"],
                "category": s["category"],
                "summary": s.get("summary", ""),
                "photo_count": len(s.get("photo_orders", [])),
            }
            for s in summary.get("scenes", [])
        ],
    }


@router.post("/generate")
async def generate_draft(data: GenerateRequest, db: AsyncSession = Depends(get_db)):
    """photo_summary + style로 블로그 초안 생성 (GPT 1회)"""
    result = await db.execute(
        select(PhotoPost).where(PhotoPost.id == data.photo_post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "PhotoPost not found")

    if not post.photo_summary_json:
        raise HTTPException(400, "사진 분석을 먼저 실행해주세요")

    photo_summary = json.loads(post.photo_summary_json)
    keywords = data.keywords or post.keywords or ""
    if data.keywords:
        post.keywords = data.keywords

    draft = await generator.generate_draft(
        photo_summary=photo_summary,
        client_request=post.client_request or "",
        keywords=keywords,
        category=post.category or "",
        db=db,
    )

    post.title = draft["title"]
    post.draft_content = draft["body"]
    post.status = "draft_ready"
    await db.commit()

    return {
        "photo_post_id": post.id,
        "title": draft["title"],
        "body": draft["body"],
    }


@router.post("/approve")
async def approve_draft(data: ApproveRequest, db: AsyncSession = Depends(get_db)):
    """사용자 최종 수정본 저장 + approved correction으로 등록"""
    result = await db.execute(
        select(PhotoPost).where(PhotoPost.id == data.photo_post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "PhotoPost not found")

    category = data.category or post.category or ""

    correction_result = await tracker.save_correction(
        db=db,
        post_id=None,
        before_text="",
        ai_output=post.draft_content or "",
        user_final=data.user_final,
        category=category,
    )

    post.user_final = data.user_final
    post.status = "approved"
    await db.commit()

    return {
        "ok": True,
        "correction": correction_result,
    }


@router.get("/{photo_post_id}")
async def get_photo_post(photo_post_id: int, db: AsyncSession = Depends(get_db)):
    """PhotoPost 상세 조회"""
    result = await db.execute(
        select(PhotoPost).where(PhotoPost.id == photo_post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(404, "PhotoPost not found")

    items_result = await db.execute(
        select(PhotoItem)
        .where(PhotoItem.photo_post_id == post.id)
        .order_by(PhotoItem.order_index)
    )
    items = items_result.scalars().all()

    scenes = []
    if post.photo_summary_json:
        summary = json.loads(post.photo_summary_json)
        scenes = [
            {
                "scene_id": s["scene_id"],
                "category": s["category"],
                "summary": s.get("summary", ""),
                "photo_count": len(s.get("photo_orders", [])),
            }
            for s in summary.get("scenes", [])
        ]

    return {
        "id": post.id,
        "title": post.title,
        "keywords": post.keywords,
        "category": post.category,
        "client_request": post.client_request,
        "status": post.status,
        "photo_count": post.photo_count,
        "draft_content": post.draft_content,
        "user_final": post.user_final,
        "scenes": scenes,
        "photos": [
            {
                "id": item.id,
                "order": item.order_index,
                "filename": item.filename,
                "url": f"/api/upload/files/{item.filename}",
                "description": item.description or "",
                "scene_id": item.scene_id,
                "scene_category": item.scene_category or "",
            }
            for item in items
        ],
        "created_at": str(post.created_at),
    }


@router.get("/")
async def list_photo_posts(db: AsyncSession = Depends(get_db)):
    """PhotoPost 목록"""
    result = await db.execute(
        select(PhotoPost).order_by(PhotoPost.id.desc()).limit(20)
    )
    posts = result.scalars().all()
    return [
        {
            "id": p.id,
            "title": p.title or "",
            "category": p.category or "",
            "status": p.status,
            "photo_count": p.photo_count,
            "created_at": str(p.created_at),
        }
        for p in posts
    ]
