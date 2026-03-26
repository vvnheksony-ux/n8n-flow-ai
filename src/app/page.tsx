'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ConnectionForm from '@/components/ConnectionForm';
import ChatInterface from '@/components/ChatInterface';
import type { N8nConnection, Workflow, ChatMessage, ChatAction, ActionData, TokenUsage } from '@/lib/types';

export default function Home() {
  const [connection, setConnection] = useState<N8nConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConnectionForm, setShowConnectionForm] = useState(false);

  useEffect(() => {
    const savedConnection = localStorage.getItem('n8n_connection');
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection);
        setConnection(parsed);
        setIsConnected(true);
        fetchWorkflows(parsed.host, parsed.apiKey);
      } catch {
        localStorage.removeItem('n8n_connection');
      }
    }
  }, []);

  const fetchWorkflows = useCallback(async (host: string, apiKey: string): Promise<any[]> => {
    try {
      const res = await fetch('/api/n8n-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, apiKey }),
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setWorkflows(list);
        return list;
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
    return workflows;
  }, []);

  // Auto-refresh workflows every 15 seconds so manually created ones show up
  useEffect(() => {
    if (!connection || !isConnected) return;
    const interval = setInterval(() => {
      fetchWorkflows(connection.host, connection.apiKey);
    }, 15000);
    return () => clearInterval(interval);
  }, [connection, isConnected, fetchWorkflows]);

  // Fetch a single workflow's full details from n8n
  const fetchWorkflowById = async (workflowId: string): Promise<any | null> => {
    if (!connection) return null;
    try {
      const res = await fetch(
        `/api/workflow-action?host=${encodeURIComponent(connection.host)}&apiKey=${encodeURIComponent(connection.apiKey)}&workflowId=${encodeURIComponent(workflowId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        return data.workflow;
      }
    } catch { /* ignore */ }
    return null;
  };

  const handleConnect = async (newConnection: N8nConnection): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConnection),
      });

      const data = await res.json();

      if (res.ok) {
        setConnection(newConnection);
        setIsConnected(true);
        localStorage.setItem('n8n_connection', JSON.stringify(newConnection));

        if (data.workflows?.data) {
          setWorkflows(data.workflows.data);
        }

        setShowConnectionForm(false);
        return { success: true };
      }
      return { success: false, error: data.message || `Connection failed (${res.status})` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error — could not reach the server' };
    }
  };

  const [totalUsage, setTotalUsage] = useState({ tokens: 0, cost: 0 });

  const addMessage = (role: 'user' | 'assistant', content: string, action?: ChatAction, actionData?: ActionData, usage?: TokenUsage) => {
    const msg: ChatMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      role,
      content,
      action,
      actionData,
      usage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    if (usage) {
      setTotalUsage(prev => ({
        tokens: prev.tokens + usage.totalTokens,
        cost: prev.cost + usage.cost,
      }));
    }
    return msg;
  };

  // Fetch full details of all workflows (with nodes) for audit
  const fetchAllWorkflowDetails = async (): Promise<any[]> => {
    if (!connection) return workflows;
    const detailed = await Promise.all(
      workflows.map(async (wf) => {
        const full = await fetchWorkflowById(wf.id);
        return full || wf;
      })
    );
    return detailed;
  };

  // Detect if the message is an audit/check intent
  const isAuditIntent = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    const auditWords = ['check', 'audit', 'scan', 'review', 'issue', 'problem', 'wrong', 'debug',
      'troubleshoot', 'fix', 'diagnose', 'health', 'validate', 'inspect', 'analyze', 'analyse'];
    return auditWords.some(w => lower.includes(w));
  };

  const handleSendMessage = async (message: string) => {
    addMessage('user', message);
    setIsProcessing(true);

    try {
      // Refresh workflow list (don't let failure block the chat)
      let freshWorkflows = workflows;
      if (connection) {
        try {
          freshWorkflows = await fetchWorkflows(connection.host, connection.apiKey);
        } catch {
          // n8n unreachable — use cached list
        }
      }

      let workflowsToSend = freshWorkflows;
      if (isAuditIntent(message)) {
        try {
          workflowsToSend = await fetchAllWorkflowDetails();
        } catch {
          // Use what we have
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          workflows: workflowsToSend,
          history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
            action: m.action,
            actionData: m.actionData,
          })),
        }),
      });

      const data = await res.json();

      // If API returned an error, show it
      if (!res.ok) {
        addMessage('assistant', data.message || `Server error (${res.status})`, 'chat');
        setIsProcessing(false);
        return;
      }
      const action: ChatAction = data.action || 'chat';
      const actionData: ActionData = data.data || {};
      const usage: TokenUsage | undefined = data.usage;

      switch (action) {
        case 'create': {
          if (actionData.workflow) {
            actionData.workflowCode = JSON.stringify(actionData.workflow, null, 2);
          }
          addMessage('assistant', data.message, 'create', actionData, usage);
          break;
        }

        case 'edit': {
          // If AI identified a workflow but returned empty/no nodes, fetch the real one
          if (actionData.workflowId) {
            const realWorkflow = await fetchWorkflowById(actionData.workflowId);

            if (realWorkflow) {
              // If AI returned a modified workflow with nodes, use it
              // Otherwise show the current workflow for manual editing
              const hasAiChanges = actionData.workflow?.nodes?.length > 0;
              const workflowToShow = hasAiChanges ? actionData.workflow : {
                name: realWorkflow.name,
                nodes: realWorkflow.nodes || [],
                connections: realWorkflow.connections || {},
                settings: realWorkflow.settings || { executionOrder: 'v1' },
              };

              actionData.workflow = workflowToShow;
              actionData.workflowCode = JSON.stringify(workflowToShow, null, 2);
              actionData.workflowName = realWorkflow.name;

              const msg = hasAiChanges
                ? data.message
                : `Here's the current "${realWorkflow.name}" workflow with ${realWorkflow.nodes?.length || 0} nodes. You can edit it in Code view, or tell me what changes you'd like to make.`;

              addMessage('assistant', msg, 'edit', actionData);
            } else {
              addMessage('assistant', `Could not fetch workflow ${actionData.workflowId}. It may have been deleted.`, 'chat');
            }
          } else if (actionData.candidates) {
            // Multiple matches — show picker
            addMessage('assistant', data.message, 'edit', actionData, usage);
          } else {
            addMessage('assistant', data.message, 'chat', undefined, usage);
          }
          break;
        }

        case 'delete': {
          addMessage('assistant', data.message, 'delete', actionData, usage);
          break;
        }

        case 'list': {
          if (!actionData.workflows || actionData.workflows.length === 0) {
            actionData.workflows = workflows.map(w => ({
              id: w.id,
              name: w.name,
              active: w.active,
              nodes: w.nodes,
              connections: w.connections,
            }));
          }
          addMessage('assistant', data.message, 'list', actionData, usage);
          break;
        }

        case 'audit': {
          addMessage('assistant', data.message, 'audit', actionData, usage);
          break;
        }

        case 'activate':
        case 'deactivate': {
          addMessage('assistant', data.message, action, actionData, usage);
          break;
        }

        case 'describe': {
          if (actionData.workflowId && connection) {
            const wf = await fetchWorkflowById(actionData.workflowId);
            if (wf) {
              const nodeList = wf.nodes?.map((n: any) => `  - ${n.name} (${n.type?.replace('n8n-nodes-base.', '')})`).join('\n') || 'No nodes';
              const desc = `**${wf.name}** (ID: ${wf.id}) — ${wf.active ? 'Active' : 'Inactive'}\n\n${data.message}\n\nNodes (${wf.nodes?.length || 0}):\n${nodeList}`;
              addMessage('assistant', desc, 'describe', actionData);
              break;
            }
          }
          addMessage('assistant', data.message, 'describe', actionData, usage);
          break;
        }

        default: {
          addMessage('assistant', data.message, 'chat', undefined, usage);
          break;
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const detail = error?.message || 'Unknown error';
      addMessage('assistant', `Something went wrong: ${detail}\n\nPossible causes:\n- Your n8n instance may not be reachable from the internet\n- The OpenAI API key on the server may be invalid\n- Your n8n API key may have expired`, 'chat');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeploy = async (workflow: any) => {
    if (!connection) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/deploy-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connection.host,
          apiKey: connection.apiKey,
          workflow,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addMessage('assistant', `Workflow "${data.workflowName}" deployed successfully! (ID: ${data.workflowId})\n\nOpen it in n8n to configure credentials and activate it.`);
        fetchWorkflows(connection.host, connection.apiKey);
      } else {
        addMessage('assistant', `Failed to deploy: ${data.message}`);
      }
    } catch {
      addMessage('assistant', 'Failed to deploy workflow.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = async (workflowId: string, workflow: any) => {
    if (!connection) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/workflow-action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connection.host,
          apiKey: connection.apiKey,
          workflowId,
          workflow,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addMessage('assistant', `Workflow "${data.workflowName}" updated successfully!`);
        fetchWorkflows(connection.host, connection.apiKey);
      } else {
        addMessage('assistant', `Failed to update: ${data.message}`);
      }
    } catch {
      addMessage('assistant', 'Failed to update workflow.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (workflowId: string, workflowName: string) => {
    if (!connection) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/workflow-action', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connection.host,
          apiKey: connection.apiKey,
          workflowId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addMessage('assistant', `Workflow "${workflowName}" has been deleted.`);
        fetchWorkflows(connection.host, connection.apiKey);
      } else {
        addMessage('assistant', `Failed to delete: ${data.message}`);
      }
    } catch {
      addMessage('assistant', 'Failed to delete workflow.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (workflowId: string, active: boolean) => {
    if (!connection) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/workflow-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: connection.host,
          apiKey: connection.apiKey,
          workflowId,
          active,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        addMessage('assistant', `Workflow "${data.workflowName}" is now ${data.active ? 'active' : 'inactive'}.`);
        fetchWorkflows(connection.host, connection.apiKey);
      } else {
        addMessage('assistant', `Failed: ${data.message}`);
      }
    } catch {
      addMessage('assistant', 'Failed to update workflow state.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWorkflowClick = (wf: Workflow) => {
    handleSendMessage(`Tell me about workflow "${wf.name}" (ID: ${wf.id})`);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        connection={connection}
        isConnected={isConnected}
        workflows={workflows}
        onConnectClick={() => setShowConnectionForm(!showConnectionForm)}
        onWorkflowClick={handleWorkflowClick}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {showConnectionForm || !isConnected ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-lg">
              <ConnectionForm
                onConnect={handleConnect}
                isConnected={isConnected}
              />
            </div>
          </div>
        ) : (
          <ChatInterface
            messages={messages}
            isProcessing={isProcessing}
            onSendMessage={handleSendMessage}
            onDeploy={handleDeploy}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            isConnected={isConnected}
            totalUsage={totalUsage}
          />
        )}
      </main>
    </div>
  );
}
