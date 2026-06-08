/**
 * Catch-all proxy: forwards all /api/* requests to the Express backend.
 * This bypasses Next.js rewrites (which are affected by OrbStack proxy).
 * Uses Node.js http module directly which correctly bypasses the proxy.
 */

import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import https from 'https';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://iotpilot-server-backend:3100';

async function proxy(req: NextRequest, method: string): Promise<NextResponse> {
  const url = new URL(req.url);
  const targetUrl = `${BACKEND}${url.pathname}${url.search}`;

  const body = method !== 'GET' && method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  return new Promise((resolve) => {
    const parsed = new URL(targetUrl);
    const transport = parsed.protocol === 'https:' ? https : http;

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'host') headers[k] = v;
    });
    headers['host'] = parsed.host;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      method,
      headers,
    };

    const proxyReq = transport.request(options, (proxyRes) => {
      const chunks: Buffer[] = [];
      proxyRes.on('data', (c) => chunks.push(c));
      proxyRes.on('end', () => {
        const responseHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(proxyRes.headers)) {
          if (v) responseHeaders[k] = Array.isArray(v) ? v.join(', ') : v;
        }
        resolve(
          new NextResponse(Buffer.concat(chunks), {
            status: proxyRes.statusCode ?? 200,
            headers: responseHeaders,
          })
        );
      });
    });

    proxyReq.on('error', (e) => {
      resolve(NextResponse.json({ error: 'Backend unavailable', detail: e.message }, { status: 502 }));
    });

    if (body) proxyReq.write(Buffer.from(body));
    proxyReq.end();
  });
}

export async function GET(req: NextRequest)    { return proxy(req, 'GET'); }
export async function POST(req: NextRequest)   { return proxy(req, 'POST'); }
export async function PUT(req: NextRequest)    { return proxy(req, 'PUT'); }
export async function PATCH(req: NextRequest)  { return proxy(req, 'PATCH'); }
export async function DELETE(req: NextRequest) { return proxy(req, 'DELETE'); }
