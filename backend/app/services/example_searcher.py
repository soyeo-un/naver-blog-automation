import json
import re
from sqlalchemy import select, or_, func as sqlfunc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SentenceExample, ParagraphExample, CorrectionExample


# ExampleExtractor와 동일한 불용어
_STOPWORDS = {
    "그리고", "그래서", "근데", "하지만", "그런데", "그냥", "좀", "진짜",
    "되게", "약간", "이건", "저는", "거의", "정도", "이렇게", "그렇게",
    "하는", "있는", "없는", "같은", "이런", "저런", "되는", "했는",
    "있었", "없었", "했어요", "했습니다", "인데요", "거든요", "더라고요",
    "같아요", "것", "수", "때", "중", "후", "전", "곳", "편",
}


def _extract_keywords_from_text(text: str) -> list[str]:
    """텍스트에서 키워드 추출 (코드 기반, GPT 호출 없음)"""
    words = re.findall(r'[가-힣]{2,}', text)
    freq: dict[str, int] = {}
    for w in words:
        if w not in _STOPWORDS:
            freq[w] = freq.get(w, 0) + 1
    # 빈도순 정렬 후 상위 15개
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [w for w, _ in sorted_words[:15]]


def _score_sentence(
    candidate: SentenceExample,
    keywords: list[str],
    category: str,
    roles: list[str],
) -> float:
    """문장 예시의 관련도 점수 계산"""
    score = 0.0

    # 카테고리 일치
    if candidate.category and candidate.category == category:
        score += 2.0

    # 키워드 매칭 (문장 텍스트 + 저장된 키워드)
    text_lower = candidate.sentence.lower()
    cand_keywords = (candidate.keywords or "").lower()
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower in text_lower:
            score += 1.5
        elif kw_lower in cand_keywords:
            score += 1.0

    # 역할 매칭
    if candidate.role and candidate.role in roles:
        score += 1.0

    # 문맥이 있는 문장 우선 (앞뒤 문장이 있으면 더 유용)
    if candidate.previous_sentence:
        score += 0.3
    if candidate.next_sentence:
        score += 0.3

    return score


def _score_paragraph(
    candidate: ParagraphExample,
    keywords: list[str],
    category: str,
) -> float:
    """문단 예시의 관련도 점수 계산"""
    score = 0.0

    if candidate.category and candidate.category == category:
        score += 2.0

    # 문단 내 문장들에서 키워드 매칭
    sentences_text = candidate.sentences_json.lower()
    for kw in keywords:
        if kw.lower() in sentences_text:
            score += 1.0

    # topic 매칭
    topic_lower = (candidate.topic or "").lower()
    for kw in keywords:
        if kw.lower() in topic_lower:
            score += 1.5

    return score


def _infer_roles_from_text(text: str) -> list[str]:
    """초안 텍스트에서 필요한 문장 역할을 추론"""
    roles = set()
    lower = text.lower()

    positive_kws = ["좋", "맛있", "편하", "만족", "추천", "최고"]
    negative_kws = ["아쉬", "단점", "별로", "불편", "실망"]
    tip_kws = ["팁", "참고", "주차", "예약", "가격", "메뉴"]
    experience_kws = ["갔", "먹었", "했는데", "봤는데", "시켰", "주문"]

    if any(kw in lower for kw in positive_kws):
        roles.add("긍정_평가")
    if any(kw in lower for kw in negative_kws):
        roles.add("부정_아쉬움")
    if any(kw in lower for kw in tip_kws):
        roles.add("팁_정보")
    if any(kw in lower for kw in experience_kws):
        roles.add("경험_서술")

    if not roles:
        roles = {"긍정_평가", "경험_서술"}

    return list(roles)


class ExampleSearcher:
    """GPT 호출 없이 코드로 관련 예시를 검색.
    나중에 embedding/pgvector로 교체 가능하도록 인터페이스 분리."""

    async def search_relevant(
        self, draft: str, category: str, db: AsyncSession
    ) -> dict:
        # 코드로 키워드/역할 추출 (GPT 0회)
        keywords = _extract_keywords_from_text(draft)
        roles = _infer_roles_from_text(draft)

        sentences = await self._search_sentences(db, category, keywords, roles)
        paragraphs = await self._search_paragraphs(db, category, keywords)
        corrections = await self._search_corrections(db, category)

        return {
            "sentence_examples": sentences,
            "paragraph_examples": paragraphs,
            "correction_examples": corrections,
        }

    async def _search_sentences(
        self,
        db: AsyncSession,
        category: str,
        keywords: list[str],
        roles: list[str],
    ) -> list[dict]:
        # 같은 카테고리 우선, 없으면 전체에서
        query = select(SentenceExample)
        if category:
            query = query.where(SentenceExample.category == category)
        query = query.order_by(SentenceExample.id.desc()).limit(200)

        result = await db.execute(query)
        candidates = result.scalars().all()

        # 카테고리 매칭이 부족하면 전체에서 추가
        if len(candidates) < 20:
            fallback = await db.execute(
                select(SentenceExample)
                .order_by(SentenceExample.id.desc())
                .limit(100)
            )
            existing_ids = {c.id for c in candidates}
            for c in fallback.scalars().all():
                if c.id not in existing_ids:
                    candidates.append(c)

        if not candidates:
            return []

        # 점수 매기기
        scored = [
            (_score_sentence(c, keywords, category, roles), c)
            for c in candidates
        ]
        scored.sort(key=lambda x: x[0], reverse=True)

        # 상위 8개 선택, 문맥(앞뒤 문장) 포함
        top = scored[:8]

        return [
            {
                "sentence": s.sentence,
                "role": s.role or "",
                "previous": s.previous_sentence or "",
                "next": s.next_sentence or "",
            }
            for _, s in top
            if _ > 0  # 점수가 0인 것은 제외
        ]

    async def _search_paragraphs(
        self, db: AsyncSession, category: str, keywords: list[str]
    ) -> list[dict]:
        query = select(ParagraphExample)
        if category:
            query = query.where(ParagraphExample.category == category)
        query = query.order_by(ParagraphExample.id.desc()).limit(80)

        result = await db.execute(query)
        candidates = result.scalars().all()

        if not candidates:
            return []

        scored = [
            (_score_paragraph(c, keywords, category), c)
            for c in candidates
        ]
        scored.sort(key=lambda x: x[0], reverse=True)

        top = scored[:3]

        return [
            {
                "sentences": json.loads(p.sentences_json),
                "topic": p.topic or "",
            }
            for _, p in top
            if _ > 0
        ]

    async def _search_corrections(
        self, db: AsyncSession, category: str
    ) -> list[dict]:
        query = select(CorrectionExample).where(CorrectionExample.approved == 1)
        if category:
            query = query.where(CorrectionExample.category == category)
        query = query.order_by(CorrectionExample.id.desc()).limit(5)

        result = await db.execute(query)
        corrections = result.scalars().all()

        if not corrections:
            # 카테고리 없이 최신 것
            result_all = await db.execute(
                select(CorrectionExample)
                .where(CorrectionExample.approved == 1)
                .order_by(CorrectionExample.id.desc())
                .limit(3)
            )
            corrections = result_all.scalars().all()

        return [
            {
                "ai": c.ai_output[:400],
                "user": c.user_final[:400] if c.user_final else "",
            }
            for c in corrections
        ]

    async def get_stats(self, db: AsyncSession) -> dict:
        sent_total = await db.execute(select(sqlfunc.count(SentenceExample.id)))
        para_total = await db.execute(select(sqlfunc.count(ParagraphExample.id)))
        corr_total = await db.execute(select(sqlfunc.count(CorrectionExample.id)))

        approved_result = await db.execute(
            select(sqlfunc.count(CorrectionExample.id)).where(
                CorrectionExample.approved == 1
            )
        )

        return {
            "sentence_examples": sent_total.scalar() or 0,
            "paragraph_examples": para_total.scalar() or 0,
            "total_corrections": corr_total.scalar() or 0,
            "approved_corrections": approved_result.scalar() or 0,
        }
