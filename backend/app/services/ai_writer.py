import json
from pathlib import Path
from openai import AsyncOpenAI
from app.config import settings
from app.services.text_cleaner import TextCleaner
from app.services.web_searcher import WebSearcher

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

    return f"""## 페르소나: {identity.get('persona', '블로거')}
스타일: {identity.get('overall_style', '')}
시점: {identity.get('writing_perspective', '1인칭')}

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

## 절대 금지 표현:
{avoid_list}
AI 표현 금지: {avoid_ai}

## 이 사람이 실제로 쓴 문장 예시:
{example_lines}"""


class AIWriter:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._style = _load_style()
        self._style_prompt = _build_style_prompt(self._style)

    async def enhance_draft(self, keywords: str, draft: str, style_profile: str | None = None, sample_texts: str | None = None) -> dict:
        web_info = await WebSearcher.collect_info(keywords)

        messages = []

        system_content = f"""당신은 숀의 대필 작가입니다. 숀 본인이 직접 쓴 것처럼 보여야 합니다.
당신의 흔적은 0이어야 합니다. AI가 쓴 티가 나면 실패입니다.

{self._style_prompt}
"""

        # 스타일 분석 결과가 있으면 보충 정보로 추가
        if style_profile:
            system_content += f"""
## 추가 스타일 분석 (보충 참고):
{style_profile}
"""

        system_content += f"""
## 작업 규칙:
1. 초안의 내용과 사실을 그대로 유지하세요
2. 말투/표현/이모지만 숀 스타일로 바꾸세요
3. 사용자가 쓰지 않은 경험을 만들어내지 마세요
4. 키워드를 자연스럽게 초반에 배치하세요
5. 소제목은 최소한으로만 (없어도 됨)
6. 블로그 본문 텍스트만 출력하세요

## 참고 정보 (필요시 자연스럽게 반영):
{web_info if web_info else "없음"}"""

        messages.append({"role": "system", "content": system_content})

        # few-shot: 실제 글 예시
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
