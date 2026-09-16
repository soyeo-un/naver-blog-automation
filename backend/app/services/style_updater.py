import json
from pathlib import Path
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import CorrectionExample, StyleUpdateLog

STYLE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "style.json"


class StyleUpdater:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def update_style(self, db: AsyncSession) -> dict:
        current_style = {}
        if STYLE_PATH.exists():
            current_style = json.loads(STYLE_PATH.read_text(encoding="utf-8"))

        last_log = await db.execute(
            select(StyleUpdateLog).order_by(StyleUpdateLog.id.desc()).limit(1)
        )
        last = last_log.scalar_one_or_none()
        last_id = last.id if last else 0

        result = await db.execute(
            select(CorrectionExample).where(
                CorrectionExample.approved == 1,
                CorrectionExample.id > last_id,
            ).order_by(CorrectionExample.id.desc()).limit(30)
        )
        corrections = result.scalars().all()

        if not corrections:
            return {"updated": False, "reason": "새로운 교정 데이터 없음"}

        correction_summary = []
        for c in corrections:
            correction_summary.append({
                "change_type": c.change_type or "",
                "reason": c.reason or "",
                "ai_sample": c.ai_output[:200] if c.ai_output else "",
                "user_sample": c.user_final[:200] if c.user_final else "",
            })

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """블로그 글쓰기 스타일 분석 전문가입니다.
사용자가 AI 결과를 어떻게 수정했는지 패턴을 분석하여 기존 style.json을 업데이트합니다.

규칙:
1. 기존 style.json 구조를 유지하세요
2. 교정 패턴에서 발견된 새로운 규칙만 추가/수정하세요
3. 사용자가 자주 하는 수정 방향을 반영하세요
4. 특정 표현을 무조건 금지하지 마세요 - 조건부 규칙으로 저장하세요
5. 강한 표현(인생 맛집, 무조건 추천 등)도 사용자가 실제로 쓴다면 avoid에 넣지 마세요

JSON으로 업데이트된 전체 style.json을 반환하세요.""",
                },
                {
                    "role": "user",
                    "content": f"""현재 style.json:
{json.dumps(current_style, ensure_ascii=False, indent=2)}

최근 사용자 교정 패턴 ({len(corrections)}건):
{json.dumps(correction_summary, ensure_ascii=False, indent=2)}

이 교정 패턴을 반영하여 style.json을 업데이트해주세요.""",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        updated_style = json.loads(response.choices[0].message.content)
        STYLE_PATH.write_text(
            json.dumps(updated_style, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        log = StyleUpdateLog(
            corrections_used=len(corrections),
            summary=f"교정 {len(corrections)}건 기반 스타일 업데이트",
        )
        db.add(log)
        await db.commit()

        return {
            "updated": True,
            "corrections_used": len(corrections),
        }
