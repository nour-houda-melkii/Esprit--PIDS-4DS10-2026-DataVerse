// app/api/yahoo/route.ts
// Proxies Yahoo Finance chart API to avoid CORS restrictions in the browser.
// Usage: GET /api/yahoo?ticker=EURUSD=X

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker');
  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;

  try {
    const res = await fetch(url, {
      headers: {
        // Yahoo sometimes rejects requests without a user-agent
        'User-Agent': 'Mozilla/5.0 (compatible; FX-AlphaLab/1.0)',
      },
      next: { revalidate: 30 }, // cache on the server for 30s
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}