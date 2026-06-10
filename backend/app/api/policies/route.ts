// ═══════════════════════════════════════════════════════════════
// AEGIS AI — /api/policies
// CRUD for org-level detection policies.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { supabase }                  from "@/lib/supabase";

function getOrgKey(req: NextRequest): string {
  return req.headers.get("x-aegis-key") ||
         new URL(req.url).searchParams.get("org_key") ||
         "demo";
}

// GET /api/policies?org_key=demo
export async function GET(req: NextRequest) {
  const orgKey = getOrgKey(req);

  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("org_key", orgKey)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policies: data });
}

// POST /api/policies — create a new policy rule
export async function POST(req: NextRequest) {
  try {
    const orgKey = getOrgKey(req);
    const body   = await req.json();

    if (!body.name || !body.action) {
      return NextResponse.json({ error: "name and action are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("policies")
      .insert({ ...body, org_key: orgKey })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ policy: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// DELETE /api/policies?id=uuid&org_key=demo
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get("id");
  const orgKey = getOrgKey(req);

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("policies")
    .delete()
    .eq("id", id)
    .eq("org_key", orgKey);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
