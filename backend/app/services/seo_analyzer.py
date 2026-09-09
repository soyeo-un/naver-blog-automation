import re


class SEOAnalyzer:
    @staticmethod
    def analyze(title: str, keywords: str, content: str) -> dict:
        keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]
        content_length = len(content)
        scores = {}

        # 1. 본문 길이 (1500~3000자 적정)
        if 1500 <= content_length <= 3000:
            scores["content_length"] = {"score": 20, "max": 20, "detail": f"{content_length}자 (적정)"}
        elif 1000 <= content_length < 1500 or 3000 < content_length <= 5000:
            scores["content_length"] = {"score": 15, "max": 20, "detail": f"{content_length}자 (보통)"}
        else:
            scores["content_length"] = {"score": 5, "max": 20, "detail": f"{content_length}자 (부적절)"}

        # 2. 제목에 키워드 포함
        title_keyword_count = sum(1 for kw in keyword_list if kw in title)
        title_score = min(20, title_keyword_count * 10)
        scores["title_keyword"] = {"score": title_score, "max": 20, "detail": f"제목 내 키워드 {title_keyword_count}개"}

        # 3. 본문 키워드 밀도 (1~3% 적정)
        total_kw_count = sum(content.count(kw) for kw in keyword_list)
        density = (total_kw_count / max(content_length, 1)) * 100 if keyword_list else 0
        if 1 <= density <= 3:
            scores["keyword_density"] = {"score": 20, "max": 20, "detail": f"{density:.1f}% (적정)"}
        elif 0.5 <= density < 1 or 3 < density <= 5:
            scores["keyword_density"] = {"score": 12, "max": 20, "detail": f"{density:.1f}% (보통)"}
        else:
            scores["keyword_density"] = {"score": 5, "max": 20, "detail": f"{density:.1f}% (부적절)"}

        # 4. 소제목 개수 (3~7개 적정)
        headings = len(re.findall(r"\n\n.{2,30}\n", content))
        if 3 <= headings <= 7:
            scores["headings"] = {"score": 20, "max": 20, "detail": f"소제목 {headings}개 (적정)"}
        elif 1 <= headings < 3:
            scores["headings"] = {"score": 10, "max": 20, "detail": f"소제목 {headings}개 (부족)"}
        else:
            scores["headings"] = {"score": 5, "max": 20, "detail": f"소제목 {headings}개"}

        # 5. 초반 200자 내 키워드
        intro = content[:200]
        intro_kw = any(kw in intro for kw in keyword_list) if keyword_list else False
        scores["intro_keyword"] = {
            "score": 20 if intro_kw else 5,
            "max": 20,
            "detail": "초반 200자 내 키워드 있음" if intro_kw else "초반 200자 내 키워드 없음",
        }

        total = sum(v["score"] for v in scores.values())
        return {"total_score": total, "max_score": 100, "details": scores}
