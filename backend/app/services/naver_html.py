import re
from app.services.text_cleaner import TextCleaner


class NaverHTMLConverter:
    """TipTap HTML을 네이버 스마트에디터 호환 HTML로 변환"""

    FONT_MAP = {
        "나눔고딕": "se-ff-nanumgothic",
        "나눔명조": "se-ff-nanummyeongjo",
        "마루부리": "se-ff-maruburi",
    }

    @staticmethod
    def convert(html: str, font: str = "나눔고딕") -> str:
        """TipTap HTML → 네이버 호환 HTML"""
        # 1. 히든 유니코드 제거
        html = TextCleaner.clean_html(html)

        # 2. p 태그 → 네이버 스타일 div
        html = re.sub(
            r"<p>(.*?)</p>",
            r'<div class="se-module se-module-text"><p class="se-text-paragraph">\1</p></div>',
            html,
        )

        # 3. h1~h3 → 네이버 제목 스타일
        for level in range(1, 4):
            html = re.sub(
                rf"<h{level}>(.*?)</h{level}>",
                rf'<div class="se-module se-module-text"><p class="se-text-paragraph se-text-paragraph-heading{level}">\1</p></div>',
                html,
            )

        # 4. blockquote → 네이버 인용구
        html = re.sub(
            r"<blockquote>(.*?)</blockquote>",
            r'<div class="se-module se-module-oglink"><div class="se-oglink-summary">\1</div></div>',
            html,
            flags=re.DOTALL,
        )

        # 5. hr → 네이버 구분선
        html = html.replace("<hr>", '<div class="se-module se-module-horizontalLine"><hr class="se-hr"></div>')
        html = html.replace("<hr/>", '<div class="se-module se-module-horizontalLine"><hr class="se-hr"></div>')

        # 6. img → 네이버 이미지 모듈
        html = re.sub(
            r'<img src="(.*?)"(.*?)>',
            r'<div class="se-module se-module-image"><a class="se-module-image-link"><img src="\1" class="se-image-resource"></a></div>',
            html,
        )

        # 7. strong/em/u 유지 (네이버 호환)
        # 이미 호환됨

        # 8. 최종 클린 한번 더
        html = TextCleaner.clean_html(html)

        return html

    @staticmethod
    def to_plain_text(html: str) -> str:
        """HTML → 순수 텍스트 (태그 제거)"""
        text = re.sub(r"<[^>]+>", "", html)
        text = re.sub(r"\s+", " ", text).strip()
        return TextCleaner.clean(text)
