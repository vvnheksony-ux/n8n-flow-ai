'use client';

import { useState } from 'react';
import {
  Server,
  Workflow,
  Settings,
  ChevronRight,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { N8nConnection, Workflow as WorkflowType } from '@/lib/types';

interface SidebarProps {
  connection: N8nConnection | null;
  isConnected: boolean;
  workflows: WorkflowType[];
  onConnectClick: () => void;
  onWorkflowClick?: (wf: WorkflowType) => void;
}

export default function Sidebar({
  connection,
  isConnected,
  workflows,
  onConnectClick,
  onWorkflowClick,
}: SidebarProps) {
  const [activeSection, setActiveSection] = useState<'workflows' | 'settings'>('workflows');

  return (
    <aside className="w-64 bg-[#121212] border-r border-[#27272a] flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#10b981] rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-lg">n8n AI Flow</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 border-b border-[#27272a]">
        <button
          onClick={onConnectClick}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#1c1c1c] hover:bg-[#27272a] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-[#71717a]" />
            <div className="text-left">
              <div className="text-sm font-medium">n8n Instance</div>
              <div className="text-xs text-[#71717a]">
                {isConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>
          </div>
          {isConnected ? (
            <CheckCircle className="w-4 h-4 text-[#10b981]" />
          ) : (
            <XCircle className="w-4 h-4 text-[#ef4444]" />
          )}
        </button>

        {isConnected && connection && (
          <div className="mt-2 px-3 py-2 rounded bg-[#1c1c1c]">
            <div className="text-xs text-[#71717a] truncate">{connection.host}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-2">
          <button
            onClick={() => setActiveSection('workflows')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === 'workflows'
                ? 'bg-[#10b981]/10 text-[#10b981]'
                : 'text-[#a1a1aa] hover:bg-[#1c1c1c]'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Workflows</span>
            <span className="ml-auto text-xs text-[#52525b]">{workflows.length}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Workflow List */}
        {activeSection === 'workflows' && (
          <div className="ml-2 space-y-0.5">
            {workflows.length === 0 ? (
              <div className="text-xs text-[#71717a] px-3 py-2">No workflows yet</div>
            ) : (
              workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => onWorkflowClick?.(wf)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#a1a1aa] hover:bg-[#1c1c1c] cursor-pointer text-left group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wf.active ? 'bg-[#10b981]' : 'bg-[#71717a]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{wf.name}</div>
                    <div className="text-[10px] text-[#52525b] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      ID: {wf.id}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#27272a]">
        <button
          onClick={() => setActiveSection('settings')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeSection === 'settings'
              ? 'bg-[#10b981]/10 text-[#10b981]'
              : 'text-[#a1a1aa] hover:bg-[#1c1c1c]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
