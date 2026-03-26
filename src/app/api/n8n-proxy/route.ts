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

    const response = await n8nFetch(`${normalizedHost}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Failed to fetch workflows' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}
