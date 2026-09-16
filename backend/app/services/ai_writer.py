from openai import AsyncOpenAI
from app.config import settings
from app.services.text_cleaner import TextCleaner
from app.services.web_searcher import WebSearcher


class AIWriter:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def enhance_draft(self, keywords: str, draft: str, style_profile: str | None = None, sample_texts: str | None = None) -> dict:
        web_info = await WebSearcher.collect_info(keywords)

        messages = []

        if style_profile and sample_texts:
            # few-shot: 실제 글을 예시로 넣어서 말투를 체득시킴
            samples = [s.strip() for s in sample_texts.split("\n---\n") if s.strip()]

            messages.append({
                "role": "system",
                "content": f"""당신은 대필 작가입니다. 아래 작성자의 말투를 완벽히 복제해서 글을 씁니다.
작성자 본인이 직접 쓴 것처럼 보여야 합니다. 당신의 흔적은 0이어야 합니다.

## 작성자 말투 분석:
{style_profile}

## 구두점 규칙 (최우선 적용):
스타일 분석의 "punctuation_style" 항목을 반드시 따르세요.
- 작성자가 문장 끝에 마침표(.)를 안 붙이면 → 절대 붙이지 마세요
- 작성자가 쉼표(,)를 잘 안 쓰면 → 쉼표 넣지 마세요
- 작성자가 따옴표(' ")를 안 쓰면 → 따옴표 넣지 마세요
- 작성자가 쓰는 구두점만 그대로 사용하세요
이건 가장 중요한 규칙입니다. 구두점 하나가 AI 티를 냅니다.

## 소제목 규칙:
스타일 분석의 "heading_style" 항목을 반드시 따르세요.
- 작성자가 소제목을 안 쓰면 → 소제목 달지 마세요
- 작성자가 소제목을 적게 쓰면 → 최소한으로만 사용하세요
- 절대 AI식으로 소제목을 남발하지 마세요

## 절대 금지:
- AI스러운 표현 ("또한", "뿐만 아니라", "이처럼", "살펴보겠습니다", "알아보겠습니다")
- 작성자가 안 쓰는 문체로 바꾸기
- 과도한 존댓말이나 딱딱한 표현
- 작성자 원래 구두점 습관을 무시하고 교정하는 행위

## 작업:
사용자의 초안을 작성자 말투 그대로 다듬어주세요.
초안의 내용과 의도는 유지하되, 말투/표현/이모지만 작성자 스타일로 바꾸세요.
키워드를 자연스럽게 초반에 배치하세요.
블로그 본문 텍스트만 출력하세요.

## 참고 정보 (필요시 자연스럽게 반영):
{web_info if web_info else "없음"}""",
            })

            # few-shot 예시: 작성자의 실제 글 2~3개를 보여줌
            for i, sample in enumerate(samples[:3]):
                trimmed = sample[:1500]
                messages.append({
                    "role": "user",
                    "content": f"다음 주제로 블로그 글을 써줘.",
                })
                messages.append({
                    "role": "assistant",
                    "content": trimmed,
                })

            # 실제 요청
            messages.append({
                "role": "user",
                "content": f"키워드: {keywords}\n\n아래 초안을 위 말투 그대로 다듬어줘. 내용은 유지하고 말투만 바꿔.\n\n초안:\n{draft}",
            })
        else:
            # 스타일 없이 기본 보정
            messages = [
                {
                    "role": "system",
                    "content": f"""당신은 네이버 블로그 글 작성 보조 도구입니다.
초안을 자연스러운 블로그 글로 다듬어주세요.

## 규칙:
1. 원래 내용과 의도 유지
2. 초안 문장 기반으로 살을 붙이기 (새로 쓰지 않기)
3. AI스러운 표현 금지 ("또한", "뿐만 아니라", "이처럼" 남발 금지)
4. 자연스러운 구어체 혼합, 문장 길이 다양하게
5. 키워드를 자연스럽게 초반에 배치
6. 소제목은 최소한으로만 사용 (없어도 됨)
7. 초안의 구두점 스타일을 그대로 따르기 (마침표 안 찍으면 안 찍기, 쉼표 안 쓰면 안 쓰기)

## 참고 정보:
{web_info if web_info else "없음"}

블로그 본문 텍스트만 출력하세요.""",
                },
                {"role": "user", "content": f"키워드: {keywords}\n\n초안:\n{draft}"},
            ]

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
- 실제 블로거들이 쓸 법한 자연스러운 제목

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
        import json
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
