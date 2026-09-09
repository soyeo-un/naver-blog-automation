import httpx
from bs4 import BeautifulSoup
from app.config import settings


class WebSearcher:
    @staticmethod
    async def search_naver(keyword: str, count: int = 5) -> list[dict]:
        url = "https://openapi.naver.com/v1/search/blog.json"
        headers = {
            "X-Naver-Client-Id": settings.naver_client_id,
            "X-Naver-Client-Secret": settings.naver_client_secret,
        }
        params = {"query": keyword, "display": count, "sort": "sim"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                return []
            data = resp.json()
            results = []
            for item in data.get("items", []):
                title = BeautifulSoup(item["title"], "html.parser").get_text()
                desc = BeautifulSoup(item["description"], "html.parser").get_text()
                results.append({"title": title, "description": desc, "link": item["link"]})
            return results

    @staticmethod
    async def collect_info(keyword: str) -> str:
        results = await WebSearcher.search_naver(keyword)
        if not results:
            return ""
        return "\n".join(f"- {r['title']}: {r['description']}" for r in results)
