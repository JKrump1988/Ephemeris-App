from datetime import date, time
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


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
    birth_date: date
    birth_time: Optional[time] = None
    birth_time_known: bool = True
    location_name: str = Field(min_length=2, max_length=140)
    latitude: float
    longitude: float
    timezone: str

    @model_validator(mode="after")
    def validate_birth_time(self):
        if self.birth_time_known and self.birth_time is None:
            raise ValueError("birth_time is required when birth_time_known is true")
        return self


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
    latitude: float
    longitude: float
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


class BillingTierOption(BaseModel):
    tier: TierName
    label: str
    amount: float
    currency: str
    accessible: bool
    premium_story: str
    includes: List[str]


class BillingCatalogResponse(BaseModel):
    current_tier: TierName
    tiers: List[BillingTierOption]


class CheckoutCreateRequest(BaseModel):
    tier: Literal["profile", "blueprint", "master"]
    origin_url: str


class CheckoutStartResponse(BaseModel):
    url: str
    session_id: str


class CheckoutStatusSyncResponse(BaseModel):
    session_id: str
    status: str
    payment_status: str
    current_tier: TierName
    target_tier: TierName
    amount_total: int
    currency: str
    unlocked: bool
    message: str


class AcademyLesson(BaseModel):
    id: str
    title: str
    lesson_type: Literal["video", "text"]
    duration: str
    locked: bool


class AcademyModule(BaseModel):
    id: str
    title: str
    summary: str
    locked: bool
    lessons: List[AcademyLesson]


class AcademyCourse(BaseModel):
    id: str
    title: str
    description: str
    level: str
    locked: bool
    cover_theme: str
    modules: List[AcademyModule]


class AcademyCatalogResponse(BaseModel):
    title: str
    description: str
    courses: List[AcademyCourse]


class AstrologerChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: str


class AstrologerSessionResponse(BaseModel):
    session_id: str
    messages: List[AstrologerChatMessage]
    eligible: bool
    current_tier: TierName
    suggested_prompts: List[str]


class AstrologerMessageRequest(BaseModel):
    session_id: str = Field(min_length=4, max_length=120)
    message: str = Field(min_length=2, max_length=2000)
    focus_context: dict | None = None


class AstrologerMessageResponse(BaseModel):
    session_id: str
    reply: str
    messages: List[AstrologerChatMessage]
    current_tier: TierName