export interface Tool {
  name: string;
  arguments: string;
  call_id: string;
  output: string;
  status: 'pending' | 'ok';
}

export interface Step {
  id: string;
  timestamp: string;
  user_text: string;
  agent_summary: string;
  reasoning_summary: string;
  agent_output: string;
  tools: Tool[];
  ai_summary?: string;
  context_summary?: string;
}

export interface SessionMeta {
  ai_summary?: string;
  ai_summary_error?: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  steps: Step[];
  meta: SessionMeta;
}
