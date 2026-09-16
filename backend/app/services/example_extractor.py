import json
import re
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SentenceExample, ParagraphExample


# ── 문장 끝 패턴 (한국어 블로그) ──
_SENT_END = re.compile(
    r'(?<=[.!?~])\s+'             # 기본 구두점 뒤 공백
    r'|(?<=요)\s+'                # ~요 뒤 공백
    r'|(?<=다)\s+'                # ~다 뒤 공백
    r'|(?<=ㅋ)\s+'                # ㅋㅋ 뒤 공백
    r'|(?<=ㅎ)\s+'                # ㅎㅎ 뒤 공백
    r'|(?<=ㅠ)\s+'                # ㅠㅠ 뒤 공백
)

# ── 역할 분류 규칙 (키워드 기반) ──
_ROLE_RULES: list[tuple[str, list[str]]] = [
    ("긍정_평가", [
        "좋았", "좋더라", "좋아요", "맛있", "맛나", "만족", "편했", "편하",
        "최고", "인생", "역대급", "추천", "대박", "완전", "진짜 좋",
    ]),
    ("부정_아쉬움", [
        "아쉬", "단점", "별로", "부족", "불편", "실망", "안 좋",
        "못했", "없었", "그냥 그",
    ]),
    ("팁_정보", [
        "팁", "참고", "참고로", "예약", "주차", "영업시간", "가격",
        "메뉴", "위치", "혹시", "알아두",
    ]),
    ("감정_표현", [
        "ㅋㅋ", "ㅎㅎ", "ㅠㅠ", "🤤", "😭", "🥹", "❤", "💙",
        "넘넘", "오쪼", "냠냠",
    ]),
    ("경험_서술", [
        "갔는데", "먹었는데", "했는데", "봤는데", "처음", "도착",
        "주문", "시켰", "골랐", "선택",
    ]),
    ("마무리", [
        "또 올", "다음에", "재방문", "총평", "결론",
        "마지막으로", "정리하면",
    ]),
]

# ── 불용어 (키워드 추출 시 제외) ──
_STOPWORDS = {
    "그리고", "그래서", "근데", "하지만", "그런데", "그냥", "좀", "진짜",
    "되게", "약간", "이건", "저는", "거의", "정도", "이렇게", "그렇게",
    "하는", "있는", "없는", "같은", "이런", "저런", "되는", "했는",
    "있었", "없었", "했어요", "했습니다", "인데요", "거든요", "더라고요",
    "같아요", "것", "수", "때", "중", "후", "전", "곳", "편",
}


def _split_paragraphs(text: str) -> list[str]:
    """빈 줄 기준으로 문단 분리"""
    raw = re.split(r'\n\s*\n', text.strip())
    paragraphs = []
    for p in raw:
        cleaned = p.strip()
        if cleaned:
            paragraphs.append(cleaned)
    return paragraphs


def _split_sentences(paragraph: str) -> list[str]:
    """문단을 문장 단위로 분리. 줄바꿈 우선, 그 안에서 문장 끝 패턴으로 추가 분리"""
    lines = [ln.strip() for ln in paragraph.split('\n') if ln.strip()]
    sentences = []
    for line in lines:
        # 줄 자체가 짧으면 (60자 이하) 하나의 문장으로 취급
        if len(line) <= 60:
            sentences.append(line)
        else:
            # 긴 줄은 문장 패턴으로 추가 분리 시도
            parts = _SENT_END.split(line)
            for part in parts:
                part = part.strip()
                if part:
                    sentences.append(part)
    return sentences


def _classify_role(sentence: str) -> str:
    """규칙 기반 역할 분류. 100% 정확하지 않아도 검색 필터 보조용으로 충분"""
    lower = sentence.lower()
    for role, keywords in _ROLE_RULES:
        for kw in keywords:
            if kw in lower:
                return role
    return "일반"


def _extract_keywords(sentence: str) -> list[str]:
    """문장에서 명사/키워드를 간단하게 추출 (2자 이상, 한글 단어)"""
    # 한글 단어 추출
    words = re.findall(r'[가-힣]{2,}', sentence)
    # 불용어 제거, 중복 제거
    return list(dict.fromkeys(w for w in words if w not in _STOPWORDS))[:10]


class ExampleExtractor:
    """GPT 호출 없이 코드로 문장/문단을 분리하고 DB에 저장"""

    async def extract_from_post(
        self, text: str, category: str, post_id: int | None, db: AsyncSession
    ) -> dict:
        paragraphs = _split_paragraphs(text)

        sent_count = 0
        para_count = 0

        for para_idx, para_text in enumerate(paragraphs):
            sentences = _split_sentences(para_text)
            if not sentences:
                continue

            # paragraph example 저장
            db.add(ParagraphExample(
                sentences_json=json.dumps(sentences, ensure_ascii=False),
                category=category,
                topic="",
                source_post_id=post_id,
            ))
            para_count += 1

            # sentence example 저장 (문맥 포함)
            for sent_idx, sentence in enumerate(sentences):
                if len(sentence) < 5:
                    continue

                prev_sent = sentences[sent_idx - 1] if sent_idx > 0 else ""
                next_sent = sentences[sent_idx + 1] if sent_idx < len(sentences) - 1 else ""
                role = _classify_role(sentence)
                keywords = _extract_keywords(sentence)

                db.add(SentenceExample(
                    sentence=sentence,
                    category=category,
                    role=role,
                    keywords=",".join(keywords),
                    previous_sentence=prev_sent,
                    next_sentence=next_sent,
                    source_post_id=post_id,
                    paragraph_id=para_idx,
                    sentence_index=sent_idx,
                ))
                sent_count += 1

        await db.commit()
        return {"sentences": sent_count, "paragraphs": para_count}
