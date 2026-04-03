from pydantic import BaseModel
from typing import Optional


class SessionSummaryRequest(BaseModel):
    transcript: str
    title: str


class StepSummaryRequest(BaseModel):
    step_text: str


class StepContextSummaryRequest(BaseModel):
    step_text: str
    session_summary: str


class SummaryResponse(BaseModel):
    summary: str
    error: Optional[str] = None
