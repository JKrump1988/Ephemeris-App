from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


TierName = Literal["snapshot", "profile", "blueprint", "master"]


class MessageResponse(BaseModel):
    message: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    email: EmailStr
    name: str
    subscription_tier: TierName
    has_chart: bool
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserPublic


class LocationOption(BaseModel):
    id: str
    label: str
    latitude: float
    longitude: float
    timezone: str
    country: Optional[str] = None


class LocationSearchResponse(BaseModel):
    query: str
    results: List[LocationOption]


class ChartCreate(BaseModel):
    birth_date: str
    birth_time: Optional[str] = None
    birth_time_known: bool = True
    location_name: str = Field(min_length=2, max_length=140)
    latitude: float
    longitude: float
    timezone: str


class TierAccess(BaseModel):
    tier: TierName
    label: str
    accessible: bool
    teaser: str
    included_topics: List[str]


class ChartResponse(BaseModel):
    id: str
    created_at: str
    updated_at: str
    approximate_time_used: bool
    note: str
    location_name: str
    timezone: str
    birth_date: str
    birth_time: Optional[str]
    tier_access: List[TierAccess]
    chart: dict


class ReadingSection(BaseModel):
    title: str
    content: str
    highlight: Optional[str] = None


class ReadingResponse(BaseModel):
    tier: TierName
    accessible: bool
    preview: bool
    title: str
    summary: str
    note: str
    sections: List[ReadingSection]
    locked_topics: List[str]


class DailyInsightResponse(BaseModel):
    generated_for: str
    cosmic_weather: str
    personal_transit_note: str
    reflection_prompt: str
    highlights: List[str]
    note: str


class PlatformOverviewResponse(BaseModel):
    system_architecture: List[str]
    product_feature_map: List[str]
    data_flow: List[str]
    reading_generation_logic: List[str]
    monetization_flow: List[str]
    ai_astrologer_architecture: List[str]
    future_course_integration_structure: List[str]
    safety_framework: List[str]