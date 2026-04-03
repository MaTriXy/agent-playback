from fastapi import FastAPI, HTTPException
from models import (
    SessionSummaryRequest,
    StepSummaryRequest,
    StepContextSummaryRequest,
    SummaryResponse,
)
import chains

app = FastAPI(title="Playback Summarizer")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/summarize/session", response_model=SummaryResponse)
def summarize_session(req: SessionSummaryRequest):
    try:
        summary = chains.summarize_session(req.transcript, req.title)
        return SummaryResponse(summary=summary)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/step", response_model=SummaryResponse)
def summarize_step(req: StepSummaryRequest):
    try:
        summary = chains.summarize_step(req.step_text)
        return SummaryResponse(summary=summary)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize/step/context", response_model=SummaryResponse)
def summarize_step_context(req: StepContextSummaryRequest):
    try:
        summary = chains.summarize_step_in_context(req.step_text, req.session_summary)
        return SummaryResponse(summary=summary)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
