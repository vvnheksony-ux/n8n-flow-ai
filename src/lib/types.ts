export interface N8nConnection {
  host: string;
  apiKey: string;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  updatedAt?: string;
  createdAt?: string;
}

export type ChatAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'list'
  | 'audit'
  | 'activate'
  | 'deactivate'
  | 'describe'
  | 'chat';

export interface ActionData {
  // For create/edit: the generated workflow JSON
  workflow?: any;
  workflowCode?: string;
  // For delete/activate/deactivate/describe/edit: target workflow
  workflowId?: string;
  workflowName?: string;
  // For list: workflow list
  workflows?: Workflow[];
  // For edit: when multiple matches
  candidates?: Array<{ id: string; name: string; active: boolean }>;
  // For delete: confirmation state
  confirmed?: boolean;
  // For audit: results per workflow
  results?: Array<{
    workflowId: string;
    workflowName: string;
    status: 'ok' | 'warning' | 'error';
    issues: string[];
    suggestions: string[];
  }>;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // USD
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ChatAction;
  actionData?: ActionData;
  usage?: TokenUsage;
  timestamp: Date;
}
