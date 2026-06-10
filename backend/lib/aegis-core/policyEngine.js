"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POLICY = void 0;
exports.evaluate = evaluate;
exports.DEFAULT_POLICY = {
    rules: [
        { id: "default-critical", riskLevel: "CRITICAL", action: "BLOCK", reason: "Critical risk always blocked by default" },
        { id: "default-high", riskLevel: "HIGH", action: "WARN", reason: "High risk requires acknowledgment" },
        { id: "default-medium", riskLevel: "MEDIUM", action: "WARN", reason: "Medium risk flagged for review" },
        { id: "default-low", riskLevel: "LOW", action: "ALLOW", reason: "Low risk allowed with logging" },
    ],
    defaultAction: "ALLOW",
};
const LEVEL_ORDER = {
    NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};
// ─────────────────────────────────────────────
// evaluate(riskLevel, categories, policy)
// Returns the most restrictive matching action.
// ─────────────────────────────────────────────
function evaluate(riskLevel, categories, policy = exports.DEFAULT_POLICY) {
    let mostRestrictiveAction = policy.defaultAction;
    let matchedRule;
    const actionOrder = { ALLOW: 0, WARN: 1, BLOCK: 2 };
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
//# sourceMappingURL=policyEngine.js.map