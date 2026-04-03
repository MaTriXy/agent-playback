import { Step, Tool } from './types';

function extractContentText(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          if (typeof o.text === 'string') return o.text;
          if (typeof o.output_text === 'string') return o.output_text;
        }
        return '';
      })
      .join('');
  }
  return '';
}

function parseReasoningSummary(payload: Record<string, unknown>): string {
  if (!payload || !payload.summary) return '';
  if (Array.isArray(payload.summary)) {
    for (const entry of payload.summary as Record<string, unknown>[]) {
      if (entry && typeof entry.summary_text === 'string') return entry.summary_text;
      if (entry && typeof entry.text === 'string') return entry.text;
    }
  }
  if (typeof payload.summary === 'string') return payload.summary;
  return '';
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

function generateReasoning(step: Step): string {
  const toolNames = unique(step.tools.map((t) => t.name)).filter(Boolean);
  const parts: string[] = [];
  if (toolNames.length) {
    parts.push(`Used tools: ${toolNames.join(', ')}`);
  }
  if (step.agent_summary) {
    parts.push(step.agent_summary.replace(/\.$/, ''));
  }
  if (!parts.length && step.user_text) {
    const trimmed = step.user_text.length > 80 ? step.user_text.slice(0, 77) + '...' : step.user_text;
    parts.push(`Responded to: "${trimmed}"`);
  }
  return parts.length ? parts.join('. ') + '.' : '';
}

export function parseJSONL(lines: string[]): Step[] {
  const steps: Step[] = [];
  let current: Step | null = null;
  let stepIndex = 0;
  const callIndex = new Map<string, number>();

  for (const line of lines) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    const topType = obj.type as string;
    const payload = (obj.payload as Record<string, unknown>) || {};

    if (topType === 'event_msg' && payload.type === 'user_message') {
      if (current) steps.push(current);
      stepIndex += 1;
      current = {
        id: `t${stepIndex}`,
        timestamp: (obj.timestamp as string) || (payload.timestamp as string) || '',
        user_text: (payload.message as string) || (payload.text as string) || '',
        agent_summary: '',
        reasoning_summary: '',
        agent_output: '',
        tools: [],
      };
      continue;
    }

    if (!current) continue;

    if (topType === 'event_msg' && payload.type === 'agent_message') {
      if (!current.agent_summary && payload.message) {
        current.agent_summary = payload.message as string;
      }
      continue;
    }

    if (topType === 'response_item') {
      const ptype = payload.type as string;
      if (ptype === 'message') {
        current.agent_output += extractContentText(payload.content || payload.text || '');
      } else if (ptype === 'reasoning') {
        if (!current.reasoning_summary) {
          current.reasoning_summary = parseReasoningSummary(payload);
        }
      } else if (ptype === 'function_call') {
        const tool: Tool = {
          name: (payload.name as string) || '',
          arguments: (payload.arguments as string) || '',
          call_id: (payload.call_id as string) || '',
          output: '',
          status: 'pending',
        };
        current.tools.push(tool);
        if (tool.call_id) callIndex.set(tool.call_id, current.tools.length - 1);
      } else if (ptype === 'function_call_output') {
        const callId = (payload.call_id as string) || '';
        const idx = callIndex.get(callId);
        if (idx !== undefined && current.tools[idx]) {
          current.tools[idx].output = (payload.output as string) || '';
          current.tools[idx].status = 'ok';
        }
      }
    }
  }

  if (current) steps.push(current);

  for (const step of steps) {
    if (!step.reasoning_summary) {
      step.reasoning_summary = generateReasoning(step);
    }
  }

  return steps;
}
