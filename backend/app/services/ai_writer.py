import json
from pathlib import Path
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.services.text_cleaner import TextCleaner
from app.services.web_searcher import WebSearcher
from app.services.example_searcher import ExampleSearcher

STYLE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "style.json"


def _load_style() -> dict:
    if STYLE_PATH.exists():
        return json.loads(STYLE_PATH.read_text(encoding="utf-8"))
    return {}


def _build_style_prompt(style: dict) -> str:
    if not style:
        return ""

    identity = style.get("identity", {})
    voice = style.get("voice", {})
    sentence = style.get("sentence_style", {})
    anti = style.get("anti_style", {})
    emotion = style.get("emotion_style", {})
    casual = style.get("casual_expression", {})
    reaction = style.get("personal_reaction", {})
    tip = style.get("tip_style", {})
    principles = style.get("core_principles", [])
    examples = style.get("reference_examples", [])

    endings = ", ".join(sentence.get("preferred_endings", []))
    avoid_list = "\n".join(f"- {x}" for x in anti.get("avoid", []))
    avoid_ai = ", ".join(anti.get("also_avoid_ai", []))
    reaction_patterns = "\n".join(f"- {x}" for x in reaction.get("preferred_patterns", []))
    tip_phrases = ", ".join(tip.get("preferred_phrases", []))
    example_lines = "\n".join(f"- {x}" for x in examples[:6])
    laugh = " ".join(emotion.get("laugh", []))
    emo = " ".join(emotion.get("emotion", []))
    pos_emoji = " ".join(emotion.get("positive", []))
    casual_examples = ", ".join(casual.get("examples", [])[:5])
    principle_lines = "\n".join(f"- {p}" for p in principles)

    return f"""## 페르소나: {identity.get('persona', '블로거')}
스타일: {identity.get('overall_style', '')}
시점: {identity.get('writing_perspective', '1인칭')}

## 핵심 원칙:
{principle_lines}

## 말투
톤: {', '.join(voice.get('tone', []))}
격식: {voice.get('formality', '')}
성격: {voice.get('personality', '')}

## 문장 스타일
선호 어미: {endings}
문장 길이: {sentence.get('sentence_length', '')}
리듬: {sentence.get('rhythm', '')}
줄바꿈: {sentence.get('line_breaks', '')}
구어체: {sentence.get('spoken_expression', '')}
말줄임: {sentence.get('ellipsis', '')}

## 개인 반응 패턴 (적극 사용):
{reaction_patterns}

## 팁 표현: {tip_phrases}

## 이모지/이모티콘 (상황에 맞게만):
웃음: {laugh}
감정: {emo}
긍정: {pos_emoji}
규칙: {emotion.get('rule', '')}

## 캐주얼 표현 (선택적): {casual_examples}
{casual.get('rule', '')}

## 금지 표현 (광고/업체 소개문 톤):
{avoid_list}
AI 표현 금지: {avoid_ai}

## 이 사람이 실제로 쓴 문장 예시:
{example_lines}"""


def _build_examples_prompt(examples: dict) -> str:
    parts = []

    # 문장 예시: 앞뒤 문맥을 함께 보여줘서 문장 연결 패턴 학습
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
        parts.append(
            "## 관련 문장 예시 (문체와 문장 간 연결 흐름 참고):\n"
            + "\n\n".join(lines)
        )

    # 문단 예시: 문장 순서 그대로 보여줘서 전개 방식 학습
    paragraphs = examples.get("paragraph_examples", [])
    if paragraphs:
        para_lines = []
        for p in paragraphs:
            sents = p.get("sentences", [])
            para_lines.append("\n".join(sents))
        parts.append(
            "## 관련 문단 예시 (문단 전개 방식과 호흡 참고):\n"
            + "\n---\n".join(para_lines)
        )

    # 사용자 교정 예시: AI→사용자 수정 방향 학습
    corrections = examples.get("correction_examples", [])
    if corrections:
        corr_lines = []
        for c in corrections:
            if c.get("user"):
                corr_lines.append(f"AI: {c['ai']}\n→ 사용자 수정: {c['user']}")
        if corr_lines:
            parts.append(
                "## 사용자 수정 패턴 (AI가 쓴 것을 사용자가 이렇게 고침):\n"
                + "\n\n".join(corr_lines)
            )

    return "\n\n".join(parts)


def _build_db_style_prompt(style_json: str) -> str:
    """DB의 analyzed_style JSON을 강력한 스타일 프롬프트로 변환"""
    try:
        s = json.loads(style_json)
    except (json.JSONDecodeError, TypeError):
        return ""

    parts = []
    if s.get("tone_description"):
        parts.append(f"## 페르소나: {s['tone_description']}")

    endings = s.get("sentence_endings", [])
    if endings:
        parts.append(f"## 문장 어미 (반드시 이것만 사용): {', '.join(endings)}")

    connecting = s.get("connecting_words", [])
    if connecting:
        parts.append(f"## 문장 연결어: {', '.join(connecting)}")

    favorites = s.get("favorite_expressions", [])
    if favorites:
        parts.append(f"## 자주 쓰는 표현 (적극 사용): {', '.join(favorites)}")

    emoji = s.get("emoji_patterns", [])
    if emoji:
        parts.append(f"## 이모지/이모티콘 (상황에 맞게): {', '.join(emoji)}")

    rules = s.get("writing_rules", [])
    if rules:
        parts.append("## 글쓰기 규칙 (필수 준수):\n" + "\n".join(f"- {r}" for r in rules))

    banned = s.get("banned_expressions", [])
    if banned:
        parts.append("## 절대 사용 금지 표현:\n" + "\n".join(f"- {b}" for b in banned))

    punct = s.get("punctuation_style", {})
    if punct:
        punct_lines = []
        period = punct.get("period", "")
        if "안 붙" in period or "미만" in period:
            punct_lines.append("- 문장 끝에 마침표(.) 붙이지 마. 예: '~더라고요' (O) '~더라고요.' (X)")
        comma = punct.get("comma", "")
        if "안 씀" in comma or "가끔" in comma:
            punct_lines.append("- 쉼표(,)는 최소한으로만. 나열할 때만 가끔 쓰고 평소엔 안 씀")
        quotes = punct.get("quotes", "")
        if "안 씀" in quotes:
            punct_lines.append("- 따옴표(' \") 거의 쓰지 마")
        ellipsis = punct.get("ellipsis", "")
        if "자주" in ellipsis:
            punct_lines.append("- 말줄임표(...)는 자연스럽게 자주 써")
        excl = punct.get("exclamation", "")
        if "자주" in excl:
            punct_lines.append("- 느낌표(!)는 감정 표현에 적극적으로 써")
        quest = punct.get("question", "")
        if "자주" in quest:
            punct_lines.append("- 물음표(?)도 자주 써")
        if not punct_lines:
            for key, val in punct.items():
                punct_lines.append(f"- {key}: {val}")
        parts.append("## 구두점 규칙 (가장 중요 — 한 문장도 예외 없이):\n" + "\n".join(punct_lines))

    samples = s.get("sample_sentences", [])
    if samples:
        parts.append("## 실제 문장 예시 (이런 톤으로 써):\n" + "\n".join(f"- {x}" for x in samples))

    heading = s.get("heading_style", {})
    if heading:
        if isinstance(heading, dict):
            parts.append("## 소제목 스타일: " + ", ".join(f"{v}" for v in heading.values()))
        else:
            parts.append(f"## 소제목 스타일: {heading}")

    para = s.get("paragraph_style", "")
    if para:
        parts.append(f"## 문단 스타일: {para}")

    return "\n\n".join(parts)


EXAMPLE_USAGE_RULES = """## 예시 활용 규칙 (필수):
제공된 예시는 사용자의 문체, 문장 연결, 문단 전개 방식을 참고하기 위한 것이다.
예시 문장을 그대로 복사하거나 이어 붙이지 말고, 현재 글의 사실관계와 맥락을 우선하여 새로운 문장으로 작성한다.
특히 예시에서 특정 표현을 무조건 가져오지 않는다.
현재 문장과 앞뒤 문맥, 그리고 다음 문장과의 자연스러운 연결을 우선한다.
사용자 수정 패턴이 있다면, AI가 같은 방향의 실수를 반복하지 않도록 적용한다."""


class AIWriter:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._style = _load_style()
        self._style_prompt = _build_style_prompt(self._style)
        self._searcher = ExampleSearcher()

    async def enhance_draft(
        self,
        keywords: str,
        draft: str,
        category: str = "",
        style_profile: str | None = None,
        sample_texts: str | None = None,
        db: AsyncSession | None = None,
    ) -> dict:
        web_info = await WebSearcher.collect_info(keywords)

        examples_prompt = ""
        if db:
            examples = await self._searcher.search_relevant(draft, category, db)
            examples_prompt = _build_examples_prompt(examples)

            # style_profile이 없으면 DB에서 활성 프로필 자동 로드
            if not style_profile:
                from app.models import StyleProfile
                if category:
                    sr = await db.execute(
                        select(StyleProfile).where(
                            StyleProfile.category == category, StyleProfile.is_active == 1
                        )
                    )
                    profile = sr.scalar_one_or_none()
                else:
                    sr = await db.execute(
                        select(StyleProfile).where(StyleProfile.is_active == 1).limit(1)
                    )
                    profile = sr.scalar_one_or_none()
                if profile:
                    style_profile = profile.analyzed_style
                    if not sample_texts:
                        sample_texts = profile.sample_texts

        messages = []

        # DB 스타일이 있으면 메인으로, style.json은 보조로
        db_style_prompt = _build_db_style_prompt(style_profile) if style_profile else ""
        main_style = db_style_prompt or self._style_prompt

        system_content = f"""당신은 숀의 대필 작가입니다. 숀 본인이 직접 쓴 것처럼 보여야 합니다.
당신의 흔적은 0이어야 합니다. AI가 쓴 티가 나면 실패입니다.
아래 스타일 규칙을 반드시 지켜야 합니다. 특히 구두점, 어미, 금지 표현 규칙은 한 문장도 예외 없이 적용하세요.

{main_style}
"""

        if examples_prompt:
            system_content += f"""
{examples_prompt}

{EXAMPLE_USAGE_RULES}
"""

        system_content += f"""
## 작업 규칙:
1. 초안의 내용과 사실을 그대로 유지하세요
2. 말투/표현/이모지만 숀 스타일로 바꾸세요
3. 사용자가 쓰지 않은 경험을 만들어내지 마세요
4. 키워드를 자연스럽게 초반에 배치하세요
5. 소제목은 최소한으로만 (없어도 됨)
6. 블로그 본문 텍스트만 출력하세요
7. 강한 긍정 표현(인생 맛집, 무조건 추천 등)은 실제 만족도가 높은 상황에서만 자연스럽게 사용
8. 마크다운 문법 절대 사용 금지: **굵게**, *기울임*, ##제목, --- 등 일체 사용하지 마세요. 순수 텍스트만 출력하세요

## 참고 정보 (필요시 자연스럽게 반영):
{web_info if web_info else "없음"}"""

        messages.append({"role": "system", "content": system_content})

        if sample_texts:
            samples = [s.strip() for s in sample_texts.split("\n---\n") if s.strip()]
            for sample in samples[:3]:
                trimmed = sample[:1500]
                messages.append({"role": "user", "content": "다음 주제로 블로그 글을 써줘."})
                messages.append({"role": "assistant", "content": trimmed})

        messages.append({
            "role": "user",
            "content": f"키워드: {keywords}\n\n아래 초안을 숀 말투 그대로 다듬어줘. 내용은 유지하고 말투만 바꿔.\n\n초안:\n{draft}",
        })

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=3000,
        )
        ai_text = response.choices[0].message.content
        clean_text = TextCleaner.clean(ai_text)
        return {
            "original": draft,
            "enhanced": clean_text,
            "web_info_used": web_info,
            "clean_scan": TextCleaner.scan(clean_text),
        }

    async def suggest_titles(self, keywords: list[str]) -> list[str]:
        keyword_str = ", ".join(keywords)
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """네이버 블로그 제목 전문가입니다.
키워드를 받으면 네이버 상위 노출에 유리한 블로그 제목 5개를 추천합니다.

## 규칙:
- 키워드를 자연스럽게 포함
- 클릭하고 싶은 제목 (궁금증 유발, 후기형, 정보형 등 다양하게)
- 너무 길지 않게 (30자 내외)
- AI스러운 제목 금지 (~ 의 모든 것, ~ 완벽 가이드 같은 거)
- 실제 블로거가 쓸 법한 자연스러운 제목
- 숀 스타일: 친근하고 편안한 톤, 경험 기반 제목

JSON 배열로 반환: ["제목1", "제목2", "제목3", "제목4", "제목5"]""",
                },
                {
                    "role": "user",
                    "content": f"키워드: {keyword_str}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
        )
        result = json.loads(response.choices[0].message.content)
        if isinstance(result, list):
            return result[:5]
        for key in result:
            if isinstance(result[key], list):
                return result[key][:5]
        return []

    async def check_ai_detection(self, text: str) -> str:
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": '텍스트가 AI로 작성되었는지 분석하세요. 0~100 점수로 평가 (0=완전 사람, 100=확실히 AI). JSON으로 반환: {"score": 점수, "reasons": ["이유1", "이유2"], "suggestions": ["개선1", "개선2"]}',
                },
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        return response.choices[0].message.content
