# n8n AI Flow — What Was Built

## Overview
A web UI that lets you type in plain English what you want to automate, and it creates, edits, deletes, and manages n8n workflows on your connected instance.

**Stack**: Next.js 16 + React 19 + Tailwind CSS + OpenAI GPT-4o
**URL**: http://localhost:3000 (run `npm run dev` inside `n8n-ai-flow/`)

---

## Session 1: Fix Broken App

The `n8n-ai-flow/` Next.js app existed but was completely broken.

### Issues Fixed
1. **Deploy route was a stub** — `deploy-workflow/route.ts` ignored the AI-generated code and always deployed a hardcoded "Schedule Trigger + NoOp" workflow. Fixed to use the actual AI-generated JSON.
2. **Generate route produced TypeScript that deploy couldn't use** — AI generated decorator-based TypeScript but nothing compiled it to n8n JSON. Changed system prompt to generate valid n8n workflow JSON directly.
3. **CORS issue** — `page.tsx` called the n8n instance directly from the browser (`fetch(host/rest/workflows)`), which failed due to CORS. Created `/api/n8n-proxy` to route all n8n API calls through the Next.js backend.
4. **Wrong API endpoint** — Used `/rest/workflows` (internal n8n UI endpoint) instead of `/api/v1/workflows` (official API). Fixed in all routes.
5. **Self-signed HTTPS certs rejected** — Node.js `fetch` rejected the n8n instance's self-signed cert. Added `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env.local` and created `src/lib/n8n-fetch.ts` helper with a custom HTTPS agent.
6. **n8n API rejects `active` field** — The create workflow API returned `"request/body/active is read-only"`. Removed `active` from the deploy payload.
7. **Layout metadata** — Title was "Create Next App". Changed to "n8n AI Flow".

### Files Modified
- `src/app/api/generate-workflow/route.ts` — rewrote system prompt for JSON output
- `src/app/api/deploy-workflow/route.ts` — use actual AI-generated JSON, removed `active` field
- `src/app/api/test-connection/route.ts` — fixed API endpoint to `/api/v1/workflows`
- `src/app/api/n8n-proxy/route.ts` — **new** proxy route to avoid CORS
- `src/app/page.tsx` — fixed `fetchWorkflows` to use proxy, fixed deploy flow
- `src/app/layout.tsx` — fixed metadata
- `src/lib/n8n-fetch.ts` — **new** fetch wrapper for self-signed certs
- `.env.local` — updated API key, added `NODE_TLS_REJECT_UNAUTHORIZED=0`

---

## Session 2: Smart AI Assistant + Visual Preview

Upgraded from a simple "generate workflow" chat to a full workflow management assistant.

### Smart AI Router (`/api/chat`)
Replaced the single-purpose `/api/generate-workflow` with a smart `/api/chat` endpoint that:
- Receives the user message + current workflow list + conversation history (last 10 messages)
- Uses GPT-4o to classify intent and return structured JSON: `{ action, message, data }`
- Supports 8 actions: `create`, `edit`, `delete`, `list`, `activate`, `deactivate`, `describe`, `chat`

### Supported Actions
| Action | Example | What happens |
|--------|---------|-------------|
| `create` | "make a workflow that sends emails every hour" | Generates n8n JSON, shows visual preview + Deploy button |
| `edit` | "edit my Slack workflow" | Asks which one if ambiguous, generates updated JSON + Apply Changes button |
| `delete` | "delete workflow X" | Shows confirmation, requires 2 clicks (Yes Delete → Are you absolutely sure? → Confirm Delete) |
| `list` | "show my workflows" | Shows table with status, name, ID, and edit/activate/delete buttons per row |
| `activate` | "activate workflow X" | Shows warning + Activate Now button |
| `deactivate` | "pause workflow X" | Shows Deactivate Now button |
| `describe` | "what does workflow X do?" | Fetches workflow from n8n and describes its nodes |
| `chat` | "hello", "what can you do?" | Responds conversationally |

### Visual Workflow Preview (`WorkflowPreview.tsx`)
- **Nodes view**: Colored node cards with icons based on type:
  - Triggers (schedule, manual) = amber
  - HTTP/webhook = blue
  - Messaging (Slack, Discord, Telegram) = pink
  - Email (Gmail) = red
  - Database (Sheets, Airtable, Postgres) = green
  - Code/Function = purple
  - Logic (If, Switch) = yellow
  - Set/Config = gray
- Shows key parameters (operation, URL, channel, interval, etc.)
- Shows connection arrows between nodes
- **Code view**: Raw JSON with Edit button for inline modifications
- **Toggle**: Switch between Nodes/Code with one click
- **Inline editing**: Click Edit → modify JSON (add credentials, change params) → Apply → Deploy/Update

### Workflow Action API (`/api/workflow-action`)
Single endpoint handling all workflow mutations:
- `DELETE` — delete a workflow by ID
- `PUT` — update/edit a workflow by ID
- `POST` — activate or deactivate a workflow
- `GET` — fetch a single workflow's full details

### Sidebar Improvements
- Click any workflow to ask the AI about it
- Hover to reveal workflow ID
- Shows total workflow count badge

### Interactive Chat Elements
- Suggestion chips on empty state ("Create a workflow that...", "List my workflows", "What can you do?")
- Deploy/Apply Changes buttons on generated workflows
- Workflow picker dropdown when edit matches multiple workflows
- Two-step delete confirmation with warning icon
- Activate/Deactivate buttons with cancel option
- Workflow table with inline action buttons (edit, toggle active, delete)

### Files Created
- `src/app/api/chat/route.ts` — smart AI router endpoint
- `src/app/api/workflow-action/route.ts` — CRUD operations for workflows
- `src/components/WorkflowPreview.tsx` — visual node preview with code editing

### Files Modified
- `src/lib/types.ts` — added `ChatAction`, `ActionData` types
- `src/app/page.tsx` — full rewrite with smart routing, deploy/update/delete/activate handlers
- `src/components/ChatInterface.tsx` — full rewrite with action buttons, workflow table, confirmations, WorkflowPreview integration
- `src/components/Sidebar.tsx` — added click-to-describe, hover ID, workflow count

### Files Removed
- `src/app/api/generate-workflow/route.ts` — replaced by `/api/chat`

---

## Project Structure (n8n-ai-flow/)

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts           # Smart AI router (intent detection + response)
│   │   ├── deploy-workflow/route.ts # POST workflow to n8n
│   │   ├── n8n-proxy/route.ts      # Proxy for listing workflows (avoids CORS)
│   │   ├── test-connection/route.ts # Test n8n connection
│   │   └── workflow-action/route.ts # Edit, delete, activate/deactivate workflows
│   ├── layout.tsx
│   ├── page.tsx                     # Main page with state management
│   └── globals.css
├── components/
│   ├── ChatInterface.tsx            # Chat UI with action buttons
│   ├── ConnectionForm.tsx           # n8n host + API key form
│   ├── Sidebar.tsx                  # Workflow list sidebar
│   └── WorkflowPreview.tsx          # Visual node cards + code editor
└── lib/
    ├── n8n-fetch.ts                 # Fetch wrapper for self-signed certs
    └── types.ts                     # TypeScript types
```

---

## Session 3: Bug Fixes

### Issues Fixed
1. **Edit showed 0 nodes / empty workflow** — When user said "edit workflow X", the AI didn't have the actual workflow content (nodes, connections). Fixed: `page.tsx` now fetches the full workflow from n8n via `/api/workflow-action` GET before showing the preview. If the AI returned modifications, those are used; otherwise the real workflow is shown for manual editing.
2. **Update failed with "must have required property 'name'"** — The edit returned empty data, so the PUT request had no name. Fixed: `workflow-action` PUT route now validates that `name` exists before sending to n8n.
3. **List table showed no status dots** — The status indicator dot was invisible due to `inline-block` on a zero-content div. Fixed: changed to `block` with explicit width on the table cell.
4. **Activate errors not actionable** — Workflows without triggers or missing credentials can't be activated. Error messages from n8n are now shown directly to the user.

### Files Modified
- `src/app/page.tsx` — edit handler now fetches real workflow from n8n before displaying
- `src/app/api/workflow-action/route.ts` — added `name` validation on PUT
- `src/components/ChatInterface.tsx` — fixed status dot in list table

---

## Session 4: n8n-style Canvas Preview + Audit with Auto-Fix

### Canvas Node Preview
Replaced the SVG-based preview with an interactive n8n-style canvas:
- **Dark dot-grid background** matching n8n's canvas aesthetic
- **Draggable node cards** — click and drag nodes to rearrange them
- **Node cards styled like n8n** — rounded cards with colored icon circles, node name, subtitle (operation/URL/schedule), category label, and status dot
- **Bezier connection curves** with orange arrows and input/output port circles
- **Click to select** — selected nodes get orange border glow
- **Color-coded icons** per node type (triggers=orange, HTTP=blue, messaging=pink, databases=green, code=green, logic=amber, etc.)
- **Auto-layout** from workflow position data or sequential fallback
- **Canvas/JSON toggle** preserved with inline code editing

### Smart Audit System
- **New `audit` action** — AI now understands "check", "audit", "scan", "review", "what's wrong", "debug", "troubleshoot", etc.
- **Full workflow fetching** — when audit is triggered, frontend fetches complete node data for every workflow before sending to AI
- **Enriched workflow context** — AI now sees node names, types, and pre-computed issues (no trigger, empty params, single node) for each workflow
- **Per-workflow audit cards** — color-coded (red=error, yellow=warning, green=pass) with specific issues and fix suggestions
- **Fix button per workflow** — click "Fix" on any workflow to ask the AI to fetch it, fix the issues, and show the updated version
- **Fix All Issues button** — one click to fix all broken workflows sequentially
- **Intent detection rules** — explicit rules prevent AI from confusing "check issues" with "list workflows"

### Files Created/Modified
- `src/components/WorkflowPreview.tsx` — full rewrite with interactive canvas
- `src/app/api/chat/route.ts` — added audit action, enriched workflow context with node data
- `src/lib/types.ts` — added `audit` action type, `results` field
- `src/app/page.tsx` — added `fetchAllWorkflowDetails()`, `isAuditIntent()` detection, audit case handler
- `src/components/ChatInterface.tsx` — added audit results rendering with Fix/Fix All buttons

---

## Configuration
- `.env.local` — N8N_HOST, N8N_API_KEY, OPENAI_API_KEY, NODE_TLS_REJECT_UNAUTHORIZED=0
