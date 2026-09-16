import json
from pathlib import Path
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.text_cleaner import TextCleaner
from app.services.example_searcher import ExampleSearcher

STYLE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "style.json"


def _load_style_prompt() -> str:
    """style.json을 로드해서 프롬프트 텍스트로 변환"""
    if not STYLE_PATH.exists():
        return ""
    style = json.loads(STYLE_PATH.read_text(encoding="utf-8"))

    identity = style.get("identity", {})
    voice = style.get("voice", {})
    sentence = style.get("sentence_style", {})
    anti = style.get("anti_style", {})
    emotion = style.get("emotion_style", {})
    casual = style.get("casual_expression", {})
    reaction = style.get("personal_reaction", {})
    principles = style.get("core_principles", [])

    endings = ", ".join(sentence.get("preferred_endings", []))
    avoid_list = "\n".join(f"- {x}" for x in anti.get("avoid", []))
    avoid_ai = ", ".join(anti.get("also_avoid_ai", []))
    reaction_patterns = "\n".join(f"- {x}" for x in reaction.get("preferred_patterns", []))
    principle_lines = "\n".join(f"- {p}" for p in principles)
    casual_examples = ", ".join(casual.get("examples", [])[:5])
    laugh = " ".join(emotion.get("laugh", []))

    return f"""## 페르소나: {identity.get('persona', '블로거')}
스타일: {identity.get('overall_style', '')}
시점: {identity.get('writing_perspective', '1인칭')}

## 핵심 원칙:
{principle_lines}

## 말투
톤: {', '.join(voice.get('tone', []))}
격식: {voice.get('formality', '')}

## 문장 스타일
선호 어미: {endings}
문장 길이: {sentence.get('sentence_length', '')}
줄바꿈: {sentence.get('line_breaks', '')}
구어체: {sentence.get('spoken_expression', '')}

## 개인 반응 패턴:
{reaction_patterns}

## 이모지 (상황에 맞게만): {laugh}
규칙: {emotion.get('rule', '')}

## 캐주얼 표현: {casual_examples}

## 금지 표현 (광고/업체문 톤):
{avoid_list}
AI 표현 금지: {avoid_ai}"""


def _build_photo_context(photo_summary: dict, client_request: str, keywords: str) -> str:
    """photo_summary + 업체 요청사항을 프롬프트용 텍스트로 변환"""
    parts = []

    # scene 기반 흐름
    scenes = photo_summary.get("scenes", [])
    if scenes:
        flow_lines = []
        for scene in scenes:
            cat = scene.get("category", "")
            summary = scene.get("summary", "")
            points = scene.get("important_points", [])
            line = f"[{cat}] {summary}"
            if points:
                line += "\n  포인트: " + " / ".join(points[:3])
            flow_lines.append(line)
        parts.append("## 사진에서 확인된 장면 흐름 (이 순서대로 글 전개):\n" + "\n".join(flow_lines))

    # 업체 요청사항
    if client_request:
        parts.append(f"## 업체 요청사항 (자연스럽게 반영):\n{client_request}")

    # 키워드
    if keywords:
        parts.append(f"## 필수 키워드 (초반에 자연스럽게 배치):\n{keywords}")

    return "\n\n".join(parts)


def _build_examples_for_prompt(examples: dict) -> str:
    """검색된 예시를 프롬프트에 포함"""
    parts = []

    sentences = examples.get("sentence_examples", [])
    if sentences:
        lines = []
        for s in sentences:
            block = ""
            if s.get("previous"):
                block += f"{s['previous']}\n"
            block += f"→ {s['sentence']}"
            if s.get("next"):
                block += f"\n{s['next']}"
            lines.append(block)
        parts.append("## 문장 예시 (문체와 문장 연결 흐름 참고):\n" + "\n\n".join(lines))

    paragraphs = examples.get("paragraph_examples", [])
    if paragraphs:
        para_lines = []
        for p in paragraphs:
            sents = p.get("sentences", [])
            para_lines.append("\n".join(sents))
        parts.append("## 문단 예시 (전개 방식과 호흡 참고):\n" + "\n---\n".join(para_lines))

    corrections = examples.get("correction_examples", [])
    if corrections:
        corr_lines = []
        for c in corrections:
            if c.get("user"):
                corr_lines.append(f"AI: {c['ai']}\n→ 사용자: {c['user']}")
        if corr_lines:
            parts.append("## 사용자 수정 패턴:\n" + "\n\n".join(corr_lines))

    return "\n\n".join(parts)


class DraftGenerator:
    """사진 분석 결과 + 스타일을 결합하여 블로그 초안 생성.
    이 단계에서 GPT 1회만 호출."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._style_prompt = _load_style_prompt()
        self._searcher = ExampleSearcher()

    async def generate_draft(
        self,
        photo_summary: dict,
        client_request: str,
        keywords: str,
        category: str,
        db: AsyncSession | None = None,
    ) -> dict:
        # 코드로 관련 예시 검색 (GPT 0회)
        examples_prompt = ""
        if db:
            search_text = client_request + " " + keywords
            for scene in photo_summary.get("scenes", []):
                search_text += " " + scene.get("summary", "")
            examples = await self._searcher.search_relevant(search_text, category, db)
            examples_prompt = _build_examples_for_prompt(examples)

        photo_context = _build_photo_context(photo_summary, client_request, keywords)

        system_content = f"""당신은 숀의 대필 작가입니다. 숀 본인이 직접 쓴 블로그 글처럼 보여야 합니다.
당신의 흔적은 0이어야 합니다. AI가 쓴 티가 나면 실패입니다.

{self._style_prompt}
"""

        if examples_prompt:
            system_content += f"""
{examples_prompt}

## 예시 활용 규칙:
제공된 예시는 문체와 문장 연결 방식을 참고하기 위한 것이다.
예시 문장을 그대로 복사하지 말고, 현재 글의 내용에 맞는 새로운 문장으로 작성한다.
"""

        system_content += f"""
{photo_context}

## 작업 규칙:
1. 위 장면 흐름 순서를 따라 자연스러운 블로그 글을 작성하세요
2. 실제 방문한 사람이 쓴 것처럼 1인칭으로 작성하세요
3. 사진에서 확인된 사실과 업체 요청사항에 있는 내용만 사용하세요
4. 사진에서 확인할 수 없는 맛, 가격, 서비스 품질 등을 임의로 만들지 마세요
5. 업체 요청사항에 맛이나 서비스에 대한 언급이 있으면 그것만 활용하세요
6. 소제목은 최소한으로만 (없어도 됨)
7. 강한 긍정 표현은 업체 요청사항에 해당 내용이 있을 때만 자연스럽게 사용
8. 사진 번호, 사진 placeholder, 이미지 태그를 본문에 절대 넣지 마세요
9. 최종 결과물은 순수한 블로그 본문 텍스트만 출력하세요
10. 제목도 함께 생성하세요. 첫 줄에 제목, 빈 줄 후 본문 순서로 출력하세요"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_content},
                {
                    "role": "user",
                    "content": "위 장면 흐름과 업체 요청사항을 바탕으로 숀 스타일의 블로그 글을 작성해줘. 제목 + 본문 텍스트만 출력해.",
                },
            ],
            temperature=0.7,
            max_tokens=4000,
        )

        raw = response.choices[0].message.content
        clean = TextCleaner.clean(raw)

        # 첫 줄을 제목, 나머지를 본문으로 분리
        lines = clean.strip().split("\n", 1)
        title = lines[0].strip().lstrip("#").strip()
        body = lines[1].strip() if len(lines) > 1 else ""

        return {
            "title": title,
            "body": body,
            "clean_scan": TextCleaner.scan(body),
        }
