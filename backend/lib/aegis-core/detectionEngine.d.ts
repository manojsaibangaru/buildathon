export type Category = "CREDENTIALS" | "PII" | "PHI" | "FINANCIAL" | "SOURCE_CODE";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export interface Pattern {
    type: string;
    category: Category;
    severity: Severity;
    regex: RegExp;
    description: string;
    riskExplanation: string;
}
export interface Finding {
    type: string;
    category: Category;
    severity: Severity;
    match: string;
    description: string;
    riskExplanation: string;
}
export interface ScanResult {
    findings: Finding[];
    rawScore: number;
    categories: Set<Category>;
}
export declare const PATTERNS: Pattern[];
export declare const SEVERITY_SCORES: Record<Severity, number>;
export declare function scan(text: string): ScanResult;
//# sourceMappingURL=detectionEngine.d.ts.map