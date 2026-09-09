from openai import AsyncOpenAI
from app.config import settings


class StyleAnalyzer:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def analyze_style(self, sample_texts: list[str], category: str = "") -> str:
        combined = "\n\n---\n\n".join(sample_texts[:5])
        category_context = f"\n\n이 글들은 '{category}' 카테고리 블로그 글입니다. 해당 카테고리에서 자주 쓰이는 전문 용어, 표현, 키워드도 함께 분석하세요." if category else ""
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "당신은 한국어 블로그 글쓰기 스타일 분석 전문가입니다. 주어진 블로그 글들을 분석하여 작성자의 말투, 문체, 습관적 표현을 JSON으로 정리하세요.",
                },
                {
                    "role": "user",
                    "content": f"다음 블로그 글들의 작성 스타일을 분석해주세요.{category_context}\n\n{combined}\n\n다음 항목을 JSON으로 반환하세요:\n- tone: 전체적인 톤\n- sentence_endings: 자주 쓰는 문장 끝맺음 패턴\n- favorite_expressions: 자주 쓰는 표현/단어 목록\n- category_keywords: 이 카테고리에서 자주 사용하는 전문 용어/키워드\n- paragraph_style: 문단 구성 특징\n- emoji_usage: 이모지/이모티콘 사용 패턴\n- avg_sentence_length: 평균 문장 길이\n- characteristic: 글쓰기의 독특한 특징 3가지\n- sample_intro: 이 스타일로 글을 시작하는 예시 1개\n- sample_closing: 이 스타일로 글을 마무리하는 예시 1개",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        return response.choices[0].message.content
