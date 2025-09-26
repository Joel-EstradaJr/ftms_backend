import { NextRequest, NextResponse } from "next/server";
import refreshCaches from "@/lib/cache/refresh";

export async function POST(req: NextRequest) {
  try {
    // Token auth (with dev-friendly fallbacks):
    // - Accept Authorization: Bearer <CACHE_REFRESH_TOKEN> or x-api-key header
    // - Also accept NEXT_PUBLIC_CACHE_REFRESH_TOKEN for placeholder client usage
    // - In non-production, if no tokens are configured, allow the request
    const token = process.env.CACHE_REFRESH_TOKEN?.trim();
    const publicToken = process.env.NEXT_PUBLIC_CACHE_REFRESH_TOKEN?.trim();
    const authz = req.headers.get('authorization') || '';
    const apiKey = req.headers.get('x-api-key') || '';
    const bearer = authz.toLowerCase().startsWith('bearer ')
      ? authz.slice(7).trim()
      : '';
    const provided = bearer || apiKey;

    const allowedTokens = [token, publicToken].filter((t): t is string => !!t && t.length > 0);
    const isDev = process.env.NODE_ENV !== 'production';
    const isAuthorized = allowedTokens.length > 0
      ? allowedTokens.includes(provided)
      : isDev; // if no tokens configured and not prod, allow for placeholder flow

    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    await refreshCaches();
    const res = NextResponse.json({ ok: true }, { status: 200 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e) {
    console.error("[api] cache.refresh error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
