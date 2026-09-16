import base64
import json
from pathlib import Path
from openai import AsyncOpenAI

from app.config import settings

UPLOAD_DIR = Path("data/uploads")
BATCH_SIZE = 10


def _encode_image(filepath: Path) -> str:
    """이미지를 base64로 인코딩"""
    data = filepath.read_bytes()
    return base64.b64encode(data).decode("utf-8")


def _get_media_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpeg"
    types = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}
    return types.get(ext, "image/jpeg")


class PhotoAnalyzer:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def analyze_photos(
        self, filenames: list[str], category: str = "", client_request: str = ""
    ) -> dict:
        """사진들을 batch로 분석하고 scene 그룹화까지 수행.
        50장 → 약 5 batch (10장씩) → GPT 호출 약 5회 + scene 그룹화 1회"""

        all_photos = []

        # batch 분석
        for batch_start in range(0, len(filenames), BATCH_SIZE):
            batch = filenames[batch_start:batch_start + BATCH_SIZE]
            batch_results = await self._analyze_batch(
                batch, batch_start, category
            )
            all_photos.extend(batch_results)

        # scene 그룹화 (코드 기반 - GPT 호출 없음)
        scenes = self._group_into_scenes(all_photos)

        return {
            "photos": all_photos,
            "scenes": scenes,
            "total_photos": len(all_photos),
            "total_scenes": len(scenes),
        }

    async def _analyze_batch(
        self, filenames: list[str], start_index: int, category: str
    ) -> list[dict]:
        """10장 이하의 사진을 한 번의 GPT 호출로 분석"""
        content_parts = [
            {
                "type": "text",
                "text": f"""다음 사진들을 순서대로 분석해주세요. 총 {len(filenames)}장입니다.

각 사진에 대해 JSON 배열로 반환하세요. 각 항목:
- order: 사진 번호 ({start_index + 1}부터 시작)
- scene_category: 장면 분류 (외관, 입구, 내부, 좌석, 인테리어, 메뉴판, 음식, 음료, 디저트, 서비스, 조리과정, 시설, 전망, 분위기, 기타)
- description: 사진에서 실제로 보이는 것만 1~2문장으로 객관적 서술
- important_points: 블로그 글에 활용할 수 있는 포인트 (실제 보이는 것만)

중요: 사진에서 확인할 수 없는 맛, 가격, 서비스 품질 등을 추측하지 마세요.
보이는 사실만 기술하세요.
카테고리: {category or '일반'}""",
            }
        ]

        for fname in filenames:
            filepath = UPLOAD_DIR / fname
            if not filepath.exists():
                continue
            b64 = _encode_image(filepath)
            media_type = _get_media_type(fname)
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{b64}",
                    "detail": "low",
                },
            })

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": content_parts},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=2000,
        )

        result = json.loads(response.choices[0].message.content)
        if isinstance(result, list):
            return result
        for key in result:
            if isinstance(result[key], list):
                return result[key]
        return []

    def _group_into_scenes(self, photos: list[dict]) -> list[dict]:
        """연속된 같은 카테고리의 사진을 scene으로 그룹화 (코드 기반, GPT 0회)"""
        if not photos:
            return []

        scenes = []
        current_scene = {
            "scene_id": 1,
            "category": photos[0].get("scene_category", "기타"),
            "photo_orders": [photos[0].get("order", 1)],
            "descriptions": [photos[0].get("description", "")],
            "important_points": [],
        }
        for pts in photos[0].get("important_points", []):
            if isinstance(pts, str):
                current_scene["important_points"].append(pts)

        for photo in photos[1:]:
            cat = photo.get("scene_category", "기타")

            # 같은 카테고리거나 유사한 카테고리면 같은 scene
            if self._is_same_scene(current_scene["category"], cat):
                current_scene["photo_orders"].append(photo.get("order", 0))
                current_scene["descriptions"].append(photo.get("description", ""))
                for pts in photo.get("important_points", []):
                    if isinstance(pts, str):
                        current_scene["important_points"].append(pts)
            else:
                # scene 요약 생성
                current_scene["summary"] = self._summarize_scene(current_scene)
                scenes.append(current_scene)
                current_scene = {
                    "scene_id": len(scenes) + 1,
                    "category": cat,
                    "photo_orders": [photo.get("order", 0)],
                    "descriptions": [photo.get("description", "")],
                    "important_points": [],
                }
                for pts in photo.get("important_points", []):
                    if isinstance(pts, str):
                        current_scene["important_points"].append(pts)

        # 마지막 scene
        current_scene["summary"] = self._summarize_scene(current_scene)
        scenes.append(current_scene)

        return scenes

    def _is_same_scene(self, prev_cat: str, curr_cat: str) -> bool:
        """유사 카테고리를 같은 scene으로 묶기"""
        same_groups = [
            {"외관", "입구"},
            {"내부", "좌석", "인테리어"},
            {"메뉴판"},
            {"음식", "조리과정"},
            {"음료", "디저트"},
            {"서비스"},
            {"시설", "전망"},
            {"분위기"},
        ]
        for group in same_groups:
            if prev_cat in group and curr_cat in group:
                return True
        return prev_cat == curr_cat

    def _summarize_scene(self, scene: dict) -> str:
        """scene의 descriptions를 하나의 요약으로 합침 (코드 기반)"""
        descs = [d for d in scene["descriptions"] if d]
        if not descs:
            return scene["category"]
        # 중복 제거 후 합치기
        unique = list(dict.fromkeys(descs))
        return " / ".join(unique[:3])
