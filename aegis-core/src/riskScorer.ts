// ═══════════════════════════════════════════════════════════════
// AEGIS AI — riskScorer.ts
//
// Takes the raw findings from detectionEngine and applies context
// multipliers to produce a final 0-100 exposure score + level.
//
// Context factors (platform + content signals) can amplify risk:
//   sourceCode   → user is a developer, secrets more likely real
//   customerData → findings affect third parties (GDPR/HIPAA concern)
//   internalDocs → proprietary business data
//   contracts    → legal/financial documents
//
// The final score is capped at 100 to keep it readable.
// ═══════════════════════════════════════════════════════════════

import type { Finding, Category } from "./detectionEngine";
import { SEVERITY_SCORES } from "./detectionEngine";

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface Context {
  sourceCode?:   boolean;
  customerData?: boolean;
  internalDocs?: boolean;
  contracts?:    boolean;
  platform?:     "ChatGPT" | "Claude" | "Gemini" | "API" | "Unknown";
}

export interface ExposureResult {
  score:       number;
  level:       RiskLevel;
  explanation: string[];
}

const CONTEXT_WEIGHTS: Record<string, number> = {
  sourceCode:   20,
  internalDocs: 15,
  customerData: 25,
  contracts:    15,
};

// Per-platform risk addition (some platforms retain data more aggressively)
const PLATFORM_WEIGHTS: Record<string, number> = {
  ChatGPT: 5,
  Gemini:  5,
  Claude:  0,
  API:     0,
  Unknown: 0,
};

const LEVEL_THRESHOLDS: { min: number; level: RiskLevel }[] = [
  { min: 80, level: "CRITICAL" },
  { min: 50, level: "HIGH"     },
  { min: 25, level: "MEDIUM"   },
  { min:  1, level: "LOW"      },
  { min:  0, level: "NONE"     },
];

function getLevel(score: number): RiskLevel {
  return LEVEL_THRESHOLDS.find((t) => score >= t.min)?.level ?? "NONE";
}

// ─────────────────────────────────────────────
// Deduplicate findings by type before scoring
// (multiple JWT tokens still count once per type)
// ─────────────────────────────────────────────

function uniqueByType(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    if (seen.has(f.type)) return false;
    seen.add(f.type);
    return true;
  });
}

// ─────────────────────────────────────────────
// calculateExposure(findings, context) → ExposureResult
// ─────────────────────────────────────────────

export function calculateExposure(findings: Finding[], context: Context = {}): ExposureResult {
  if (!findings || findings.length === 0) {
    return { score: 0, level: "NONE", explanation: ["No sensitive findings detected."] };
  }

  const unique = uniqueByType(findings);
  const explanation: string[] = [];
  let findingScore = 0;
  let contextScore = 0;

  for (const f of unique) {
    const w = SEVERITY_SCORES[f.severity];
    findingScore += w;
    explanation.push(`${f.description} (+${w} pts)`);
  }

  for (const [key, weight] of Object.entries(CONTEXT_WEIGHTS)) {
    if ((context as Record<string, unknown>)[key] === true) {
      contextScore += weight;
      explanation.push(`Context: ${key} (+${weight} pts)`);
    }
  }

  const platformBonus = PLATFORM_WEIGHTS[context.platform ?? "Unknown"] ?? 0;
  if (platformBonus > 0) {
    contextScore += platformBonus;
    explanation.push(`Platform: ${context.platform} (+${platformBonus} pts)`);
  }

  const finalScore = Math.min(findingScore + contextScore, 100);
  const level = getLevel(finalScore);

  explanation.unshift(
    `Exposure score: ${finalScore}/100 — ${level} (findings: ${findingScore} + context: ${contextScore})`
  );

  return { score: finalScore, level, explanation };
}
