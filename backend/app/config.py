from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/capstone_timesheet"
    azure_client_id: str = ""
    azure_tenant_id: str = ""
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
