import { Session, Step } from './types';

const SUMMARIZER_URL = process.env.SUMMARIZER_URL || 'http://localhost:8000';

function buildTranscript(session: Session, maxChars = 12000): string {
  const lines: string[] = [];
  for (const step of session.steps || []) {
    const tools = (step.tools || []).map((t) => t.name).filter(Boolean).join(', ');
    if (step.user_text) lines.push(`User: ${step.user_text}`);
    if (step.agent_summary) lines.push(`Agent: ${step.agent_summary}`);
    if (step.reasoning_summary) lines.push(`Reasoning: ${step.reasoning_summary}`);
    if (tools) lines.push(`Tools: ${tools}`);
    if (step.agent_output) lines.push(`Output: ${step.agent_output}`);
    lines.push('---');
  }
  const text = lines.join('\n');
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n...(truncated)';
}

function buildStepTranscript(step: Step, maxChars = 4000): string {
  const lines: string[] = [];
  if (step?.user_text) lines.push(`User: ${step.user_text}`);
  if (step?.agent_summary) lines.push(`Agent: ${step.agent_summary}`);
  if (step?.reasoning_summary) lines.push(`Reasoning: ${step.reasoning_summary}`);
  const tools = (step?.tools || []).map((t) => t.name).filter(Boolean).join(', ');
  if (tools) lines.push(`Tools: ${tools}`);
  if (step?.agent_output) lines.push(`Output: ${step.agent_output}`);
  const text = lines.join('\n');
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n...(truncated)';
}

async function post(endpoint: string, body: unknown): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${SUMMARIZER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`Python summarizer unreachable at ${SUMMARIZER_URL}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Summarizer error ${res.status}: ${text}`);
  }
  const data = await res.json() as { summary: string; error?: string };
  if (data.error) throw new Error(`Summarizer returned error: ${data.error}`);
  return data.summary;
}

export async function summarizeSession(session: Session): Promise<string> {
  const transcript = buildTranscript(session);
  return post('/summarize/session', { transcript, title: session.title || 'Playback' });
}

export async function summarizeStep(step: Step): Promise<string> {
  const step_text = buildStepTranscript(step);
  return post('/summarize/step', { step_text });
}

export async function summarizeStepInContext(session: Session, step: Step): Promise<string> {
  const session_summary = session.meta?.ai_summary || await summarizeSession(session);
  const step_text = buildStepTranscript(step);
  return post('/summarize/step/context', { step_text, session_summary });
}
