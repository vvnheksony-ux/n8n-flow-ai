'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Sparkles,
  Trash2, Play, Pause, Pencil, AlertTriangle, Wrench,
} from 'lucide-react';
import type { ChatMessage } from '@/lib/types';
import WorkflowPreview from './WorkflowPreview';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onSendMessage: (message: string) => Promise<void>;
  onDeploy: (workflow: any) => Promise<void>;
  onUpdate: (workflowId: string, workflow: any) => Promise<void>;
  onDelete: (workflowId: string, workflowName: string) => Promise<void>;
  onToggleActive: (workflowId: string, active: boolean) => Promise<void>;
  isConnected: boolean;
  totalUsage: { tokens: number; cost: number };
}

export default function ChatInterface({
  messages,
  isProcessing,
  onSendMessage,
  onDeploy,
  onUpdate,
  onDelete,
  onToggleActive,
  isConnected,
  totalUsage,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState<Set<string>>(new Set());
  const [editedWorkflows, setEditedWorkflows] = useState<Map<string, any>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleCodeChange = (msgId: string, newCode: string) => {
    try {
      const parsed = JSON.parse(newCode);
      setEditedWorkflows(prev => new Map(prev).set(msgId, parsed));
    } catch {
      // Invalid JSON, ignore — user is still editing
    }
  };

  const getWorkflow = (msg: ChatMessage) => {
    return editedWorkflows.get(msg.id) || msg.actionData?.workflow;
  };

  const suggestions = [
    'Create a workflow that sends an email every morning',
    'List my workflows',
    'What can you do?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#27272a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#10b981]" />
            <h2 className="text-lg font-semibold">n8n AI Assistant</h2>
          </div>
          {totalUsage.tokens > 0 && (
            <div className="flex items-center gap-3 text-[11px] bg-[#1c1c1c] px-3 py-1.5 rounded-lg border border-[#27272a]">
              <span className="text-white">{totalUsage.tokens.toLocaleString()} <span className="text-[#71717a]">tokens</span></span>
              <span className="text-[#333]">|</span>
              <span className="text-white">${totalUsage.cost.toFixed(4)}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-[#71717a] mt-1">
          Create, edit, delete, and manage your n8n workflows
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-[#10b981]/30 mx-auto mb-4" />
            <p className="text-[#71717a] mb-2">What would you like to do?</p>
            <p className="text-sm text-[#52525b] mb-6">
              I can create, edit, delete, list, activate, and describe your workflows.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(''); onSendMessage(s); }}
                  className="text-xs px-3 py-2 rounded-lg bg-[#1c1c1c] border border-[#27272a] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {/* Message bubble */}
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-[#27272a]' : 'bg-[#10b981]/10'
                }`}>
                  {msg.role === 'user' ? (
                    <span className="text-sm">You</span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#10b981]" />
                  )}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`p-3 rounded-lg ${
                    msg.role === 'user' ? 'bg-[#27272a]' : 'bg-[#1c1c1c]'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>

              {/* Action-specific UI below the message */}
              {msg.role === 'assistant' && msg.action && msg.actionData && (
                <div className="ml-11 mt-2">
                  {/* CREATE: show workflow preview + deploy button */}
                  {msg.action === 'create' && msg.actionData.workflow && (
                    <WorkflowPreview
                      workflow={getWorkflow(msg)}
                      workflowCode={msg.actionData.workflowCode || JSON.stringify(msg.actionData.workflow, null, 2)}
                      onAction={() => onDeploy(getWorkflow(msg))}
                      actionLabel="Deploy"
                      actionIcon="deploy"
                      isProcessing={isProcessing}
                      onCodeChange={(code) => handleCodeChange(msg.id, code)}
                    />
                  )}

                  {/* EDIT: show updated workflow + update button */}
                  {msg.action === 'edit' && msg.actionData.workflow && msg.actionData.workflowId && (
                    <WorkflowPreview
                      workflow={getWorkflow(msg)}
                      workflowCode={msg.actionData.workflowCode || JSON.stringify(msg.actionData.workflow, null, 2)}
                      onAction={() => onUpdate(msg.actionData!.workflowId!, getWorkflow(msg))}
                      actionLabel="Apply Changes"
                      actionIcon="update"
                      isProcessing={isProcessing}
                      onCodeChange={(code) => handleCodeChange(msg.id, code)}
                    />
                  )}

                  {/* EDIT: workflow picker when multiple candidates */}
                  {msg.action === 'edit' && msg.actionData.candidates && !msg.actionData.workflow && (
                    <div className="space-y-1">
                      {msg.actionData.candidates.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onSendMessage(`Edit workflow "${c.name}" (ID: ${c.id})`)}
                          className="w-full text-left p-2 rounded-lg bg-[#1c1c1c] border border-[#27272a] hover:bg-[#27272a] transition-colors flex items-center gap-2"
                        >
                          <div className={`w-2 h-2 rounded-full ${c.active ? 'bg-[#10b981]' : 'bg-[#71717a]'}`} />
                          <span className="text-sm">{c.name}</span>
                          <span className="text-xs text-[#52525b] ml-auto">ID: {c.id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* DELETE: confirmation buttons */}
                  {msg.action === 'delete' && msg.actionData.workflowId && !msg.actionData.confirmed && (
                    <div className="flex gap-2 mt-1">
                      {!deleteConfirmed.has(msg.id) ? (
                        <>
                          <button
                            onClick={() => setDeleteConfirmed(prev => new Set(prev).add(msg.id))}
                            className="btn text-xs py-1 px-3 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20"
                          >
                            <Trash2 className="w-3 h-3" />
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => onSendMessage('No, cancel the delete.')}
                            className="btn btn-secondary text-xs py-1 px-3"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-[#eab308] text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            <span>This is permanent. Are you absolutely sure?</span>
                          </div>
                          <button
                            onClick={() => {
                              onDelete(msg.actionData!.workflowId!, msg.actionData!.workflowName || 'Unknown');
                              setDeleteConfirmed(prev => {
                                const next = new Set(prev);
                                next.delete(msg.id);
                                return next;
                              });
                            }}
                            disabled={isProcessing}
                            className="btn text-xs py-1 px-3 bg-[#ef4444] text-white hover:bg-[#dc2626]"
                          >
                            <Trash2 className="w-3 h-3" />
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmed(prev => {
                                const next = new Set(prev);
                                next.delete(msg.id);
                                return next;
                              });
                            }}
                            className="btn btn-secondary text-xs py-1 px-3"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* LIST: workflow table */}
                  {msg.action === 'list' && msg.actionData.workflows && msg.actionData.workflows.length > 0 && (
                    <div className="border border-[#27272a] rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#1c1c1c] text-[#71717a]">
                          <tr>
                            <th className="text-left p-2 font-medium">Status</th>
                            <th className="text-left p-2 font-medium">Name</th>
                            <th className="text-left p-2 font-medium">ID</th>
                            <th className="text-right p-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.actionData.workflows.map((wf) => (
                            <tr key={wf.id} className="border-t border-[#27272a] hover:bg-[#1c1c1c]">
                              <td className="p-2 w-8">
                                <span className={`block w-2.5 h-2.5 rounded-full ${wf.active ? 'bg-[#10b981]' : 'bg-[#71717a]'}`} />
                              </td>
                              <td className="p-2 text-[#ededed]">{wf.name}</td>
                              <td className="p-2 text-[#52525b] font-mono text-xs">{wf.id}</td>
                              <td className="p-2 text-right">
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => onSendMessage(`Edit workflow "${wf.name}" (ID: ${wf.id})`)}
                                    className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-white"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => onToggleActive(wf.id, !wf.active)}
                                    className="p-1 rounded hover:bg-[#27272a] text-[#71717a] hover:text-white"
                                    title={wf.active ? 'Deactivate' : 'Activate'}
                                  >
                                    {wf.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => onSendMessage(`Delete workflow "${wf.name}" (ID: ${wf.id})`)}
                                    className="p-1 rounded hover:bg-[#ef4444]/10 text-[#71717a] hover:text-[#ef4444]"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* AUDIT: results per workflow */}
                  {msg.action === 'audit' && msg.actionData.results && msg.actionData.results.length > 0 && (
                    <div className="space-y-2">
                      {/* Fix All button at top if there are issues */}
                      {msg.actionData.results.some(r => r.status !== 'ok') && (
                        <button
                          onClick={() => {
                            const broken = msg.actionData!.results!
                              .filter(r => r.status !== 'ok')
                              .map(r => `"${r.workflowName}" (ID: ${r.workflowId}): ${r.issues.join('; ')}`)
                              .join('\n');
                            onSendMessage(
                              `Fix all the issues you found. Here are the workflows with problems:\n${broken}\n\nFor each workflow, fetch it, fix the issues, and update it. Do them one at a time.`
                            );
                          }}
                          disabled={isProcessing}
                          className="w-full btn text-xs py-2 px-3 bg-[#ff6b35]/10 text-[#ff6b35] border border-[#ff6b35]/30 hover:bg-[#ff6b35]/20"
                        >
                          <Wrench className="w-3 h-3" />
                          Fix All Issues ({msg.actionData.results.filter(r => r.status !== 'ok').length} workflow{msg.actionData.results.filter(r => r.status !== 'ok').length !== 1 ? 's' : ''})
                        </button>
                      )}

                      {msg.actionData.results.map((r) => (
                        <div
                          key={r.workflowId}
                          className={`border rounded-lg overflow-hidden ${
                            r.status === 'error' ? 'border-[#ef4444]/40' :
                            r.status === 'warning' ? 'border-[#eab308]/40' :
                            'border-[#10b981]/40'
                          }`}
                        >
                          {/* Workflow header */}
                          <div className={`px-3 py-2 flex items-center justify-between ${
                            r.status === 'error' ? 'bg-[#ef4444]/5' :
                            r.status === 'warning' ? 'bg-[#eab308]/5' :
                            'bg-[#10b981]/5'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className={`block w-2.5 h-2.5 rounded-full ${
                                r.status === 'error' ? 'bg-[#ef4444]' :
                                r.status === 'warning' ? 'bg-[#eab308]' :
                                'bg-[#10b981]'
                              }`} />
                              <span className="text-sm font-medium text-[#ededed]">{r.workflowName}</span>
                              <span className="text-[10px] text-[#52525b] font-mono">{r.workflowId}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {r.status !== 'ok' && (
                                <button
                                  onClick={() => onSendMessage(
                                    `Fix the issues in workflow "${r.workflowName}" (ID: ${r.workflowId}). Issues: ${r.issues.join(', ')}. Fetch the workflow, fix these problems, and show me the updated version.`
                                  )}
                                  disabled={isProcessing}
                                  className="text-[11px] px-2 py-0.5 rounded bg-[#ff6b35]/10 text-[#ff6b35] hover:bg-[#ff6b35]/20 flex items-center gap-1"
                                >
                                  <Wrench className="w-3 h-3" />
                                  Fix
                                </button>
                              )}
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                                r.status === 'error' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                                r.status === 'warning' ? 'bg-[#eab308]/10 text-[#eab308]' :
                                'bg-[#10b981]/10 text-[#10b981]'
                              }`}>
                                {r.status === 'ok' ? 'PASS' : r.status.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Issues & suggestions */}
                          {(r.issues.length > 0 || r.suggestions.length > 0) && (
                            <div className="px-3 py-2 space-y-1.5 bg-[#121212]">
                              {r.issues.map((issue, i) => (
                                <div key={`i-${i}`} className="flex items-start gap-2 text-xs">
                                  <span className={`mt-0.5 ${
                                    r.status === 'error' ? 'text-[#ef4444]' : 'text-[#eab308]'
                                  }`}>
                                    {r.status === 'error' ? '✕' : '⚠'}
                                  </span>
                                  <span className="text-[#a1a1aa]">{issue}</span>
                                </div>
                              ))}
                              {r.suggestions.map((sug, i) => (
                                <div key={`s-${i}`} className="flex items-start gap-2 text-xs">
                                  <span className="text-[#10b981] mt-0.5">→</span>
                                  <span className="text-[#71717a]">{sug}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTIVATE/DEACTIVATE: confirm button */}
                  {(msg.action === 'activate' || msg.action === 'deactivate') && msg.actionData.workflowId && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => onToggleActive(
                          msg.actionData!.workflowId!,
                          msg.action === 'activate',
                        )}
                        disabled={isProcessing}
                        className={`btn text-xs py-1 px-3 ${
                          msg.action === 'activate'
                            ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/20'
                            : 'bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/30 hover:bg-[#eab308]/20'
                        }`}
                      >
                        {msg.action === 'activate' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {msg.action === 'activate' ? 'Activate Now' : 'Deactivate Now'}
                      </button>
                      <button
                        onClick={() => onSendMessage('Cancel')}
                        className="btn btn-secondary text-xs py-1 px-3"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-[#10b981]/10 rounded-lg flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[#10b981] animate-spin" />
            </div>
            <div className="bg-[#1c1c1c] p-3 rounded-lg">
              <p className="text-sm text-[#71717a]">Thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#27272a]">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? 'Create, edit, delete, list, activate workflows...' : 'Connect n8n first...'}
            disabled={!isConnected || isProcessing}
            className="input"
          />
          <button
            type="submit"
            disabled={!input.trim() || !isConnected || isProcessing}
            className="btn btn-primary px-4"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
