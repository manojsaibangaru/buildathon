# Aegis AI — Build Log

> Complete step-by-step record of every decision, change, and file in the project.

---

## What Is Aegis AI?

Aegis AI is a **Human Exposure Protection Platform** — it prevents employees from accidentally leaking sensitive data (passwords, AWS keys, SSNs, credit cards, medical records) when using AI tools like ChatGPT, Claude, and Gemini.

This is **Module 1: Human Exposure** only.

---

## The Problem We Solve

Every day, employees paste sensitive data into AI tools:
- An engineer copies a `.env` file with database credentials into ChatGPT to debug an issue
- A salesperson pastes a customer spreadsheet with SSNs into Claude
- A doctor pastes a patient's medical history into Gemini for a summary

These AI tools store your conversations on external servers. The data can be accessed by staff, used for training, or leaked in a breach. Most employees don't think about this.

---

## The Product

```
┌─────────────────────────────────────────────────────┐
│  1. Landing Page  (aegis-ai.vercel.app)              │
│     What judges see first. 10 seconds to understand. │
└─────────────────────────────────────────────────────┘
           ↓ employee installs extension
┌─────────────────────────────────────────────────────┐
│  2. Chrome Extension  (extension/)                   │
│     Employee protection layer                        │
│     → Scans every paste and Enter key submission     │
│     → Shows modal: risk level, what was found, why   │
│     → Options: Redact / Cancel / Send Anyway         │
│     → Syncs events to dashboard in real time         │
└─────────────────────────────────────────────────────┘
           ↓ every detection event sent to backend
┌─────────────────────────────────────────────────────┐
│  3. Security Dashboard  (/dashboard)                 │
│     What the CISO / security team sees               │
│     → Live event feed (polls every 5s)               │
│     → Risk analytics: total events, critical, high   │
│     → Top threat types with bar chart                │
│     → Risk breakdown by level                        │
└─────────────────────────────────────────────────────┘
           ↓ same detection logic, exposed as
┌─────────────────────────────────────────────────────┐
│  4. REST API  (POST /api/scan)                       │
│     Any app can scan content before sending to AI    │
│     → Returns: score, level, action, findings,       │
│       redacted text                                  │
│     → Optional deep=true for NLP layer 2             │
│     → Judges can test with a curl command live       │
└─────────────────────────────────────────────────────┘
```

---

## Architecture

### Two-Layer Detection

**Layer 1 — Extension (client-side, instant)**
- Regex patterns for all structured secrets
- Runs entirely in the browser
- Zero latency, zero network, works offline
- 30+ patterns across 5 categories

**Layer 2 — Backend NLP (server-side, optional)**
- compromise.js (2MB Node.js NLP library)
- Contextual analysis: names, organizations, financial amounts
- Called when `deep: true` in `/api/scan`
- No external AI — runs on our server

### Why Not Transformers.js?

Transformers.js models are 30MB+. In a Chrome extension:
- Slow first load (30MB download)
- MV3 service worker memory limits
- CSP conflicts on target sites

The regex + NLP architecture is more enterprise-grade:
- Extension stays under 1MB
- Server handles heavy analysis
- Enterprise can deploy backend on their own infrastructure

---

## Repository Structure

```
buildathon/
├── aegis-core/               ← Shared TypeScript detection engine
│   ├── src/
│   │   ├── detectionEngine.ts  ← All 30+ detection patterns
│   │   ├── riskScorer.ts       ← Exposure scoring (0-100)
│   │   ├── redactor.ts         ← Replace secrets with [REDACTED:TYPE]
│   │   ├── policyEngine.ts     ← Policy rule evaluation → BLOCK/WARN/ALLOW
│   │   └── index.ts            ← Public exports
│   ├── scripts/
│   │   └── bundle-browser.js   ← esbuild: compiles to IIFE for extension
│   ├── dist/
│   │   ├── aegis-core.browser.js  ← Browser bundle (loaded by extension)
│   │   └── index.js               ← CJS module (imported by backend)
│   ├── package.json
│   └── tsconfig.json
│
├── extension/                ← Chrome Extension (Manifest V3)
│   ├── manifest.json           ← Extension config, host permissions, load order
│   ├── injected.js             ← MAIN world script (document_start)
│   │                             Intercepts paste before React can handle it
│   ├── aegis-core.js           ← Compiled browser bundle (copied from aegis-core/dist)
│   ├── modal.js                ← Warning modal UI (injected into AI tool pages)
│   ├── content.js              ← Main logic: detection pipeline, event sync
│   ├── popup.html/js/css       ← Extension popup (click the toolbar icon)
│   └── icons/                  ← Extension icons
│
├── backend/                  ← Next.js 16 on Vercel
│   ├── app/
│   │   ├── page.tsx             ← Landing page
│   │   ├── dashboard/page.tsx   ← Security dashboard (live event feed)
│   │   └── api/
│   │       ├── events/route.ts  ← POST: ingest events | GET: fetch events
│   │       ├── scan/route.ts    ← POST: public scan API
│   │       └── policies/route.ts← CRUD for org policy rules
│   ├── lib/
│   │   ├── supabase.ts          ← Supabase client + DB types
│   │   ├── schema.sql           ← Database schema (run in Supabase SQL editor)
│   │   ├── aegis-core/          ← aegis-core dist copied here for Turbopack
│   │   └── nlp/
│   │       └── nlpScanner.ts    ← compromise.js NLP layer 2
│   ├── next.config.ts
│   ├── vercel.json
│   └── .env.local.example
│
├── package.json              ← Monorepo root: build scripts
└── BUILD_LOG.md              ← This file
```

---

## What aegis-core Is

`aegis-core` is the **shared detection brain** of the platform. It's a TypeScript package with 4 modules:

### 1. `detectionEngine.ts` — All Detection Patterns

30+ patterns across 5 categories:

| Category | Count | Examples |
|---|---|---|
| CREDENTIALS | 11 | AWS keys, API keys, JWT, DB strings, GitHub tokens, Stripe keys, private keys |
| PII | 6 | SSN, passport, email, phone, driver's license, internal IPs |
| PHI | 4 | Medical record numbers, health insurance IDs, diagnosis codes (ICD), DOB |
| FINANCIAL | 4 | Credit cards, bank account numbers, routing numbers, IBAN |
| SOURCE_CODE | 2 | .env file content, internal hostnames |

Each pattern has:
- `type` — machine-readable name (e.g., `AWS_ACCESS_KEY`)
- `category` — one of the 5 categories
- `severity` — CRITICAL / HIGH / MEDIUM / LOW
- `description` — human-readable name shown in the modal
- `riskExplanation` — plain English: "Full AWS account access. Attackers scan AI logs. Average time to exploit: 4 minutes."

The `scan(text)` function runs all patterns and returns `{ findings, rawScore, categories }`.

### 2. `riskScorer.ts` — Exposure Scoring

Takes findings + context and produces a 0-100 exposure score + level (CRITICAL/HIGH/MEDIUM/LOW/NONE).

Context factors that amplify the score:
- `sourceCode: true` → +20 pts (developer, secrets more likely real)
- `customerData: true` → +25 pts (affects third parties)
- `internalDocs: true` → +15 pts (proprietary data)
- `contracts: true` → +15 pts (legal documents)
- `platform: "ChatGPT"` → +5 pts (data retention policy)

### 3. `redactor.ts` — Secret Replacement

Replaces secrets with typed markers, preserving context:
- `password=hunter2` → `password=[REDACTED:PASSWORD]`
- `AKIA1234...` → `[REDACTED:AWS_ACCESS_KEY]`

### 4. `policyEngine.ts` — Policy Rule Evaluation

Takes a risk level + category set + org policy config → returns `BLOCK | WARN | ALLOW`.

Default policy: CRITICAL→BLOCK, HIGH→WARN, MEDIUM→WARN, LOW→ALLOW.

---

## Build Steps (Executed in Order)

### Step 1: Created directory structure
```
mkdir -p aegis-core/src extension backend
```
Moved all existing extension files from root into `extension/`.

### Step 2: Initialized aegis-core TypeScript package
- Created `aegis-core/package.json` with esbuild as dev dependency
- Created `aegis-core/tsconfig.json` targeting ES2020 (needed for `String.matchAll`)
- Wrote `src/detectionEngine.ts` — 30+ patterns, `scan()` function
- Wrote `src/riskScorer.ts` — context-aware exposure scoring
- Wrote `src/redactor.ts` — typed secret redaction
- Wrote `src/policyEngine.ts` — org policy evaluation
- Wrote `src/index.ts` — public exports
- Wrote `scripts/bundle-browser.js` — esbuild IIFE bundle for Chrome extension
- `npm install && npm run build` → produced `dist/aegis-core.browser.js` + CJS modules

### Step 3: Updated Chrome Extension
- Copied `aegis-core/dist/aegis-core.browser.js` → `extension/aegis-core.js`
- Updated `manifest.json`: replaced `exposureEngine.js` with `aegis-core.js`; bumped version to 1.1.0
- Rewrote `content.js`: removed inline patterns, now delegates entirely to `AegisCore.scan()`, `AegisCore.calculateExposure()`, `AegisCore.redact()`
- Added `sendEventToBackend()` to `content.js` — fires detection events to `/api/events` (fire-and-forget, extension works if backend is down)
- Updated `modal.js`: uses `f.riskExplanation` and `f.description` from aegis-core findings; added category badge to each finding row
- Deleted `exposureEngine.js` — functionality moved into aegis-core

### Step 4: Created Next.js backend
- `create-next-app` with TypeScript + Tailwind + App Router
- Installed `@supabase/supabase-js` and `compromise`
- Installed `aegis-core` as local package via `npm install file:../aegis-core`

### Step 5: Database schema
- `lib/schema.sql` — Supabase tables: `events` and `policies`
- `lib/supabase.ts` — Supabase client (lazy-initialized to allow build without env vars)

### Step 6: API Routes
- `app/api/events/route.ts` — POST (ingest from extension) + GET (dashboard polling)
- `app/api/scan/route.ts` — POST (public scan API, Layer 1 + optional Layer 2 NLP)
- `app/api/policies/route.ts` — GET/POST/DELETE for org policy rules

### Step 7: NLP Layer 2
- `lib/nlp/nlpScanner.ts` — compromise.js for PERSON names, ORGs, MONEY, DATEs

### Step 8: Frontend
- `app/page.tsx` — Landing page: hero, how-it-works, detection categories, API snippet, CTA
- `app/dashboard/page.tsx` — Security dashboard: stat cards, live event feed, top threat types, risk breakdown, API playground

### Step 9: Build fixes
- Fixed TS error: `String.matchAll` needs ES2020 lib
- Fixed Turbopack module resolution: copied aegis-core dist into `backend/lib/aegis-core/`
- Fixed Supabase build error: lazy initialization when env vars missing
- All TypeScript errors: zero
- Production build: ✅ clean

---

## What Detection Looks Like (End to End)

1. Employee pastes `AKIA1234567890ABCDEF password=myS3cret` into ChatGPT
2. `injected.js` (MAIN world) intercepts the paste before React handles it
3. Custom event `aegis:paste-starting` fires with the clipboard text
4. `content.js` receives the event, calls `AegisCore.scan(text)`
5. Detection engine finds: `AWS_ACCESS_KEY (CRITICAL)` + `PASSWORD (HIGH)`
6. `AegisCore.calculateExposure(findings, { platform: "ChatGPT", sourceCode: true, ... })` → score 90, level CRITICAL
7. `showWarningModal()` fires — employee sees the modal
8. Employee clicks "Redact Secrets" → text becomes `[REDACTED:AWS_ACCESS_KEY] password=[REDACTED:PASSWORD]`
9. `content.js` fires `sendEventToBackend()` → POST to `/api/events`
10. Dashboard sees the event appear in the live feed within 5 seconds

---

## Deployment Checklist

### Supabase
1. Create new Supabase project
2. Run `backend/lib/schema.sql` in the SQL editor
3. Copy URL, anon key, service role key

### Vercel
1. `cd backend && vercel deploy`
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Chrome Extension
1. Open `chrome://extensions`
2. Enable Developer Mode
3. "Load unpacked" → select the `extension/` folder
4. Navigate to ChatGPT, Claude, or Gemini
5. Paste: `AKIA1234567890ABCDEF` — modal should fire

---

## What Judges See (Demo Script)

1. **Open `aegis-ai.vercel.app`** — landing page explains the product in 10 seconds
2. **Click "View Dashboard"** — see the live event feed (empty at first)
3. **Install the extension** (or show from a pre-installed browser)
4. **Paste a credential into ChatGPT** — modal fires, shows risk level and explanation
5. **Click "Redact Secrets"** — text is cleaned, the send goes through
6. **Switch back to dashboard** — the event appeared in real time
7. **Run the curl command** from the API playground — get JSON risk report back
8. **That's the full platform** — extension + dashboard + API

---

## What's Next (Priority Order)

| # | Task | Where |
|---|---|---|
| 1 | Connect Supabase + deploy to Vercel | backend/ |
| 2 | Set backend URL in extension (popup settings tab) | extension/ |
| 3 | Policy management UI in dashboard | backend/app/dashboard |
| 4 | File upload scanning | extension/ |
| 5 | "Allow with justification" flow | extension/modal.js |
| 6 | Audit log export (CSV) | backend/api |
| 7 | Extension settings page (org key, backend URL) | extension/ |
