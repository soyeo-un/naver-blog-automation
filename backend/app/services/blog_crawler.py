import httpx
from bs4 import BeautifulSoup
import re


class BlogCrawler:
    @staticmethod
    async def fetch_blog_posts(blog_url: str, max_posts: int = 10) -> list[str]:
        posts = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            blog_id = BlogCrawler._extract_blog_id(blog_url)
            if not blog_id:
                return []
            list_url = f"https://blog.naver.com/PostTitleListAsync.naver?blogId={blog_id}&countPerPage={max_posts}&currentPage=1"
            resp = await client.get(list_url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code != 200:
                return []
            log_nos = re.findall(r'"logNo":"(\d+)"', resp.text)
            for log_no in log_nos[:max_posts]:
                content = await BlogCrawler._fetch_post_content(client, blog_id, log_no)
                if content:
                    posts.append(content)
        return posts

    @staticmethod
    async def _fetch_post_content(client: httpx.AsyncClient, blog_id: str, log_no: str) -> str | None:
        url = f"https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}"
        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        content_area = soup.select_one(".se-main-container") or soup.select_one("#postViewArea")
        if not content_area:
            return None
        return content_area.get_text(separator="\n", strip=True)

    @staticmethod
    def _extract_blog_id(url: str) -> str | None:
        patterns = [
            r"blog\.naver\.com/([a-zA-Z0-9_]+)",
            r"blog\.naver\.com/prologue/([a-zA-Z0-9_]+)",
        ]
        for p in patterns:
            m = re.search(p, url)
            if m:
                return m.group(1)
        return None
