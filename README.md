# n8n AI Flow

An AI-powered web UI for managing n8n workflows through natural language. Type what you want to automate and the AI creates, edits, deletes, audits, and deploys workflows directly to your n8n instance.

**Live Demo**: [https://n8n-ai-flow.vercel.app](https://n8n-ai-flow.vercel.app)

## What It Does

Connect your n8n instance (self-hosted or cloud), then chat with the AI assistant:

- **"Create a workflow that sends a Slack message every morning at 9 AM"** -- generates the workflow JSON and deploys it to n8n with one click
- **"List my workflows"** -- shows all workflows with status, edit, activate, and delete buttons
- **"Edit my Telegram workflow"** -- fetches the real workflow from n8n, shows it in a visual canvas, lets you modify and push changes
- **"Delete workflow X"** -- asks for confirmation twice before deleting
- **"Check all my workflows for issues"** -- audits every workflow, reports missing triggers, empty parameters, and suggests fixes
- **"Activate workflow X"** -- toggles workflow on/off with safety warnings

## Screenshots

### Chat Interface
The main chat where you talk to the AI. It understands natural language and routes to the right action.

### Visual Canvas Preview
n8n-style dark canvas with draggable nodes, bezier connection curves, and color-coded icons. Click the expand button to go fullscreen.

### Audit Results
Color-coded health check cards (red/yellow/green) per workflow with specific issues and one-click fix buttons.

---

## Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **npm** 9 or higher
- An **n8n instance** (self-hosted or cloud) with API access enabled
- An **OpenAI API key** (GPT-4o)

### 1. Clone the repo

```bash
git clone git@github.com:vvnheksony-ux/n8n-flow-ai.git
cd n8n-flow-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

```bash
cp .env.example .env.local
```

Edit `.env.local` with your keys:

```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
```

> **Note**: The n8n host URL and API key are entered in the browser UI, not in the env file. Only the OpenAI key needs to be on the server.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Connect your n8n

1. Open the app in your browser
2. Enter your n8n host URL (e.g. `http://your-server:5678`)
3. Enter your n8n API key (Settings > API > Create API Key in n8n)
4. Click **Save & Connect**

> **Important**: Use `http://` not `https://` if your n8n doesn't have a proper SSL certificate.

---

## Getting Your n8n API Key

1. Open your n8n instance in a browser
2. Go to **Settings** (gear icon, bottom left)
3. Click **API**
4. Click **Create API Key**
5. Copy the key -- it starts with `eyJhbG...`

If you see "API is not enabled", you need to set the environment variable `N8N_PUBLIC_API_DISABLED=false` on your n8n instance.

---

## Deploy to Production

### Option A: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (from inside the project directory)
vercel deploy --prod --yes
```

After the first deploy, set your OpenAI API key:

```bash
# Set the secret
echo "sk-proj-your-key-here" | vercel env add OPENAI_API_KEY production

# Redeploy to pick it up
vercel deploy --prod --yes
```

Your app will be live at `https://your-project.vercel.app`.

### Option B: Deploy with Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public

ENV OPENAI_API_KEY=your-key-here
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t n8n-ai-flow .
docker run -p 3000:3000 -e OPENAI_API_KEY=sk-proj-your-key n8n-ai-flow
```

### Option C: Deploy on a VPS

```bash
# SSH into your server
ssh user@your-server

# Clone the repo
git clone git@github.com:vvnheksony-ux/n8n-flow-ai.git
cd n8n-flow-ai

# Install dependencies
npm install

# Create env file
echo "OPENAI_API_KEY=sk-proj-your-key-here" > .env.local

# Build for production
npm run build

# Start the server (use pm2 for persistence)
npm install -g pm2
pm2 start npm --name "n8n-ai-flow" -- start

# The app runs on port 3000
# Set up nginx/caddy as reverse proxy for HTTPS
```

---

## Features in Detail

### Smart Intent Detection

The AI understands natural language and routes to the correct action:

| You say | AI does |
|---------|---------|
| "create a workflow that...", "build...", "make..." | Generates workflow JSON + Deploy button |
| "edit my Slack workflow", "update workflow 123" | Fetches workflow from n8n, shows preview + Apply Changes |
| "delete workflow X", "remove..." | Shows 2-step confirmation before deleting |
| "list my workflows", "show all" | Table with status dots + action buttons per row |
| "check issues", "audit", "what's wrong" | Fetches all workflows, analyzes each, shows health report |
| "activate workflow X", "turn on..." | Warning + Activate button |
| "deactivate...", "pause...", "turn off..." | Deactivate button |
| "what does workflow X do?", "describe..." | Fetches workflow and lists all nodes |
| General questions, "hello" | Responds conversationally |

### Visual Canvas Preview

- Dark dot-grid background matching n8n's canvas
- Draggable node cards with colored icons per type
- Bezier connection curves drawn from the actual workflow connections
- Click expand button for fullscreen mode (press Esc to close)
- Toggle between Canvas view and JSON code view
- Edit JSON inline, then deploy/update

### Workflow Audit

Say "check all my workflows for issues" and the AI:

1. Fetches full node data for every workflow from n8n
2. Analyzes each for common issues:
   - No trigger node (workflow can't start)
   - Only 1 node (does nothing useful)
   - Empty parameters (not configured)
   - Missing credentials
   - Disconnected nodes
3. Shows color-coded results: red (error), yellow (warning), green (pass)
4. **Fix** button per workflow -- AI generates the fix
5. **Fix All Issues** button -- fixes all broken workflows

### Token Usage Tracking

The header shows your session's total OpenAI token usage and cost in real-time. GPT-4o pricing: $2.50/1M input, $10/1M output.

### Auto-Refresh

Workflow list refreshes every 15 seconds and before every chat message, so workflows created manually in n8n appear automatically.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts              # Smart AI router -- intent detection + GPT-4o
│   │   ├── deploy-workflow/route.ts    # POST new workflow to n8n
│   │   ├── n8n-proxy/route.ts         # Proxy for listing workflows (avoids CORS)
│   │   ├── test-connection/route.ts    # Test n8n connectivity
│   │   └── workflow-action/route.ts    # Edit (PUT), delete (DELETE), activate (POST), get (GET)
│   ├── globals.css                     # Dark theme styles
│   ├── layout.tsx                      # Root layout
│   └── page.tsx                        # Main page -- state management + action handlers
├── components/
│   ├── ChatInterface.tsx               # Chat UI with messages, action buttons, audit cards
│   ├── ConnectionForm.tsx              # n8n host + API key form
│   ├── Sidebar.tsx                     # Workflow list with click-to-describe
│   └── WorkflowPreview.tsx             # n8n-style canvas + JSON editor + fullscreen
└── lib/
    ├── n8n-fetch.ts                    # Fetch wrapper (edge-compatible)
    └── types.ts                        # TypeScript types (ChatAction, ActionData, TokenUsage)
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | Smart AI router -- receives message + workflows + history, returns action + data |
| `/api/deploy-workflow` | POST | Creates a new workflow on n8n |
| `/api/n8n-proxy` | POST | Proxies workflow list requests to n8n (avoids browser CORS) |
| `/api/test-connection` | POST | Tests connectivity to n8n instance |
| `/api/workflow-action` | GET | Fetches a single workflow's full details |
| `/api/workflow-action` | PUT | Updates an existing workflow |
| `/api/workflow-action` | DELETE | Deletes a workflow |
| `/api/workflow-action` | POST | Activates or deactivates a workflow |

---

## Environment Variables

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `OPENAI_API_KEY` | Yes | Server (.env.local or Vercel secret) | Your OpenAI API key for GPT-4o |

The n8n host URL and API key are entered by each user in the browser -- they're stored in `localStorage`, never sent to the server except when proxying API calls.

---

## Tech Stack

- **Next.js 16** -- React framework with App Router and API routes
- **React 19** -- UI rendering
- **Tailwind CSS 4** -- Styling (dark theme)
- **OpenAI GPT-4o** -- AI intent detection and workflow generation
- **Lucide React** -- Icons
- **Vercel** -- Hosting (free tier works)

---

## Common Issues

### "Failed to connect: fetch failed"
- Make sure you're using `http://` not `https://` if your n8n doesn't have SSL
- Check that your n8n instance is accessible from the internet (not behind a firewall)

### "Connection failed: 401"
- Your API key is wrong or expired. Generate a new one in n8n Settings > API

### Workflow not showing after manual creation
- The app auto-refreshes every 15 seconds. Wait a moment or send any chat message to trigger a refresh.

### "Workflow cannot be activated because it has no trigger node"
- n8n requires at least one trigger node (Schedule, Webhook, Manual Trigger, etc.) to activate a workflow

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes
4. Test locally: `npm run dev`
5. Push and create a PR

---

## License

MIT
