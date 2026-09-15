from openai import AsyncOpenAI
from app.config import settings
from app.services.text_cleaner import TextCleaner
from app.services.web_searcher import WebSearcher


class AIWriter:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def enhance_draft(self, keywords: str, draft: str, style_profile: str | None = None, sample_texts: str | None = None) -> dict:
        web_info = await WebSearcher.collect_info(keywords)
        style_instruction = ""
        if style_profile:
            style_instruction = f"""

## ⚠️ 최우선 규칙: 작성자 말투 복제
아래는 작성자의 실제 글쓰기 스타일 분석 결과입니다.
반드시 이 말투를 그대로 따라 써야 합니다. 일반적인 블로그 문체가 아닌, 이 사람 특유의 말투로 쓰세요.

### 스타일 분석:
{style_profile}

### 말투 적용 방법:
- sentence_endings에 있는 문장 끝맺음을 실제로 사용하세요
- favorite_expressions에 있는 표현을 자연스럽게 섞어 쓰세요
- emoji_patterns에 있는 이모지/이모티콘을 비슷한 빈도로 사용하세요
- banned_expressions에 있는 표현은 절대 사용하지 마세요
- writing_rules를 반드시 따르세요
- 작성자가 쓴 것처럼 보여야 합니다. AI가 쓴 티가 나면 안 됩니다."""

            if sample_texts:
                samples = sample_texts.split("\n---\n")
                sample_preview = "\n\n---\n\n".join(samples[:2])
                style_instruction += f"""

### 작성자의 실제 글 예시 (이 말투를 참고하세요):
{sample_preview[:1500]}"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": f"""당신은 네이버 블로그 글 작성 보조 도구입니다.
사용자가 작성한 초안을 다듬어 완성된 블로그 글로 만들어주세요.

## 핵심 규칙:
1. 사용자의 원래 내용과 의도를 반드시 유지
2. 사용자가 작성한 문장을 기반으로 살을 붙이기 (완전 새로 쓰지 않기)
3. 맞춤법/문법 교정
4. 부자연스러운 표현 다듬기
5. 과도하게 AI스러운 표현 금지 ("또한", "뿐만 아니라", "이처럼" 남발 금지)
6. 자연스러운 구어체 혼합
7. 문장 길이를 다양하게 (짧은 문장과 긴 문장 섞기)
8. 네이버 SEO를 위해 키워드를 자연스럽게 제목, 초반, 소제목에 배치
{style_instruction}

## 참고 정보 (필요한 부분만 자연스럽게 반영):
{web_info if web_info else "수집된 정보 없음"}

## 출력 형식:
블로그 본문 텍스트만 출력하세요. 마크다운이나 특수 포맷 없이 순수 텍스트로.""",
                },
                {"role": "user", "content": f"키워드: {keywords}\n\n초안:\n{draft}"},
            ],
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
