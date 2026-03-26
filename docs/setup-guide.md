# Setup Guide -- Step by Step

This guide walks you through setting up n8n AI Flow from scratch, including setting up n8n itself.

---

## Step 1: Set Up an n8n Instance

You need a running n8n instance. Pick one option:

### Option A: Local n8n with Docker (for testing)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_SECURE_COOKIE=false \
  --restart unless-stopped \
  n8nio/n8n
```

n8n will be at `http://localhost:5678`.

### Option B: n8n on a VPS (for production)

SSH into your server and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Run n8n
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_HOST=your-server-ip \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=http \
  -e N8N_SECURE_COOKIE=false \
  --restart unless-stopped \
  n8nio/n8n
```

Replace `your-server-ip` with your VPS IP address. n8n will be at `http://your-server-ip:5678`.

### Option C: n8n Cloud

Sign up at [n8n.io](https://n8n.io) and use your cloud URL (e.g. `https://your-name.app.n8n.cloud`).

---

## Step 2: Get Your n8n API Key

1. Open your n8n instance in a browser
2. Complete the initial setup (create account, set password)
3. Go to **Settings** (gear icon in the bottom left)
4. Click **API**
5. Click **Create API Key**
6. Copy the key -- you'll need it later

> If the API tab doesn't appear, your n8n version may be too old. Update to the latest version.

---

## Step 3: Get an OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy the key -- it starts with `sk-proj-...`
4. Make sure you have credits. Check billing at [https://platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)

> GPT-4o costs ~$2.50 per 1M input tokens and ~$10 per 1M output tokens. A typical workflow generation costs $0.005-$0.02.

---

## Step 4: Clone and Install

```bash
# Clone the repo
git clone git@github.com:vvnheksony-ux/n8n-flow-ai.git
cd n8n-flow-ai

# Install dependencies
npm install
```

---

## Step 5: Configure Environment

```bash
# Copy the example env file
cp .env.example .env.local

# Edit it with your OpenAI key
nano .env.local
```

Set your OpenAI API key:

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

Save and close the file.

---

## Step 6: Start the App

```bash
npm run dev
```

You should see:

```
▲ Next.js 16.2.1 (Turbopack)
- Local:  http://localhost:3000
✓ Ready in 650ms
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 7: Connect to n8n

1. You'll see the **Connect Your n8n** form
2. Enter your n8n host URL:
   - Local Docker: `http://localhost:5678`
   - VPS: `http://your-server-ip:5678`
   - n8n Cloud: `https://your-name.app.n8n.cloud`
3. Paste your n8n API key
4. Click **Test Connection** to verify
5. Click **Save & Connect**

> **Important**: Use `http://` for self-hosted instances without SSL. Use `https://` only if you have a proper certificate.

---

## Step 8: Start Using It

Try these commands:

```
Create a workflow that fetches data from an API every hour
```

```
List my workflows
```

```
Check all my workflows for issues
```

```
Delete workflow "Test Workflow"
```

---

## Step 9: Deploy for Others (Optional)

### Deploy to Vercel

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to your Vercel account
vercel login

# Deploy to production
vercel deploy --prod --yes

# Set the OpenAI API key as a secret
echo "sk-proj-your-key" | vercel env add OPENAI_API_KEY production

# Redeploy to pick up the secret
vercel deploy --prod --yes
```

Your app is now live at the URL Vercel gives you (e.g. `https://n8n-ai-flow.vercel.app`).

Share this URL with anyone -- they just need their own n8n host + API key to use it.

### Deploy with PM2 on a VPS

```bash
# On your server
git clone git@github.com:vvnheksony-ux/n8n-flow-ai.git
cd n8n-flow-ai
npm install
echo "OPENAI_API_KEY=sk-proj-your-key" > .env.local
npm run build

# Install PM2 for process management
npm install -g pm2

# Start the production server
pm2 start npm --name "n8n-ai-flow" -- start

# Auto-start on reboot
pm2 startup
pm2 save
```

The app runs on port 3000. Set up nginx or caddy as a reverse proxy for HTTPS.

---

## Troubleshooting

### "Failed to connect: fetch failed"
Your n8n instance is not reachable. Check:
- Is n8n running? `docker ps` to verify
- Is the port open? `curl http://your-ip:5678` from another machine
- Are you using `http://` not `https://`?

### "Connection failed: 401 Unauthorized"
Your API key is invalid. Go to n8n Settings > API and create a new one.

### "Error: Missing credentials. OPENAI_API_KEY"
You didn't set the OpenAI API key. Create `.env.local` with your key:
```bash
echo "OPENAI_API_KEY=sk-proj-your-key" > .env.local
```
Then restart the dev server.

### n8n shows "secure cookie" error
Add `-e N8N_SECURE_COOKIE=false` to your Docker run command. You need to recreate the container:
```bash
docker stop n8n && docker rm n8n
# Then run the docker command again with the extra flag
```

### Workflows created in n8n don't show up
The app auto-refreshes every 15 seconds. Send any message to trigger an immediate refresh.
