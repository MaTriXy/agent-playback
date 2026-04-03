import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

function usage(): void {
  console.log('Usage: ts-node cli.ts <session.jsonl|session.json> [--server URL] [--open] [--summarize]');
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

function extractContentText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        if (typeof o.text === 'string') return o.text;
        if (typeof o.output_text === 'string') return o.output_text;
      }
      return '';
    }).join('');
  }
  return '';
}

function parseReasoningSummary(payload: Record<string, unknown>): string {
  if (!payload?.summary) return '';
  if (Array.isArray(payload.summary)) {
    for (const entry of payload.summary as Record<string, unknown>[]) {
      if (typeof entry?.summary_text === 'string') return entry.summary_text;
      if (typeof entry?.text === 'string') return entry.text;
    }
  }
  if (typeof payload.summary === 'string') return payload.summary;
  return '';
}

interface Tool { name: string; arguments: string; call_id: string; output: string; status: string; }
interface Step { id: string; timestamp: string; user_text: string; agent_summary: string; reasoning_summary: string; agent_output: string; tools: Tool[]; }

function generateReasoning(step: Step): string {
  const toolNames = unique(step.tools.map((t) => t.name)).filter(Boolean);
  const parts: string[] = [];
  if (toolNames.length) parts.push(`Used tools: ${toolNames.join(', ')}`);
  if (step.agent_summary) parts.push(step.agent_summary.replace(/\.$/, ''));
  if (!parts.length && step.user_text) {
    const trimmed = step.user_text.length > 80 ? step.user_text.slice(0, 77) + '...' : step.user_text;
    parts.push(`Responded to: "${trimmed}"`);
  }
  return parts.length ? parts.join('. ') + '.' : '';
}

function parseJSONL(text: string): Step[] {
  const steps: Step[] = [];
  let current: Step | null = null;
  let stepIndex = 0;
  const callIndex = new Map<string, number>();

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try { obj = JSON.parse(line); } catch { continue; }

    const topType = obj.type as string;
    const payload = (obj.payload as Record<string, unknown>) || {};

    if (topType === 'event_msg' && payload.type === 'user_message') {
      if (current) steps.push(current);
      stepIndex += 1;
      current = {
        id: `t${stepIndex}`,
        timestamp: (obj.timestamp as string) || (payload.timestamp as string) || '',
        user_text: (payload.message as string) || (payload.text as string) || '',
        agent_summary: '', reasoning_summary: '', agent_output: '', tools: [],
      };
      continue;
    }
    if (!current) continue;

    if (topType === 'event_msg' && payload.type === 'agent_message') {
      if (!current.agent_summary && payload.message) current.agent_summary = payload.message as string;
      continue;
    }

    if (topType === 'response_item') {
      const ptype = payload.type as string;
      if (ptype === 'message') {
        current.agent_output += extractContentText(payload.content || payload.text || '');
      } else if (ptype === 'reasoning') {
        if (!current.reasoning_summary) current.reasoning_summary = parseReasoningSummary(payload);
      } else if (ptype === 'function_call') {
        const tool: Tool = {
          name: (payload.name as string) || '',
          arguments: (payload.arguments as string) || '',
          call_id: (payload.call_id as string) || '',
          output: '', status: 'pending',
        };
        current.tools.push(tool);
        if (tool.call_id) callIndex.set(tool.call_id, current.tools.length - 1);
      } else if (ptype === 'function_call_output') {
        const idx = callIndex.get((payload.call_id as string) || '');
        if (idx !== undefined && current.tools[idx]) {
          current.tools[idx].output = (payload.output as string) || '';
          current.tools[idx].status = 'ok';
        }
      }
    }
  }

  if (current) steps.push(current);
  for (const step of steps) {
    if (!step.reasoning_summary) step.reasoning_summary = generateReasoning(step);
  }
  return steps;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.length) { usage(); process.exit(1); }

  const filePath = path.resolve(args[0]);
  const serverArg = args.findIndex((a) => a === '--server');
  const server = serverArg >= 0 ? args[serverArg + 1] : 'http://localhost:4000';
  const shouldOpen = args.includes('--open');
  const shouldSummarize = args.includes('--summarize');

  const raw = fs.readFileSync(filePath, 'utf8');
  const session = filePath.endsWith('.json')
    ? JSON.parse(raw)
    : { title: 'Playback', createdAt: new Date().toISOString(), steps: parseJSONL(raw) };

  const url = new URL(`${server}/api/sessions`);
  if (shouldSummarize) url.searchParams.set('summarize', '1');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });

  if (!res.ok) {
    console.error('Upload failed:', await res.text());
    process.exit(1);
  }

  const data = await res.json() as { session_id: string };
  const sessionUrl = `${server}/session/${data.session_id}`;
  console.log(sessionUrl);

  if (shouldOpen) {
    try { execFileSync('open', [sessionUrl], { stdio: 'ignore' }); } catch { /* user can open manually */ }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
