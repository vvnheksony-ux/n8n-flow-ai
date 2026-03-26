import { NextRequest, NextResponse } from 'next/server';
import { n8nFetch } from '@/lib/n8n-fetch';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { host, apiKey } = await request.json();

    if (!host || !apiKey) {
      return NextResponse.json(
        { message: 'Host and API key are required' },
        { status: 400 }
      );
    }

    const normalizedHost = host.replace(/\/+$/, '');

    // Test connection using the official n8n API
    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { message: `Connection failed (${response.status}): ${error}` },
        { status: 401 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      message: 'Connection successful!',
      workflows: data,
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { message: `Failed to connect: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
