import json
import httpx


class KakaoNotify:
    @staticmethod
    async def send_to_me(message: str, access_token: str) -> bool:
        url = "https://kapi.kakao.com/v2/api/talk/memo/default/send"
        headers = {"Authorization": f"Bearer {access_token}"}
        template = {
            "object_type": "text",
            "text": message,
            "link": {
                "web_url": "http://localhost:3000/sponsorship",
                "mobile_web_url": "http://localhost:3000/sponsorship",
            },
            "button_title": "일정 확인하기",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url, headers=headers,
                data={"template_object": json.dumps(template)},
            )
            return resp.status_code == 200
