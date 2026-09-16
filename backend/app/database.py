from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

import re
import ssl as _ssl

# PostgreSQL URL을 asyncpg용으로 변환
db_url = settings.database_url
use_ssl = False

if db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    use_ssl = "sslmode=require" in db_url
    # asyncpg가 지원하지 않는 URL 파라미터 제거
    db_url = re.sub(r"[&?]sslmode=[^&]*", "", db_url)
    db_url = re.sub(r"[&?]channel_binding=[^&]*", "", db_url)
    # 쿼리스트링이 비면 ? 제거
    db_url = re.sub(r"\?$", "", db_url)

connect_args = {}
if use_ssl:
    ssl_ctx = _ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = _ssl.CERT_NONE
    connect_args["ssl"] = ssl_ctx

engine = create_async_engine(db_url, echo=False, connect_args=connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
