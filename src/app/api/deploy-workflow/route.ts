import { NextRequest, NextResponse } from 'next/server';
import { n8nFetch } from '@/lib/n8n-fetch';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { host, apiKey, workflow } = await request.json();

    if (!host || !apiKey || !workflow) {
      return NextResponse.json(
        { message: 'Host, API key, and workflow are required' },
        { status: 400 }
      );
    }

    const payload = {
      name: workflow.name || 'AI Generated Workflow',
      nodes: workflow.nodes || [],
      connections: workflow.connections || {},
      settings: workflow.settings || { executionOrder: 'v1' },
    };

    const normalizedHost = host.replace(/\/+$/, '');
    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { message: `Failed to deploy: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      message: 'Workflow deployed successfully!',
      workflowId: result.id,
      workflowName: result.name,
    });
  } catch (error: any) {
    console.error('Error deploying workflow:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to deploy workflow' },
      { status: 500 }
    );
  }
}
