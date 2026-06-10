// ═══════════════════════════════════════════════════════════════
// AEGIS AI — lib/supabase.ts
//
// Supabase client singleton for server-side usage.
// Uses the service role key (never exposed to the browser).
//
// Tables used:
//   events   — detection events from Chrome extensions
//   policies — org-level policy rules
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a stub during build/CI — routes will return 503 if actually called
    return createClient("https://placeholder.supabase.co", "placeholder");
  }
  return createClient(url, key);
}

export const supabase = getSupabaseClient();

// ─────────────────────────────────────────────
// Database types — mirror the Supabase schema
// ─────────────────────────────────────────────

export interface AegisEvent {
  id?:         string;
  created_at?: string;
  timestamp:   string;
  org_key:     string;
  platform:    string;
  score:       number;
  level:       string;
  categories:  string[];
  types:       string[];
  action:      string;
  user_agent?: string;
}

export interface Policy {
  id:         string;
  org_key:    string;
  created_at: string;
  name:       string;
  category?:  string;
  severity?:  string;
  risk_level?: string;
  action:     string;
  reason?:    string;
  enabled:    boolean;
}
