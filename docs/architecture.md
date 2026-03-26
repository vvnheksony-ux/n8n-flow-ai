# Architecture

## How It Works

```
Browser (React)                    Next.js API Routes                  External
+------------------+              +---------------------+             +----------+
|                  |  /api/chat   |                     |   GPT-4o    |          |
|  ChatInterface   | ----------> |  chat/route.ts      | ---------> |  OpenAI  |
|                  | <---------- |  (intent detection)  | <--------- |          |
|                  |              |                     |             +----------+
|  WorkflowPreview |  /api/*     |  workflow-action/   |   REST API  +----------+
|                  | ----------> |  deploy-workflow/   | ---------> |          |
|  Sidebar         | <---------- |  n8n-proxy/         | <--------- |  n8n     |
|                  |              |  test-connection/   |             |          |
+------------------+              +---------------------+             +----------+
```

### Why Proxy Through Next.js?

The browser can't call the n8n API directly because:
1. **CORS** -- n8n doesn't set `Access-Control-Allow-Origin` headers for browser requests
2. **Self-signed certs** -- browsers block `fetch()` to HTTPS with invalid certificates
3. **API key safety** -- the n8n API key is sent from the browser to our backend, then forwarded to n8n. It never goes to a third-party.

### Request Flow for Each Action

#### Create Workflow
```
User types "create a workflow that..."
  --> page.tsx: handleSendMessage()
    --> POST /api/chat { message, workflows, history }
      --> GPT-4o: classifies intent as "create", generates workflow JSON
    <-- { action: "create", data: { workflow: {...} } }
  --> ChatInterface shows WorkflowPreview with Deploy button
  --> User clicks Deploy
    --> POST /api/deploy-workflow { host, apiKey, workflow }
      --> POST n8n/api/v1/workflows { name, nodes, connections, settings }
    <-- { workflowId, workflowName }
```

#### Edit Workflow
```
User types "edit my Slack workflow"
  --> POST /api/chat (AI identifies which workflow)
  <-- { action: "edit", data: { workflowId: "abc" } }
  --> page.tsx: fetchWorkflowById("abc") -- GET /api/workflow-action?workflowId=abc
  <-- Full workflow JSON with all nodes
  --> ChatInterface shows WorkflowPreview with Apply Changes button
  --> User edits JSON or asks AI to modify
  --> PUT /api/workflow-action { workflowId, workflow }
    --> PUT n8n/api/v1/workflows/abc
```

#### Audit Workflows
```
User types "check all my workflows"
  --> page.tsx: isAuditIntent() returns true
  --> fetchAllWorkflowDetails() -- fetches each workflow's full nodes
  --> POST /api/chat { message, workflows: [full details], history }
    --> GPT-4o analyzes each workflow for issues
  <-- { action: "audit", data: { results: [...] } }
  --> ChatInterface shows audit cards with Fix buttons
```

---

## File Responsibilities

### `src/app/page.tsx` -- State Manager
- Manages all app state: connection, workflows, messages, processing flags
- Handles all user actions: send message, deploy, update, delete, activate
- Fetches workflow details from n8n when needed
- Auto-refreshes workflow list every 15 seconds
- Routes AI responses to the correct handler

### `src/app/api/chat/route.ts` -- AI Brain
- Builds the system prompt with current workflow list and node data
- Sends conversation history for multi-turn context
- GPT-4o classifies intent and returns structured JSON
- Calculates token usage and cost per request

### `src/components/ChatInterface.tsx` -- UI Renderer
- Renders chat messages with role-based styling
- Renders action-specific UI: Deploy buttons, workflow tables, audit cards, delete confirmations
- Handles fullscreen preview toggle
- Shows session token usage in header

### `src/components/WorkflowPreview.tsx` -- Canvas Engine
- Parses workflow JSON into visual node layout
- Draws bezier connection curves from actual workflow connections
- Supports node dragging, selection, fullscreen mode
- Toggle between Canvas and JSON code view
- Inline JSON editing with Apply/Cancel

### `src/app/api/workflow-action/route.ts` -- CRUD Proxy
- GET: Fetch a single workflow by ID
- PUT: Update a workflow (validates `name` is present)
- DELETE: Delete a workflow by ID
- POST: Activate or deactivate a workflow

---

## Data Flow

### Where Data Lives

| Data | Stored Where | Lifetime |
|------|-------------|----------|
| n8n host + API key | Browser `localStorage` | Until user clears browser |
| OpenAI API key | Server `.env.local` / Vercel secret | Permanent on server |
| Workflow list | React state (refreshed from n8n) | Per browser session |
| Chat messages | React state | Per browser session |
| Token usage | React state | Per browser session |
| Actual workflows | n8n instance | Permanent |

### What Goes Where

| Request | What's Sent | To Where |
|---------|------------|----------|
| `/api/chat` | User message + workflow names/IDs + history | OpenAI (GPT-4o) |
| `/api/deploy-workflow` | Workflow JSON + n8n credentials | Your n8n instance |
| `/api/n8n-proxy` | n8n credentials | Your n8n instance |
| `/api/test-connection` | n8n credentials | Your n8n instance |
| `/api/workflow-action` | n8n credentials + workflow data | Your n8n instance |

> **Privacy**: Workflow node data is sent to OpenAI for AI processing. If this is a concern, consider self-hosting an LLM.

---

## Token Cost Breakdown

GPT-4o pricing (as of 2025):
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

Typical costs per action:
| Action | Input Tokens | Output Tokens | Cost |
|--------|-------------|--------------|------|
| Simple chat | ~1,500 | ~100 | ~$0.005 |
| Create workflow | ~2,000 | ~800 | ~$0.013 |
| List workflows | ~1,500 | ~200 | ~$0.006 |
| Audit (4 workflows) | ~3,000 | ~500 | ~$0.013 |
| Edit workflow | ~2,500 | ~600 | ~$0.012 |

A typical session of 20 messages costs about $0.10-$0.20.
