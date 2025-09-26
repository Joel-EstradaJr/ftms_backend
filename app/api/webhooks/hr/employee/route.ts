import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[webhook] hr.employee", body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[webhook] hr.employee error", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
