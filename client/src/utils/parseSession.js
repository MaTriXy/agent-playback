export function extractContentText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if (typeof item.text === 'string') return item.text;
          if (typeof item.output_text === 'string') return item.output_text;
        }
        return '';
      })
      .join('');
  }
  return '';
}

export function parseJSONL(text) {
  const steps = [];
  let current = null;
  let stepIndex = 0;
  const callIndex = new Map();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    const topType = obj.type;
    const payload = obj.payload || {};

    if (topType === 'event_msg' && payload.type === 'user_message') {
      if (current) steps.push(current);
      stepIndex += 1;
      current = {
        id: `t${stepIndex}`,
        timestamp: obj.timestamp || payload.timestamp || '',
        user_text: payload.message || payload.text || '',
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
        current.agent_summary = payload.message;
      }
      continue;
    }

    if (topType === 'response_item') {
      const ptype = payload.type;
      if (ptype === 'message') {
        current.agent_output += extractContentText(payload.content || payload.text || '');
      } else if (ptype === 'reasoning') {
        if (!current.reasoning_summary && payload.summary && Array.isArray(payload.summary)) {
          const entry = payload.summary.find((s) => s && (s.summary_text || s.text));
          current.reasoning_summary = (entry && (entry.summary_text || entry.text)) || '';
        }
      } else if (ptype === 'function_call') {
        const tool = {
          name: payload.name || '',
          arguments: payload.arguments || '',
          call_id: payload.call_id || '',
          output: '',
          status: 'pending',
        };
        current.tools.push(tool);
        if (tool.call_id) callIndex.set(tool.call_id, current.tools.length - 1);
      } else if (ptype === 'function_call_output') {
        const callId = payload.call_id || '';
        const idx = callIndex.get(callId);
        if (idx !== undefined && current.tools[idx]) {
          current.tools[idx].output = payload.output || '';
          current.tools[idx].status = 'ok';
        }
      }
    }
  }

  if (current) steps.push(current);

  return {
    title: 'Playback',
    createdAt: new Date().toISOString(),
    steps,
  };
}
