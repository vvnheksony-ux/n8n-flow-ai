'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Copy, Check, Rocket, Pencil, Code, LayoutGrid, Maximize2, X } from 'lucide-react';

interface WorkflowPreviewProps {
  workflow: any;
  workflowCode: string;
  onAction: () => void;
  actionLabel: string;
  actionIcon: 'deploy' | 'update';
  isProcessing: boolean;
  onCodeChange?: (updatedCode: string) => void;
}

/* ── Node type visual config ── */
const nodeVisuals: Record<string, { icon: string; iconBg: string; iconColor: string }> = {
  scheduletrigger: { icon: '⚡', iconBg: '#2a1a0e', iconColor: '#ff6d5a' },
  crontrigger:     { icon: '⚡', iconBg: '#2a1a0e', iconColor: '#ff6d5a' },
  manualtrigger:   { icon: '▶', iconBg: '#1a1028', iconColor: '#a855f7' },
  webhook:         { icon: '🌐', iconBg: '#0e1a2a', iconColor: '#06b6d4' },
  httprequest:     { icon: '🌐', iconBg: '#0e1528', iconColor: '#3b82f6' },
  respondtowebhook:{ icon: '↩️', iconBg: '#0e1528', iconColor: '#3b82f6' },
  slack:           { icon: '💬', iconBg: '#1a0e28', iconColor: '#e04bb5' },
  discord:         { icon: '🎮', iconBg: '#12143a', iconColor: '#5865f2' },
  telegram:        { icon: '✈️', iconBg: '#0e1a28', iconColor: '#0088cc' },
  gmail:           { icon: '✉️', iconBg: '#280e0e', iconColor: '#ea4335' },
  emailsend:       { icon: '✉️', iconBg: '#280e0e', iconColor: '#ea4335' },
  googlesheets:    { icon: '📊', iconBg: '#0e2818', iconColor: '#34a853' },
  airtable:        { icon: '📋', iconBg: '#0e2028', iconColor: '#18bfff' },
  notion:          { icon: '📝', iconBg: '#1a1a1a', iconColor: '#999' },
  postgres:        { icon: '🐘', iconBg: '#0e1528', iconColor: '#336791' },
  mysql:           { icon: '🗄️', iconBg: '#0e1528', iconColor: '#4479a1' },
  code:            { icon: '⚙',  iconBg: '#0e280e', iconColor: '#16a34a' },
  function:        { icon: 'ƒ',  iconBg: '#0e280e', iconColor: '#16a34a' },
  set:             { icon: '≡',  iconBg: '#1a0e28', iconColor: '#9333ea' },
  if:              { icon: '?',  iconBg: '#28200e', iconColor: '#d97706' },
  switch:          { icon: '⇋',  iconBg: '#28200e', iconColor: '#d97706' },
  merge:           { icon: '⊕',  iconBg: '#28200e', iconColor: '#d97706' },
  splitinbatches:  { icon: '⊞',  iconBg: '#28200e', iconColor: '#d97706' },
  noop:            { icon: '⏭️', iconBg: '#1a1a1a', iconColor: '#666' },
  datetime:        { icon: '🕐', iconBg: '#1a0e28', iconColor: '#9333ea' },
  openai:          { icon: '🤖', iconBg: '#0e2018', iconColor: '#10a37f' },
};

function getVisual(type: string) {
  const t = (type || '').replace('n8n-nodes-base.', '').toLowerCase();
  if (nodeVisuals[t]) return nodeVisuals[t];
  if (t.includes('trigger') || t.includes('webhook'))
    return { icon: '⚡', iconBg: '#2a1a0e', iconColor: '#ff6d5a' };
  return { icon: '⬡', iconBg: '#1a1a1a', iconColor: '#666' };
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

const NODE_W = 130;
const NODE_H = 36;

export default function WorkflowPreview({
  workflow,
  workflowCode,
  onAction,
  actionLabel,
  actionIcon,
  isProcessing,
  onCodeChange,
}: WorkflowPreviewProps) {
  const [viewMode, setViewMode] = useState<'nodes' | 'code'>('nodes');
  const [editableCode, setEditableCode] = useState(workflowCode);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodes: any[] = workflow?.nodes || [];
  const connections = workflow?.connections || {};

  // Build edge list from actual connections
  const edgeList = useMemo(() => {
    const list: Array<{ from: string; to: string }> = [];
    for (const [sourceName, conn] of Object.entries(connections)) {
      const main = (conn as any)?.main;
      if (main && Array.isArray(main))
        for (const g of main) if (Array.isArray(g))
          for (const l of g) if (l.node) list.push({ from: sourceName, to: l.node });
    }
    return list;
  }, [connections]);

  // Get ordered nodes following connections (BFS)
  const getOrderedNodes = useCallback(() => {
    if (nodes.length === 0) return [];
    const connectedTo = new Set<string>();
    edgeList.forEach(e => connectedTo.add(e.to));
    const starts = nodes.filter((n: any) => !connectedTo.has(n.name));
    if (starts.length === 0) return nodes;

    const ordered: any[] = [];
    const visited = new Set<string>();
    const queue = [...starts];
    while (queue.length) {
      const node = queue.shift()!;
      if (visited.has(node.name)) continue;
      visited.add(node.name);
      ordered.push(node);
      edgeList.filter(e => e.from === node.name).forEach(e => {
        const t = nodes.find((n: any) => n.name === e.to);
        if (t && !visited.has(t.name)) queue.push(t);
      });
    }
    for (const n of nodes) if (!visited.has(n.name)) ordered.push(n);
    return ordered;
  }, [nodes, edgeList]);

  // Initialize positions
  useEffect(() => {
    const map = new Map<string, { x: number; y: number }>();
    const ordered = getOrderedNodes();

    // Check if nodes have position data
    const hasPositions = ordered.some((n: any) => n.position && Array.isArray(n.position));

    if (hasPositions) {
      const minX = Math.min(...nodes.map((n: any) => n.position?.[0] ?? 0));
      const minY = Math.min(...nodes.map((n: any) => n.position?.[1] ?? 0));
      ordered.forEach((node: any) => {
        const pos = node.position;
        if (pos && Array.isArray(pos)) {
          map.set(node.id || node.name, {
            x: (pos[0] - minX) * 0.7 + 30,
            y: (pos[1] - minY) * 0.7 + 30,
          });
        }
      });
    } else {
      ordered.forEach((node: any, idx: number) => {
        map.set(node.id || node.name, { x: 30 + idx * 165, y: 50 });
      });
    }
    setPositions(map);
  }, [workflow]);

  // Dragging
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = positions.get(nodeId) || { x: 0, y: 0 };
    setDragOffset({ x: e.clientX - rect.left - pos.x, y: e.clientY - rect.top - pos.y });
    setDragging(nodeId);
    setSelectedId(nodeId);
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPositions(prev => new Map(prev).set(dragging, {
      x: e.clientX - rect.left - dragOffset.x,
      y: e.clientY - rect.top - dragOffset.y,
    }));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Escape to close fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditing ? editableCode : workflowCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyEdits = () => {
    if (onCodeChange) onCodeChange(editableCode);
    setIsEditing(false);
  };

  // Canvas size
  const allPos = Array.from(positions.values());
  const maxX = allPos.length > 0 ? Math.max(...allPos.map(p => p.x)) + NODE_W + 60 : 500;
  const maxY = allPos.length > 0 ? Math.max(...allPos.map(p => p.y)) + NODE_H + 60 : 250;
  const canvasW = Math.max(500, maxX);
  const canvasH = Math.max(200, maxY);

  const isTrigger = (type: string) => {
    const t = (type || '').toLowerCase();
    return t.includes('trigger') || t.includes('webhook');
  };

  /* ── Toolbar ── */
  const toolbar = (
    <div className="px-3 py-2 bg-[#1a1a1a] flex items-center justify-between border-b border-[#333] flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white">
          {workflow?.name || 'Workflow'}
        </span>
        <span className="text-[11px] text-white bg-[#333] px-1.5 py-0.5 rounded">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex rounded border border-[#333] overflow-hidden mr-1">
          <button
            onClick={() => setViewMode('nodes')}
            className={`text-[11px] px-2 py-1 flex items-center gap-1 transition-colors ${
              viewMode === 'nodes' ? 'bg-[#333] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />Canvas
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`text-[11px] px-2 py-1 flex items-center gap-1 transition-colors ${
              viewMode === 'code' ? 'bg-[#333] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
            }`}
          >
            <Code className="w-3 h-3" />JSON
          </button>
        </div>
        {!fullscreen && (
          <button onClick={() => setFullscreen(true)} className="btn btn-secondary text-[11px] py-1 px-2">
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
        {fullscreen && (
          <button onClick={() => setFullscreen(false)} className="btn btn-secondary text-[11px] py-1 px-2">
            <X className="w-3 h-3" />Close
          </button>
        )}
        <button onClick={handleCopy} className="btn btn-secondary text-[11px] py-1 px-2">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={() => { if (isEditing) handleApplyEdits(); onAction(); }}
          disabled={isProcessing}
          className="btn btn-primary text-[11px] py-1 px-2"
        >
          {actionIcon === 'deploy' ? <Rocket className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
          {actionLabel}
        </button>
      </div>
    </div>
  );

  /* ── Canvas renderer ── */
  const renderCanvas = (height: number | string) => (
    <div
      ref={canvasRef}
      className="relative overflow-auto"
      style={{
        height,
        background: '#141414',
        backgroundImage: 'radial-gradient(circle, #222 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
      onClick={() => setSelectedId(null)}
    >
      <svg
        width={fullscreen ? '100%' : canvasW}
        height={fullscreen ? '100%' : canvasH}
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: 'visible', minWidth: canvasW, minHeight: canvasH }}
      >
        <defs>
          <marker id="arr-dark" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#ff6b35" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </marker>
        </defs>

        {/* Draw edges ONLY from actual connections */}
        {edgeList.map((edge, i) => {
          const fromNode = nodes.find((n: any) => n.name === edge.from);
          const toNode = nodes.find((n: any) => n.name === edge.to);
          if (!fromNode || !toNode) return null;

          const fromPos = positions.get(fromNode.id || fromNode.name) || { x: 0, y: 0 };
          const toPos = positions.get(toNode.id || toNode.name) || { x: 0, y: 0 };

          const x1 = fromPos.x + NODE_W;
          const y1 = fromPos.y + NODE_H / 2;
          const x2 = toPos.x;
          const y2 = toPos.y + NODE_H / 2;

          return (
            <g key={`edge-${i}`}>
              <path
                d={bezier(x1, y1, x2, y2)}
                fill="none"
                stroke="#ff6b35"
                strokeWidth="1.5"
                strokeOpacity="0.6"
                markerEnd="url(#arr-dark)"
              />
              <circle cx={x1} cy={y1} r={4} fill="#1a1a1a" stroke="#ff6b35" strokeWidth={2} />
              <circle cx={x2} cy={y2} r={4} fill="#1a1a1a" stroke="#888" strokeWidth={2} />
            </g>
          );
        })}
      </svg>

      {/* Node cards */}
      {nodes.map((node: any) => {
        const id = node.id || node.name;
        const pos = positions.get(id) || { x: 0, y: 0 };
        const visual = getVisual(node.type);
        const trigger = isTrigger(node.type || '');
        const selected = selectedId === id;

        return (
          <div
            key={id}
            onMouseDown={(e) => handleMouseDown(e, id)}
            onClick={(e) => { e.stopPropagation(); setSelectedId(id); }}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: NODE_W,
              height: NODE_H,
              cursor: dragging === id ? 'grabbing' : 'grab',
              userSelect: 'none',
              zIndex: dragging === id ? 50 : selected ? 40 : 10,
            }}
          >
            <div style={{
              background: '#222',
              border: `1.5px solid ${selected ? '#ff6b35' : trigger ? visual.iconColor + '60' : '#333'}`,
              borderRadius: 10,
              boxShadow: selected
                ? '0 0 0 1px #ff6b35, 0 4px 16px rgba(0,0,0,0.4)'
                : '0 1px 6px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              height: NODE_H,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 8px',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 5,
                background: visual.iconBg, color: visual.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, flexShrink: 0,
              }}>
                {visual.icon}
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 500, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
              }}>
                {node.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Code view ── */
  const renderCode = (maxH: string) => (
    <div className="bg-[#0d0d0d] relative" style={{ flex: fullscreen ? 1 : undefined }}>
      {!isEditing ? (
        <>
          <button
            onClick={() => { setIsEditing(true); setEditableCode(workflowCode); }}
            className="absolute top-2 right-2 btn btn-secondary text-[11px] py-1 px-2 z-10"
          >
            <Pencil className="w-3 h-3" />Edit
          </button>
          <div className="overflow-y-auto p-4" style={{ maxHeight: maxH }}>
            <pre className="text-xs text-white whitespace-pre-wrap font-mono leading-relaxed">
              {workflowCode}
            </pre>
          </div>
        </>
      ) : (
        <>
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <button onClick={handleApplyEdits} className="btn btn-primary text-[11px] py-1 px-2">
              <Check className="w-3 h-3" />Apply
            </button>
            <button
              onClick={() => { setIsEditing(false); setEditableCode(workflowCode); }}
              className="btn btn-secondary text-[11px] py-1 px-2"
            >Cancel</button>
          </div>
          <textarea
            value={editableCode}
            onChange={(e) => setEditableCode(e.target.value)}
            className="w-full p-4 bg-[#0d0d0d] text-xs text-white font-mono resize-y border-none outline-none leading-relaxed"
            style={{ minHeight: '256px', maxHeight: maxH }}
            spellCheck={false}
          />
        </>
      )}
    </div>
  );

  /* ── Fullscreen overlay ── */
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0d0d0d] flex flex-col">
        {toolbar}
        {viewMode === 'nodes' ? renderCanvas('100%') : renderCode('100vh')}
      </div>
    );
  }

  /* ── Inline view ── */
  return (
    <div className="border border-[#333] rounded-lg overflow-hidden">
      {toolbar}
      {viewMode === 'nodes' ? renderCanvas(Math.min(canvasH, 220)) : renderCode('18rem')}
    </div>
  );
}
