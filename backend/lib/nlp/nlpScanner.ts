// ═══════════════════════════════════════════════════════════════
// AEGIS AI — lib/nlp/nlpScanner.ts
//
// Layer 2 of the detection pipeline — runs on the backend.
// Uses compromise.js (2MB NLP library) for contextual analysis
// that regex cannot reliably do:
//
//   • PERSON names  — "Please help John Smith with his SSN..."
//   • ORG names     — internal company names, client names
//   • MONEY         — financial amounts in narrative text
//   • DATE          — dates that could be DOBs when combined with names
//
// The extension (Layer 1) handles regex-matched structured secrets.
// This layer catches unstructured natural-language leakage.
//
// Called by POST /api/scan when the client requests a "deep scan".
// ═══════════════════════════════════════════════════════════════

import nlp from "compromise";

export interface NlpFinding {
  type:     string;
  category: "PII" | "PHI" | "FINANCIAL";
  severity: "HIGH" | "MEDIUM" | "LOW";
  value:    string;
  context:  string;
}

export interface NlpScanResult {
  findings: NlpFinding[];
  summary:  string;
}

// Extract the surrounding sentence for context display
function getSentence(doc: ReturnType<typeof nlp>, term: string): string {
  const sentences = doc.sentences().out("array") as string[];
  for (const s of sentences) {
    if (s.toLowerCase().includes(term.toLowerCase())) {
      return s.length > 120 ? s.slice(0, 117) + "..." : s;
    }
  }
  return "";
}

export function nlpScan(text: string): NlpScanResult {
  if (!text || text.trim().length < 10) {
    return { findings: [], summary: "Text too short for NLP analysis." };
  }

  const doc = nlp(text);
  const findings: NlpFinding[] = [];

  // ── PERSON names ─────────────────────────────────────────────
  const people = doc.people().out("array") as string[];
  for (const person of [...new Set(people)]) {
    if (person.split(" ").length >= 2) { // Only full names (First + Last)
      findings.push({
        type:     "PERSON_NAME",
        category: "PII",
        severity: "MEDIUM",
        value:    person,
        context:  getSentence(doc, person),
      });
    }
  }

  // ── Organizations ─────────────────────────────────────────────
  const orgs = doc.organizations().out("array") as string[];
  for (const org of [...new Set(orgs)]) {
    findings.push({
      type:     "ORGANIZATION_NAME",
      category: "PII",
      severity: "LOW",
      value:    org,
      context:  getSentence(doc, org),
    });
  }

  // ── Money amounts ─────────────────────────────────────────────
  const money = doc.money().out("array") as string[];
  for (const amount of [...new Set(money)]) {
    findings.push({
      type:     "FINANCIAL_AMOUNT",
      category: "FINANCIAL",
      severity: "MEDIUM",
      value:    amount,
      context:  getSentence(doc, amount),
    });
  }

  // ── Dates (potential DOBs when combined with names) ───────────
  // compromise's .dates() is in a plugin; use regex fallback instead
  const dateMatches = text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi) || [];
  if (dateMatches.length > 0 && people.length > 0) {
    for (const date of [...new Set(dateMatches)]) {
      findings.push({
        type:     "DATE_WITH_NAME",
        category: "PHI",
        severity: "MEDIUM",
        value:    date,
        context:  getSentence(doc, date),
      });
    }
  }

  const summary = findings.length === 0
    ? "No contextual PII/PHI detected by NLP analysis."
    : `NLP detected ${findings.length} contextual finding(s): ${[...new Set(findings.map((f) => f.type))].join(", ")}.`;

  return { findings, summary };
}
