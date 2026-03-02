# Agent Architecture

## Overview

Canaloni's AI Agent layer enables conversational booking and reservation workflows for locations on the map. The agent operates within a session model: a user triggers a session for a specific location and action, and the agent handles multi-turn conversation to complete the task.

## Session Lifecycle

```
User triggers action (e.g. "Reserve table at Osteria del Tempo Perso")
    ↓
POST /api/agent/book → creates agent_session (status: "initiated")
    ↓
Agent orchestrates conversation (Claude API — pending integration)
    ↓
Session status: "in_progress" → "completed" | "failed"
    ↓
Result returned to user
```

## Supported Action Types

| action_type    | Description                     |
|---------------|---------------------------------|
| reserve_table  | Book a restaurant reservation   |
| book_hotel     | Hotel booking flow              |
| buy_ticket     | Ticket purchase (museum, event) |

## Data Model

### `agent_sessions` table

```sql
id                uuid PRIMARY KEY
user_id           uuid → auth.users
location_id       uuid → locations (nullable if deleted)
action_type       text (reserve_table | book_hotel | buy_ticket)
status            text (initiated | in_progress | completed | failed)
conversation_history  jsonb   -- array of {role, content} messages
preferences       jsonb   -- user preferences passed at session creation
created_at        timestamptz
```

### `locations.agent_capable` column

`boolean DEFAULT false` — set to `true` for locations that support AI booking. Future UI will show a "Book with AI" button only for agent-capable locations.

## Future Claude API Integration

When integrating the Claude API, each agent turn will:

1. Load the `agent_session` by ID (verifying ownership)
2. Append the user message to `conversation_history`
3. Call `claude-opus-4-6` (or `claude-sonnet-4-6`) with:
   - System prompt describing the booking task + location details
   - Full `conversation_history`
   - Tool definitions: `search_availability`, `confirm_booking`, `send_confirmation_email`
4. Append Claude's response + any tool results to `conversation_history`
5. Update `status` and return the assistant turn to the client

## Row-Level Security

- `SELECT`: users can only read their own sessions
- `INSERT`: users can only create sessions for themselves

## Required Environment Variables

| Variable                  | Used In                         |
|--------------------------|----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | All Supabase clients         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Client-side queries          |
| `SUPABASE_SERVICE_ROLE_KEY`    | Server-side admin operations |
| `ANTHROPIC_API_KEY`           | Future Claude API calls       |

## SQL Migrations to Run

See `shared/supabase/migrations/005_agent_infrastructure.sql` for the full migration.
