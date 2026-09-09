from openai import AsyncOpenAI
from app.config import settings
from app.services.text_cleaner import TextCleaner
from app.services.web_searcher import WebSearcher


class AIWriter:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def enhance_draft(self, keywords: str, draft: str, style_profile: str | None = None) -> dict:
        web_info = await WebSearcher.collect_info(keywords)
        style_instruction = ""
        if style_profile:
            style_instruction = f"\n## 작성자 말투 스타일 (반드시 이 스타일을 따라주세요):\n{style_profile}\n"

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
