# Chat Commands Reference

The AI understands natural language. These are example phrases -- you don't need to use exact wording.

---

## Create Workflows

| Example | What It Does |
|---------|-------------|
| `Create a workflow that sends a Slack message every hour` | Generates workflow with Schedule Trigger + Slack node |
| `Build a workflow to fetch API data and save to Google Sheets` | HTTP Request + Google Sheets nodes |
| `Make a webhook that processes incoming data and sends email` | Webhook + Set + Gmail nodes |
| `Generate a workflow with an IF condition` | Includes conditional logic node |

After generating, you'll see:
- **Canvas view** -- visual node layout
- **JSON view** -- raw workflow code (editable)
- **Deploy button** -- pushes to your n8n instance

---

## List Workflows

| Example | What It Does |
|---------|-------------|
| `List my workflows` | Shows table with all workflows |
| `Show all workflows` | Same as above |
| `What workflows do I have?` | Same as above |

The table shows:
- Status dot (green = active, gray = inactive)
- Workflow name
- Workflow ID
- Action buttons: Edit, Activate/Deactivate, Delete

---

## Edit Workflows

| Example | What It Does |
|---------|-------------|
| `Edit my Slack workflow` | Fetches and shows the workflow for editing |
| `Edit workflow "Send Message to Telegram"` | Matches by name |
| `Edit workflow 9WTe4YoGUvLJbEUl` | Matches by ID |
| `Add a Code node to my Telegram workflow` | Fetches, modifies, shows preview |

If multiple workflows match your description, the AI shows a picker to choose which one.

The preview shows the real workflow from n8n. You can:
1. View it in Canvas or JSON mode
2. Click **Edit** in JSON mode to modify manually
3. Click **Apply Changes** to push updates to n8n

---

## Delete Workflows

| Example | What It Does |
|---------|-------------|
| `Delete workflow "Test Workflow"` | Asks for confirmation |
| `Delete workflow 9WTe4YoGUvLJbEUl` | Same, by ID |
| `Remove my old webhook workflow` | Fuzzy name matching |

Deletion requires **2 confirmations**:
1. Click **Yes, Delete**
2. Read warning "This is permanent", click **Confirm Delete**

---

## Audit / Check for Issues

| Example | What It Does |
|---------|-------------|
| `Check all my workflows for issues` | Full audit of every workflow |
| `Audit my workflows` | Same |
| `What's wrong with my workflows?` | Same |
| `Scan for problems` | Same |
| `Debug my workflows` | Same |

The audit checks for:
- Missing trigger nodes
- Workflows with only 1 node
- Nodes with empty parameters
- Active workflows with issues
- Disconnected nodes

Results show color-coded cards:
- **Red** = error (critical issues)
- **Yellow** = warning (potential problems)
- **Green** = pass (no issues)

Each card has:
- **Fix** button -- asks AI to fix that specific workflow
- **Fix All Issues** button -- fixes all broken workflows

---

## Activate / Deactivate

| Example | What It Does |
|---------|-------------|
| `Activate my Telegram workflow` | Shows warning + Activate button |
| `Turn on workflow "Daily Report"` | Same |
| `Deactivate workflow 9WTe4YoGUvLJbEUl` | Shows Deactivate button |
| `Pause my Slack notification workflow` | Same |
| `Stop workflow "API Monitor"` | Same |

> **Note**: Activating a workflow makes it run immediately based on its trigger. Make sure credentials are configured in n8n first.

---

## Describe / Explain

| Example | What It Does |
|---------|-------------|
| `What does my Telegram workflow do?` | Fetches and describes all nodes |
| `Explain workflow "Complex Workflow"` | Same |
| `Tell me about workflow 9WTe4YoGUvLJbEUl` | Same |

You can also click any workflow in the sidebar to ask about it.

---

## General Chat

| Example | What It Does |
|---------|-------------|
| `Hello` | Greeting |
| `What can you do?` | Lists capabilities |
| `What node types does n8n have?` | Answers n8n questions |
| `How do I set up a webhook?` | Explains n8n concepts |

---

## Tips

1. **Be specific** -- "Create a workflow with Schedule Trigger every 2 hours that calls https://api.example.com" works better than "make something"
2. **Use workflow names** -- "Edit my Telegram workflow" is clearer than "edit the one I made earlier"
3. **Use IDs for precision** -- Copy the ID from the list table if names are similar
4. **Check the canvas** -- Always review the generated workflow before deploying
5. **Edit JSON directly** -- Switch to JSON view, click Edit, modify parameters, then Deploy
