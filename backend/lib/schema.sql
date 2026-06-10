-- ═══════════════════════════════════════════════════════════════
-- AEGIS AI — Supabase Schema
-- Run this in the Supabase SQL editor to create the tables.
-- ═══════════════════════════════════════════════════════════════

-- Events table: stores every detection event from Chrome extensions
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  timestamp   timestamptz not null,
  org_key     text not null default 'demo',
  platform    text not null,         -- ChatGPT | Claude | Gemini | API | Unknown
  score       int  not null,         -- 0–100
  level       text not null,         -- CRITICAL | HIGH | MEDIUM | LOW | NONE
  categories  text[] not null default '{}',
  types       text[] not null default '{}',
  action      text not null,         -- DETECTED | REDACTED | ALLOWED | BLOCKED
  user_agent  text
);

-- Policies table: org-level detection rules
create table if not exists policies (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  org_key     text not null default 'demo',
  name        text not null,
  category    text,                  -- CREDENTIALS | PII | PHI | FINANCIAL | SOURCE_CODE
  severity    text,                  -- CRITICAL | HIGH | MEDIUM | LOW
  risk_level  text,                  -- CRITICAL | HIGH | MEDIUM | LOW
  action      text not null,         -- BLOCK | WARN | ALLOW
  reason      text,
  enabled     boolean default true
);

-- Index for fast event queries by org
create index if not exists events_org_key_idx on events (org_key, created_at desc);
create index if not exists policies_org_key_idx on policies (org_key);

-- Row-level security (open for demo — restrict by org_key in production)
alter table events  enable row level security;
alter table policies enable row level security;

create policy "Allow all for demo" on events  for all using (true);
create policy "Allow all for demo" on policies for all using (true);
