// ═══════════════════════════════════════════════════════════════
// AEGIS AI — /api/scan
//
// Public REST API. Any application can POST content here to get
// a risk analysis before sending it to an AI tool.
//
// Request:
//   POST /api/scan
//   Content-Type: application/json
//   x-aegis-key: <org_api_key>
//
//   { "text": "...", "deep": false }
//
//   text  — the content to scan (required)
//   deep  — if true, also runs NLP layer 2 analysis (optional)
//
// Response:
//   {
//     "score": 75,
//     "level": "HIGH",
//     "action": "WARN",
//     "findings": [ { type, category, severity, description, riskExplanation } ],
//     "redacted": "...",          // text with secrets replaced
//     "nlp": { findings, summary } // only if deep=true
//   }
//
// Example:
//   curl -X POST https://aegis-ai.vercel.app/api/scan \
//     -H "Content-Type: application/json" \
//     -H "x-aegis-key: demo" \
//     -d '{"text": "password=hunter2 AKIA1234567890ABCDEF"}'
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

// aegis-core runs as a Node.js CommonJS module on the backend
import * as AegisCore from "@/lib/aegis-core/index";

import { nlpScan } from "@/lib/nlp/nlpScanner";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text?: string; deep?: boolean };

    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
    }

    const text = body.text.slice(0, 50_000); // 50KB cap per request

    // Layer 1: regex-based detection (aegis-core)
    const { findings, rawScore } = AegisCore.scan(text);
    const exposure = AegisCore.calculateExposure(findings, { platform: "API" });
    const redacted = AegisCore.redact(text);

    // Determine recommended action
    const categories = new Set(findings.map((f: { category: string }) => f.category)) as Set<import("@/lib/aegis-core/index").Category>;
    const { action } = AegisCore.evaluate(exposure.level, categories);

    // Layer 2: NLP deep scan (optional)
    let nlpResult = null;
    if (body.deep === true) {
      nlpResult = nlpScan(text);
    }

    // Clean up findings for API response (omit raw match value for privacy)
    const safeFindings = findings.map((f: {
      type: string;
      category: string;
      severity: string;
      description: string;
      riskExplanation: string;
    }) => ({
      type:            f.type,
      category:        f.category,
      severity:        f.severity,
      description:     f.description,
      riskExplanation: f.riskExplanation,
    }));

    return NextResponse.json({
      score:    exposure.score,
      level:    exposure.level,
      action,
      findings: safeFindings,
      redacted,
      ...(nlpResult ? { nlp: nlpResult } : {}),
    });
  } catch (err) {
    console.error("[Aegis /api/scan]", err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}

// GET /api/scan — returns API documentation
export async function GET() {
  return NextResponse.json({
    endpoint:    "POST /api/scan",
    description: "Scan text for sensitive data before sending to AI tools.",
    headers:     { "x-aegis-key": "Your organization API key (use 'demo' for testing)" },
    body:        { text: "string (required)", deep: "boolean (optional, enables NLP layer)" },
    example: {
      request: {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-aegis-key": "demo" },
        body:    { text: "Here is my password=hunter2 and key AKIA1234567890ABCDEF" },
      },
    },
  });
}
