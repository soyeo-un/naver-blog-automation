from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    naver_client_id: str = ""
    naver_client_secret: str = ""
    kakao_rest_api_key: str = ""
    kakao_access_token: str = ""
    database_url: str = "sqlite+aiosqlite:///./data/blog.db"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
