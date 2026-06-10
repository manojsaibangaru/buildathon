// AEGIS AI — aegis-core public API
export { scan, PATTERNS, SEVERITY_SCORES }       from "./detectionEngine";
export type { Pattern, Finding, ScanResult, Category, Severity } from "./detectionEngine";

export { calculateExposure }                       from "./riskScorer";
export type { ExposureResult, RiskLevel, Context } from "./riskScorer";

export { redact }                                  from "./redactor";

export { evaluate, DEFAULT_POLICY }                from "./policyEngine";
export type { PolicyRule, PolicyConfig, Action }   from "./policyEngine";
