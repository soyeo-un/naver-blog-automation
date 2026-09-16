from openai import AsyncOpenAI
from app.config import settings


class StyleAnalyzer:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def analyze_style(self, sample_texts: list[str], category: str = "") -> str:
        combined = "\n\n---\n\n".join(sample_texts[:5])
        category_context = f"\n이 글들은 '{category}' 카테고리 블로그 글입니다." if category else ""
        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """당신은 한국어 블로그 글쓰기 스타일 분석 전문가입니다.
주어진 블로그 글들을 분석하여 작성자의 말투를 완벽히 복제할 수 있는 수준으로 정리하세요.
추상적인 설명이 아닌, 구체적인 패턴과 실제 예시를 중심으로 분석하세요.""",
                },
                {
                    "role": "user",
                    "content": f"""다음 블로그 글들의 작성 스타일을 분석해주세요.{category_context}

{combined}

다음 항목을 JSON으로 반환하세요:

1. "sentence_endings": 실제로 자주 쓰는 문장 끝맺음 목록 (최소 10개). 예: ["~했거든요", "~더라고요", "~인 듯!", "~ㅋㅋ"]
2. "connecting_words": 문장 연결할 때 쓰는 표현 목록. 예: ["근데", "아 그리고", "솔직히"]
3. "favorite_expressions": 습관적으로 반복하는 표현/감탄사 (최소 10개). 예: ["진짜", "대박", "넘넘", "완전"]
4. "emoji_patterns": 실제 사용하는 이모지/이모티콘 목록. 예: ["ㅎㅎ", "ㅋㅋㅋ", "🥹", "✨"]
5. "tone_description": 말투를 한 문장으로 (예: "20대 여성이 친구에게 카톡하듯 편하게 쓰는 말투")
6. "writing_rules": 이 사람의 글쓰기 규칙 5개 (예: "~습니다 존댓말은 절대 안 씀", "한 문단은 2-3줄로 짧게", "소제목 없이 쭉 이어서 씀")
7. "sample_sentences": 이 사람의 말투가 가장 잘 드러나는 원문 문장 5개를 그대로 뽑아주세요
8. "paragraph_style": 문단 길이, 줄바꿈 패턴
9. "banned_expressions": 이 사람이 절대 안 쓸 것 같은 표현 목록. 예: ["또한", "뿐만 아니라", "이처럼", "살펴보겠습니다"]
10. "punctuation_style": 구두점 사용 패턴을 정밀 분석. 반드시 다음 항목 포함:
    - "period": 문장 끝에 마침표(.)를 붙이는지 안 붙이는지 (빈도를 퍼센트로)
    - "comma": 쉼표(,) 사용 빈도 (거의 안 씀 / 가끔 / 자주)
    - "quotes": 따옴표(' " 「」) 사용 여부와 빈도
    - "ellipsis": 말줄임표(...) 사용 여부
    - "exclamation": 느낌표(!) 사용 빈도
    - "question": 물음표(?) 사용 빈도
    예: {"period": "문장 끝에 . 거의 안 붙임 (10% 미만)", "comma": "거의 안 씀", "quotes": "작은따옴표 거의 안 씀", "ellipsis": "자주 사용", "exclamation": "가끔 사용", "question": "자주 사용"}
11. "heading_style": 소제목(##, 볼드 등) 사용 패턴. 반드시 다음 포함:
    - 소제목을 쓰는지 안 쓰는지
    - 쓴다면 몇 개 정도 쓰는지
    - 소제목 형식 (볼드, 이모지 포함 등)
    예: "소제목 거의 안 씀. 쭉 이어서 작성" 또는 "3~4개 정도 사용. 간결한 단어형"""",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        return response.choices[0].message.content
