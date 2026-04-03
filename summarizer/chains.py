import os
from openai import OpenAI

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1")

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client


def _extract_text(response) -> str:
    if hasattr(response, "output_text") and isinstance(response.output_text, str):
        return response.output_text
    output = getattr(response, "output", [])
    chunks = []
    for item in output:
        for content in getattr(item, "content", []):
            if getattr(content, "type", None) == "output_text":
                chunks.append(content.text)
    return "".join(chunks).strip()


def summarize_session(transcript: str, title: str) -> str:
    prompt = "\n".join([
        "You summarize coding agent sessions for a playback UI.",
        "Return concise markdown with:",
        "1) A 1-2 sentence summary.",
        "2) 3-6 bullet key actions.",
        "3) Tools used (comma-separated).",
        "",
        "Session transcript:",
        transcript,
    ])
    client = get_client()
    response = client.responses.create(model=OPENAI_MODEL, input=prompt, temperature=0.2)
    return _extract_text(response) or "Summary unavailable."


def summarize_step(step_text: str) -> str:
    prompt = "\n".join([
        "Summarize this single step from a coding agent session.",
        "Return 1-2 concise sentences. Avoid chain-of-thought.",
        "",
        "Step content:",
        step_text,
    ])
    client = get_client()
    response = client.responses.create(model=OPENAI_MODEL, input=prompt, temperature=0.2)
    return _extract_text(response) or "Summary unavailable."


def summarize_step_in_context(step_text: str, session_summary: str) -> str:
    prompt = "\n".join([
        "You are summarizing a single step within a larger coding session.",
        "Use the session summary to explain the role and impact of this step.",
        "Return 1-2 concise sentences. Avoid chain-of-thought.",
        "",
        "Session summary:",
        session_summary,
        "",
        "Step content:",
        step_text,
    ])
    client = get_client()
    response = client.responses.create(model=OPENAI_MODEL, input=prompt, temperature=0.2)
    return _extract_text(response) or "Summary unavailable."
