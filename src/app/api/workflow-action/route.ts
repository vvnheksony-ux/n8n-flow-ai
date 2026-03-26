import { NextRequest, NextResponse } from 'next/server';
import { n8nFetch } from '@/lib/n8n-fetch';

export const maxDuration = 30;

// DELETE a workflow
export async function DELETE(request: NextRequest) {
  try {
    const { host, apiKey, workflowId } = await request.json();

    if (!host || !apiKey || !workflowId) {
      return NextResponse.json(
        { message: 'Host, API key, and workflow ID are required' },
        { status: 400 },
      );
    }

    const normalizedHost = host.replace(/\/+$/, '');
    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { message: `Failed to delete: ${errorText}` },
        { status: response.status },
      );
    }

    return NextResponse.json({ message: 'Workflow deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to delete workflow' },
      { status: 500 },
    );
  }
}

// PUT — update/edit a workflow
export async function PUT(request: NextRequest) {
  try {
    const { host, apiKey, workflowId, workflow } = await request.json();

    if (!host || !apiKey || !workflowId || !workflow) {
      return NextResponse.json(
        { message: 'Host, API key, workflow ID, and workflow data are required' },
        { status: 400 },
      );
    }

    if (!workflow.name) {
      return NextResponse.json(
        { message: 'Workflow must have a name' },
        { status: 400 },
      );
    }

    const payload: any = {
      name: workflow.name,
      nodes: workflow.nodes || [],
      connections: workflow.connections || {},
      settings: workflow.settings || { executionOrder: 'v1' },
    };

    // Only include tags if present
    if (workflow.tags) {
      payload.tags = workflow.tags;
    }

    const normalizedHost = host.replace(/\/+$/, '');
    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { message: `Failed to update: ${errorText}` },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json({
      message: 'Workflow updated successfully',
      workflowId: result.id,
      workflowName: result.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to update workflow' },
      { status: 500 },
    );
  }
}

// POST — activate or deactivate a workflow
export async function POST(request: NextRequest) {
  try {
    const { host, apiKey, workflowId, active } = await request.json();

    if (!host || !apiKey || !workflowId || active === undefined) {
      return NextResponse.json(
        { message: 'Host, API key, workflow ID, and active state are required' },
        { status: 400 },
      );
    }

    const normalizedHost = host.replace(/\/+$/, '');

    // n8n API: POST /api/v1/workflows/:id/activate or /deactivate
    const endpoint = active ? 'activate' : 'deactivate';
    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows/${workflowId}/${endpoint}`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { message: `Failed to ${endpoint}: ${errorText}` },
        { status: response.status },
      );
    }

    const result = await response.json();
    return NextResponse.json({
      message: `Workflow ${active ? 'activated' : 'deactivated'} successfully`,
      workflowId: result.id,
      workflowName: result.name,
      active: result.active,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to update workflow state' },
      { status: 500 },
    );
  }
}

// GET — fetch a single workflow by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');
    const apiKey = searchParams.get('apiKey');
    const workflowId = searchParams.get('workflowId');

    if (!host || !apiKey || !workflowId) {
      return NextResponse.json(
        { message: 'Host, API key, and workflow ID are required' },
        { status: 400 },
      );
    }

    const normalizedHost = host.replace(/\/+$/, '');
    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { message: `Failed to get workflow: ${errorText}` },
        { status: response.status },
      );
    }

    const workflow = await response.json();
    return NextResponse.json({ workflow });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to get workflow' },
      { status: 500 },
    );
  }
}
