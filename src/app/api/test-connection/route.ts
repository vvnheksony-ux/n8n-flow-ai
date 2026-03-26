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

    let response: Response;
    try {
      response = await n8nFetch(`${normalizedHost}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });
    } catch (fetchError: any) {
      // Network-level error — host unreachable, DNS failure, SSL issue, etc.
      const msg = fetchError.message || '';

      if (msg.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { message: `Cannot reach ${normalizedHost} — connection refused. Is n8n running? Is the port open?` },
          { status: 502 }
        );
      }
      if (msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
        return NextResponse.json(
          { message: `DNS lookup failed for ${normalizedHost} — hostname not found. Check the URL.` },
          { status: 502 }
        );
      }
      if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
        return NextResponse.json(
          { message: `Connection to ${normalizedHost} timed out. The server may be behind a firewall or unreachable from the internet.` },
          { status: 504 }
        );
      }
      if (msg.includes('CERT') || msg.includes('certificate') || msg.includes('SSL')) {
        return NextResponse.json(
          { message: `SSL/TLS error connecting to ${normalizedHost}. Try using http:// instead of https://, or make sure your certificate is valid.` },
          { status: 502 }
        );
      }
      if (msg.includes('ECONNRESET')) {
        return NextResponse.json(
          { message: `Connection to ${normalizedHost} was reset. The server closed the connection unexpectedly.` },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { message: `Failed to connect to ${normalizedHost}: ${msg}` },
        { status: 502 }
      );
    }

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { message: `Authentication failed (${response.status}). Your API key is invalid or expired. Create a new one in n8n Settings > API.` },
        { status: 401 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        { message: `API endpoint not found (404). Make sure n8n is running at ${normalizedHost} and the API is enabled. Check that the URL doesn't have a trailing path.` },
        { status: 404 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { message: `n8n returned error ${response.status}: ${errorText}` },
        { status: response.status }
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
      { message: `Unexpected error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
