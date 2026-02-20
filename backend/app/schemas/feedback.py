from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Literal
from datetime import datetime
import uuid


class FeedbackCreate(BaseModel):
    type: Literal["bug", "feature", "general", "praise"] = Field(
        ..., description="Feedback category"
    )
    module: Optional[str] = Field(
        None,
        description="App module where feedback was given (e.g. 'students', 'fees', 'attendance')",
        max_length=64,
    )
    rating: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Star rating 1–5 (optional)",
    )
    message: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Feedback text from the user",
    )
    page_url: Optional[str] = Field(
        None,
        description="URL of the page where feedback was submitted",
        max_length=512,
    )

    class Config:
        json_schema_extra = {
            "example": {
                "type": "bug",
                "module": "fees",
                "rating": 2,
                "message": "The fee receipt PDF doesn't download on Safari.",
                "page_url": "/fees/collect",
            }
        }


class FeedbackResponse(BaseModel):
    id: str
    type: str
    module: Optional[str]
    rating: Optional[int]
    message: str
    page_url: Optional[str]
    user_id: Optional[str]
    tenant_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackListResponse(BaseModel):
    items: list[FeedbackResponse]
    total: int
    page: int
    page_size: int
