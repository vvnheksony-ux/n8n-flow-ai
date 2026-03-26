'use client';

import { useState } from 'react';
import { Server, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { N8nConnection } from '@/lib/types';

interface ConnectionFormProps {
  onConnect: (connection: N8nConnection) => Promise<boolean>;
  isConnected: boolean;
}

export default function ConnectionForm({ onConnect, isConnected }: ConnectionFormProps) {
  const [host, setHost] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    if (!host || !apiKey) return;
    
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, apiKey }),
      });
      
      const data = await res.json();
      setTestResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Connection successful!' : 'Connection failed'),
      });
    } catch {
      setTestResult({ success: false, message: 'Failed to connect' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!host || !apiKey) return;
    
    setIsTesting(true);
    const success = await onConnect({ host, apiKey });
    setIsTesting(false);
    
    if (success) {
      setTestResult({ success: true, message: 'Connected and saved!' });
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#10b981]/10 rounded-lg flex items-center justify-center">
          <Server className="w-5 h-5 text-[#10b981]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Connect Your n8n</h2>
          <p className="text-sm text-[#71717a]">Enter your n8n instance details</p>
        </div>
        {isConnected && (
          <span className="badge badge-success ml-auto">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">n8n Host URL</label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="https://your-n8n.com or http://167.71.210.87:5678"
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your n8n API key"
            className="input"
          />
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            testResult.success ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#ef4444]/10 text-[#ef4444]'
          }`}>
            {testResult.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={!host || !apiKey || isTesting}
            className="btn btn-secondary flex-1"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
          </button>
          <button
            onClick={handleConnect}
            disabled={!host || !apiKey || isTesting}
            className="btn btn-primary flex-1"
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
