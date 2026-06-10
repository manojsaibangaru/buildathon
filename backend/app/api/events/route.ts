// ═══════════════════════════════════════════════════════════════
// AEGIS AI — /api/events
//
// POST  — Chrome extension sends a detection event here
// GET   — Dashboard polls for recent events (with ?org_key=...)
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabase, AegisEvent }      from "@/lib/supabase";

// POST /api/events — ingest a detection event from the extension
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<AegisEvent>;
    const orgKey = req.headers.get("x-aegis-key") || "demo";

    if (!body.timestamp || !body.platform || body.score == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const event: AegisEvent = {
      timestamp:  body.timestamp,
      org_key:    orgKey,
      platform:   body.platform,
      score:      body.score,
      level:      body.level      || "NONE",
      categories: body.categories || [],
      types:      body.types      || [],
      action:     body.action     || "DETECTED",
      user_agent: req.headers.get("user-agent") || undefined,
    };

    const { error } = await supabase.from("events").insert(event);

    if (error) {
      console.error("[Aegis] Event insert error:", error.message);
      return NextResponse.json({ error: "Failed to store event" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// GET /api/events?org_key=demo&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgKey = searchParams.get("org_key") || "demo";
  const limit  = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("org_key", orgKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data });
}
