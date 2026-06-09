"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — exposureEngine.js
// Calculates combined exposure risk from findings + context.
// Must be loaded BEFORE content.js (listed first in manifest.json).
// ═══════════════════════════════════════════════════════════════

const FINDING_WEIGHTS = {
  AWS_ACCESS_KEY:       50,
  AWS_SECRET_KEY:       50,
  PASSWORD:             40,
  API_KEY:              40,
  JWT:                  30,
  DB_CONNECTION_STRING: 40,
};

const CONTEXT_WEIGHTS = {
  sourceCode:   20,
  internalDocs: 20,
  customerData: 30,
  contracts:    15,
};

const LEVEL_THRESHOLDS = [
  { min: 80, level: "CRITICAL" },
  { min: 50, level: "HIGH"     },
  { min: 25, level: "MEDIUM"   },
  { min:  1, level: "LOW"      },
  { min:  0, level: "NONE"     },
];

function getLevel(score) {
  const match = LEVEL_THRESHOLDS.find((t) => score >= t.min);
  return match ? match.level : "NONE";
}

function calculateExposure(findings, context) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return { score: 0, level: "NONE", explanation: ["No sensitive findings detected."] };
  }

  if (typeof context !== "object" || context === null) context = {};

  let findingScore = 0;
  let contextScore = 0;
  const explanation = [];

  for (const finding of findings) {
    const weight = FINDING_WEIGHTS[finding.type] ?? 10;
    findingScore += weight;
    explanation.push(`${finding.type} detected (+${weight} points)`);
  }

  for (const [key, weight] of Object.entries(CONTEXT_WEIGHTS)) {
    if (context[key] === true) {
      contextScore += weight;
      explanation.push(`Context: ${key} (+${weight} points)`);
    }
  }

  const finalScore = Math.min(findingScore + contextScore, 100);
  const level = getLevel(finalScore);

  explanation.unshift(
    `Total exposure score: ${finalScore}/100 — Level: ${level} (Findings: ${findingScore} + Context: ${contextScore})`
  );

  return { score: finalScore, level, explanation };
}
