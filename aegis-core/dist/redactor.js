"use strict";
// ═══════════════════════════════════════════════════════════════
// AEGIS AI — redactor.ts
//
// Replaces sensitive values with [REDACTED:<TYPE>] markers.
// Preserves the key/label so code/configs remain readable:
//   password=secret123  →  password=[REDACTED:PASSWORD]
//   AKIA1234...         →  [REDACTED:AWS_ACCESS_KEY]
//
// Each redaction function is aligned 1:1 with a pattern in
// detectionEngine.ts so they always match the same strings.
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
function redact(text) {
    if (!text || text.trim() === "")
        return text;
    let r = text;
    // CREDENTIALS
    r = r.replace(/(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/g, "[REDACTED:AWS_ACCESS_KEY]");
    r = r.replace(/((?:aws[_\-.]?secret[_\-.]?(?:access[_\-.]?)?key)\s*[=:]\s*)([^\s"']{10,})/gi, "$1[REDACTED:AWS_SECRET_KEY]");
    r = r.replace(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "[REDACTED:PRIVATE_KEY_PEM]");
    r = r.replace(/ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/g, "[REDACTED:GITHUB_TOKEN]");
    r = r.replace(/sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}|sk-proj-[A-Za-z0-9\-_]{50,}/g, "[REDACTED:OPENAI_API_KEY]");
    r = r.replace(/xox[baprs]-[A-Za-z0-9\-]{10,}/g, "[REDACTED:SLACK_TOKEN]");
    r = r.replace(/sk_live_[A-Za-z0-9]{24,}/g, "[REDACTED:STRIPE_KEY]");
    r = r.replace(/sk_test_[A-Za-z0-9]{24,}/g, "[REDACTED:STRIPE_KEY_TEST]");
    r = r.replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/g, "[REDACTED:JWT]");
    r = r.replace(/((?:postgres|postgresql|mysql|mongodb|redis|mssql|sqlserver):\/\/)([^\s"'<>]+)/gi, "$1[REDACTED:DB_CONNECTION_STRING]");
    r = r.replace(/((?:password|db_password|database_password|passwd|pwd|secret)\s*[=:]\s*["']?)([^\s"']{4,})(["']?)/gi, "$1[REDACTED:PASSWORD]$3");
    r = r.replace(/((?:api[_\-.]?key|api[_\-.]?secret|access[_\-.]?token|auth[_\-.]?token)\s*[=:]\s*["']?)([A-Za-z0-9\-_]{16,})(["']?)/gi, "$1[REDACTED:API_KEY]$3");
    // PII
    r = r.replace(/\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g, "[REDACTED:SSN]");
    // FINANCIAL
    r = r.replace(/\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}(?:\d[-\s]?\d{3})?\b/g, "[REDACTED:CREDIT_CARD]");
    return r;
}
//# sourceMappingURL=redactor.js.map