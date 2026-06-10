import type { Finding } from "./detectionEngine";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
export interface Context {
    sourceCode?: boolean;
    customerData?: boolean;
    internalDocs?: boolean;
    contracts?: boolean;
    platform?: "ChatGPT" | "Claude" | "Gemini" | "API" | "Unknown";
}
export interface ExposureResult {
    score: number;
    level: RiskLevel;
    explanation: string[];
}
export declare function calculateExposure(findings: Finding[], context?: Context): ExposureResult;
//# sourceMappingURL=riskScorer.d.ts.map