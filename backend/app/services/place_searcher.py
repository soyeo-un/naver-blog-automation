import httpx
from app.config import settings


class PlaceSearcher:
    @staticmethod
    async def search_kakao(query: str) -> list[dict]:
        url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        headers = {"Authorization": f"KakaoAK {settings.kakao_rest_api_key}"}
        params = {"query": query, "size": 5}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                return []
            data = resp.json()
            return [
                {
                    "place_name": d["place_name"],
                    "address": d.get("road_address_name") or d.get("address_name", ""),
                    "phone": d.get("phone", ""),
                    "category": d.get("category_name", ""),
                    "url": d.get("place_url", ""),
                }
                for d in data.get("documents", [])
            ]

    @staticmethod
    async def get_place_detail(place_name: str) -> dict | None:
        url = "https://openapi.naver.com/v1/search/local.json"
        headers = {
            "X-Naver-Client-Id": settings.naver_client_id,
            "X-Naver-Client-Secret": settings.naver_client_secret,
        }
        params = {"query": place_name, "display": 1}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                return None
            data = resp.json()
            items = data.get("items", [])
            if not items:
                return None
            item = items[0]
            return {
                "place_name": item.get("title", "").replace("<b>", "").replace("</b>", ""),
                "address": item.get("roadAddress") or item.get("address", ""),
                "phone": item.get("telephone", ""),
                "category": item.get("category", ""),
                "link": item.get("link", ""),
            }

    @staticmethod
    async def search_combined(query: str) -> dict:
        kakao_results = await PlaceSearcher.search_kakao(query)
        naver_detail = await PlaceSearcher.get_place_detail(query)
        if kakao_results:
            best = kakao_results[0]
            if naver_detail:
                best["phone"] = best["phone"] or naver_detail.get("phone", "")
                best["naver_link"] = naver_detail.get("link", "")
            return {"place": best, "alternatives": kakao_results[1:]}
        elif naver_detail:
            return {"place": naver_detail, "alternatives": []}
        return {"place": None, "alternatives": []}
