import difflib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func as sqlfunc

from app.models import CorrectionExample, StyleUpdateLog


class CorrectionTracker:
    STYLE_UPDATE_THRESHOLD = 20

    async def save_correction(
        self,
        db: AsyncSession,
        post_id: int | None,
        before_text: str,
        ai_output: str,
        user_final: str,
        category: str = "",
    ) -> dict:
        # 코드로 diff 생성 (GPT 호출 0회)
        diff_text = self._compute_diff(ai_output, user_final)
        is_unchanged = ai_output.strip() == user_final.strip()

        correction = CorrectionExample(
            post_id=post_id,
            before_text=before_text,
            ai_output=ai_output,
            user_final=user_final,
            diff_text=diff_text if not is_unchanged else "",
            approved=1,
            category=category,
        )
        db.add(correction)
        await db.commit()
        await db.refresh(correction)

        should_update = await self._check_update_needed(db)

        return {
            "id": correction.id,
            "has_changes": not is_unchanged,
            "style_update_needed": should_update,
        }

    def _compute_diff(self, ai_text: str, user_text: str) -> str:
        """문자열 diff를 계산하여 저장. GPT 없이 코드로 처리."""
        ai_lines = ai_text.strip().splitlines()
        user_lines = user_text.strip().splitlines()

        diff = difflib.unified_diff(
            ai_lines, user_lines,
            fromfile="ai", tofile="user",
            lineterm="",
        )
        return "\n".join(diff)

    async def _check_update_needed(self, db: AsyncSession) -> bool:
        """승인된 교정이 임계값 이상 쌓였는지 확인"""
        last_log = await db.execute(
            select(StyleUpdateLog).order_by(StyleUpdateLog.id.desc()).limit(1)
        )
        last = last_log.scalar_one_or_none()
        last_id = last.id if last else 0

        count_result = await db.execute(
            select(sqlfunc.count(CorrectionExample.id)).where(
                CorrectionExample.approved == 1,
                CorrectionExample.id > last_id,
            )
        )
        new_count = count_result.scalar() or 0
        return new_count >= self.STYLE_UPDATE_THRESHOLD
