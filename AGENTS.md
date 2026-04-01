# AGENTS.md — Playback MVP

A guide for AI coding agents working in this codebase.

---

## What This Project Does

**Playback** is a session replay and visualization tool for AI agent interactions. It takes raw agent session logs (JSONL or JSON) and renders them as an interactive, step-by-step timeline in the browser — showing user inputs, agent reasoning, tool calls, and outputs.

---

## Architecture at a Glance

```
CLI (cli.js)
  └─ Parses local .json/.jsonl → POST /api/sessions

Browser (public/)
  └─ Parses local files OR fetches sessions from server
  └─ Renders interactive timeline + tape deck UI

Server (server.js)
  └─ Express REST API
  └─ In-memory session storage (Map + TTL)
  └─ OpenAI integration for LLM summaries
```

---

## File Map

| File | Role |
|------|------|
| `server.js` | Express server — REST API, session storage, OpenAI summaries |
| `cli.js` | CLI upload tool — parse local files, POST to server, open browser |
| `public/index.html` | UI shell — minimal DOM, links to app.js and styles.css |
| `public/app.js` | All frontend logic — parsing, state, rendering, playback controls |
| `public/styles.css` | Retro neon aesthetic — VT323 font, CRT-style colors |
| `package.json` | Dependencies: `express`, `openai`, `uuid` |
| `render.yaml` | Render.com deployment blueprint |

---

## Core Data Structures

### Session
```json
{
  "id": "uuid-string",
  "title": "Session Title",
  "createdAt": "ISO timestamp",
  "steps": [ /* Step[] */ ],
  "meta": {
    "ai_summary": "optional markdown string",
    "ai_summary_error": "optional error string"
  }
}
```

### Step
```json
{
  "id": "t1",
  "timestamp": "string",
  "user_text": "what the user asked",
  "agent_summary": "agent's response summary",
  "reasoning_summary": "agent's internal reasoning",
  "agent_output": "final output text",
  "tools": [ /* Tool[] */ ],
  "ai_summary": "optional LLM-generated summary",
  "context_summary": "optional contextual LLM summary"
}
```

### Tool
```json
{
  "name": "tool_name",
  "arguments": "stringified JSON args",
  "call_id": "unique call identifier",
  "output": "tool result text",
  "status": "pending | ok"
}
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Create session. Add `?summarize=1` to auto-generate AI summary |
| `GET` | `/api/sessions/:id` | Get full session data |
| `POST` | `/api/sessions/:id/summary` | Generate/regenerate full session AI summary |
| `POST` | `/api/sessions/:id/steps/:index/summary` | Generate standalone step summary |
| `POST` | `/api/sessions/:id/steps/:index/context-summary` | Generate step summary in context of whole session |
| `GET` | `/health` | Server health + stats |
| `GET` | `*` | Serve static frontend files |

---

## JSONL Parsing Logic

Both `cli.js` and `public/app.js` parse JSONL files with identical logic. Each line is a JSON object:

| `event_type` | `type` field | Action |
|---|---|---|
| `event_msg` | `user_message` | Start a new Step |
| `event_msg` | `agent_message` | Set `agent_summary` on current step |
| `response_item` | `message` | Set `agent_output` on current step |
| `response_item` | `reasoning` | Set `reasoning_summary` on current step |
| `response_item` | `function_call` | Append Tool to `tools[]` |
| `response_item` | `function_call_output` | Match Tool by `call_id`, set output + status |

**If changing parsing logic, update both files.**

---

## Session Storage

- Stored in a JavaScript `Map` in memory — no database.
- Sessions expire after `TTL_SECONDS` (default: 3600).
- Maximum `MAX_SESSIONS` sessions (default: 200); oldest evicted when limit hit.
- Pruning runs every 30 seconds via `setInterval`.
- **All sessions are lost on server restart.**

---

## OpenAI Integration

Configured via environment variables:
- `OPENAI_API_KEY` — required for summaries (server silently skips if missing)
- `OPENAI_MODEL` — defaults to `gpt-4.1`

Three summary functions in `server.js`:
- `summarizeSession(session)` — full session transcript (capped at 12,000 chars)
- `summarizeStep(step)` — single step (capped at 4,000 chars)
- `summarizeStepInContext(session, step)` — step + session summary as context

Uses the OpenAI **Responses API** (`openai.responses.create`), not Chat Completions.

---

## Frontend State (app.js)

```javascript
state = {
  session: Object,      // current session from server or file
  steps: Array,         // flattened steps array
  currentIndex: Number, // active step (0-based)
  timer: Number|null,   // setInterval handle for auto-playback
  speed: Number,        // 0.5 | 1 | 2
}
```

Key rendering functions:
- `renderRows()` — build HTML for all timeline rows
- `renderDetail()` — populate the right-side detail panel for active step
- `updateMeta()` — update session title/summary display
- `updateDeck()` — sync tape deck controls and timer display

Playback advances one step every `1500 / state.speed` ms.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port |
| `OPENAI_API_KEY` | — | Enables LLM summaries |
| `OPENAI_MODEL` | `gpt-4.1` | Model for summaries |
| `TTL_SECONDS` | `3600` | Session expiry time |
| `MAX_SESSIONS` | `200` | Max concurrent sessions |
| `JSON_LIMIT` | `25mb` | Max request body size |

---

## Running Locally

```bash
npm install
npm start            # starts server on :3000

# Upload a session file
node cli.js path/to/session.jsonl --open

# With AI summary on upload
node cli.js path/to/session.jsonl --open --summarize
```

---

## Key Patterns & Gotchas

- **No database.** Don't add one unless explicitly asked — in-memory is intentional for simplicity and ephemeral use.
- **Duplicate parsing logic.** `cli.js` and `public/app.js` both parse JSONL. This is intentional so the browser can parse files client-side without a server round-trip. Keep them in sync.
- **OpenAI Responses API**, not Chat Completions. Uses `openai.responses.create()` with `input` array — not `messages`.
- **Static files served by Express.** `public/` is the web root. No build step — plain HTML/CSS/JS.
- **Retro UI theme.** Uses VT323 font and neon colors. Maintain the aesthetic when adding UI elements.
- **`minimal` mode** hides the tape deck and decorative elements; preference stored in `localStorage`.
