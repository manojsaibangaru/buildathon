import type { Category, Severity } from "./detectionEngine";
import type { RiskLevel } from "./riskScorer";
export type Action = "BLOCK" | "WARN" | "ALLOW";
export interface PolicyRule {
    id: string;
    category?: Category;
    severity?: Severity;
    riskLevel?: RiskLevel;
    action: Action;
    reason?: string;
}
export interface PolicyConfig {
    orgId?: string;
    rules: PolicyRule[];
    defaultAction: Action;
}
export declare const DEFAULT_POLICY: PolicyConfig;
export declare function evaluate(riskLevel: RiskLevel, categories: Set<Category>, policy?: PolicyConfig): {
    action: Action;
    matchedRule?: PolicyRule;
};
//# sourceMappingURL=policyEngine.d.ts.map