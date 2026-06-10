// ═══════════════════════════════════════════════════════════════
// AEGIS AI — policyEngine.ts
//
// Evaluates a scan result against an organization's policy rules
// and returns a recommended action: BLOCK, WARN, or ALLOW.
//
// Policy rules are stored in Supabase and fetched by the backend.
// The extension gets a simplified policy snapshot via chrome.storage
// (synced from the backend on startup / periodically).
//
// Default policy (no rules configured):
//   CRITICAL → BLOCK
//   HIGH     → WARN
//   MEDIUM   → WARN
//   LOW      → ALLOW
// ═══════════════════════════════════════════════════════════════

import type { Category, Severity } from "./detectionEngine";
import type { RiskLevel } from "./riskScorer";

export type Action = "BLOCK" | "WARN" | "ALLOW";

export interface PolicyRule {
  id:        string;
  category?: Category;   // if set, matches findings of this category
  severity?: Severity;   // if set, matches findings at this severity or above
  riskLevel?: RiskLevel; // if set, matches when overall risk is at this level
  action:    Action;
  reason?:   string;
}

export interface PolicyConfig {
  orgId?:     string;
  rules:      PolicyRule[];
  defaultAction: Action;
}

export const DEFAULT_POLICY: PolicyConfig = {
  rules: [
    { id: "default-critical", riskLevel: "CRITICAL", action: "BLOCK",  reason: "Critical risk always blocked by default" },
    { id: "default-high",     riskLevel: "HIGH",     action: "WARN",   reason: "High risk requires acknowledgment"       },
    { id: "default-medium",   riskLevel: "MEDIUM",   action: "WARN",   reason: "Medium risk flagged for review"          },
    { id: "default-low",      riskLevel: "LOW",      action: "ALLOW",  reason: "Low risk allowed with logging"           },
  ],
  defaultAction: "ALLOW",
};

const LEVEL_ORDER: Record<RiskLevel, number> = {
  NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

// ─────────────────────────────────────────────
// evaluate(riskLevel, categories, policy)
// Returns the most restrictive matching action.
// ─────────────────────────────────────────────

export function evaluate(
  riskLevel: RiskLevel,
  categories: Set<Category>,
  policy: PolicyConfig = DEFAULT_POLICY,
): { action: Action; matchedRule?: PolicyRule } {
  let mostRestrictiveAction: Action = policy.defaultAction;
  let matchedRule: PolicyRule | undefined;

  const actionOrder: Record<Action, number> = { ALLOW: 0, WARN: 1, BLOCK: 2 };

  for (const rule of policy.rules) {
    let matches = false;

    if (rule.riskLevel && LEVEL_ORDER[riskLevel] >= LEVEL_ORDER[rule.riskLevel]) {
      matches = true;
    }
    if (rule.category && categories.has(rule.category)) {
      matches = true;
    }

    if (matches) {
      if (actionOrder[rule.action] > actionOrder[mostRestrictiveAction]) {
        mostRestrictiveAction = rule.action;
        matchedRule = rule;
      }
    }
  }

  return { action: mostRestrictiveAction, matchedRule };
}
