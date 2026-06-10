// ═══════════════════════════════════════════════════════════════
// AEGIS AI — detectionEngine.ts
//
// Two-layer detection:
//   Layer 1 (this file): Regex patterns + dictionary heuristics.
//     Runs in the Chrome extension (no network, instant).
//   Layer 2 (nlp/): compromise.js NLP on the backend Node server.
//     Called for deeper contextual analysis when needed.
//
// Categories:
//   CREDENTIALS  — secrets, API keys, tokens, private keys
//   PII          — personally identifiable information
//   PHI          — protected health information (HIPAA)
//   FINANCIAL    — card numbers, bank details
//   SOURCE_CODE  — code/config patterns that shouldn't leave devs
// ═══════════════════════════════════════════════════════════════

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

// ─────────────────────────────────────────────
// PATTERN LIBRARY
// Each pattern has a human-readable description and a risk
// explanation shown in the modal and dashboard.
// ─────────────────────────────────────────────

export const PATTERNS: Pattern[] = [

  // ── CREDENTIALS ──────────────────────────────────────────────

  {
    type: "AWS_ACCESS_KEY",
    category: "CREDENTIALS",
    severity: "CRITICAL",
    regex: /(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/,
    description: "AWS Access Key ID",
    riskExplanation: "Full AWS account access. Attackers scan AI logs. Average time to exploit: 4 minutes.",
  },
  {
    type: "AWS_SECRET_KEY",
    category: "CREDENTIALS",
    severity: "CRITICAL",
    regex: /(?:aws[_\-.]?secret[_\-.]?(?:access[_\-.]?)?key)\s*[=:]\s*[^\s"']{10,}/i,
    description: "AWS Secret Access Key",
    riskExplanation: "Complete cloud takeover — spin up servers, drain S3 buckets, run up thousands in charges.",
  },
  {
    type: "PRIVATE_KEY_PEM",
    category: "CREDENTIALS",
    severity: "CRITICAL",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    description: "PEM Private Key",
    riskExplanation: "Private key exposure allows impersonation, decryption of past traffic, and signing malicious content.",
  },
  {
    type: "GITHUB_TOKEN",
    category: "CREDENTIALS",
    severity: "CRITICAL",
    regex: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/,
    description: "GitHub Personal Access Token",
    riskExplanation: "Read/write access to all repositories this token has access to. Can exfiltrate all source code.",
  },
  {
    type: "OPENAI_API_KEY",
    category: "CREDENTIALS",
    severity: "HIGH",
    regex: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}|sk-proj-[A-Za-z0-9\-_]{50,}/,
    description: "OpenAI API Key",
    riskExplanation: "Your credits get stolen and every conversation you've had becomes readable to the attacker.",
  },
  {
    type: "SLACK_TOKEN",
    category: "CREDENTIALS",
    severity: "HIGH",
    regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/,
    description: "Slack Token",
    riskExplanation: "Full access to Slack workspace — read all messages, channels, files, and DMs.",
  },
  {
    type: "STRIPE_KEY",
    category: "CREDENTIALS",
    severity: "CRITICAL",
    regex: /sk_live_[A-Za-z0-9]{24,}/,
    description: "Stripe Live Secret Key",
    riskExplanation: "Full access to process payments, issue refunds, create charges, and read customer card data.",
  },
  {
    type: "STRIPE_KEY_TEST",
    category: "CREDENTIALS",
    severity: "MEDIUM",
    regex: /sk_test_[A-Za-z0-9]{24,}/,
    description: "Stripe Test Secret Key",
    riskExplanation: "Test key exposure reveals your Stripe account structure and can be used for reconnaissance.",
  },
  {
    type: "JWT",
    category: "CREDENTIALS",
    severity: "HIGH",
    regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/,
    description: "JSON Web Token (JWT)",
    riskExplanation: "Session hijack — attacker logs in as you instantly, no password needed.",
  },
  {
    type: "DB_CONNECTION_STRING",
    category: "CREDENTIALS",
    severity: "CRITICAL",
    regex: /(?:postgres|postgresql|mysql|mongodb|redis|mssql|sqlserver):\/\/[^\s"'<>]+/i,
    description: "Database Connection String",
    riskExplanation: "Direct read, write, and delete access to your entire database. All data exposed.",
  },
  {
    type: "PASSWORD",
    category: "CREDENTIALS",
    severity: "HIGH",
    regex: /(?:password|db_password|database_password|passwd|pwd|secret)\s*[=:]\s*["']?[^\s"']{4,}["']?/i,
    description: "Hardcoded Password",
    riskExplanation: "Account takeover on every service where this password is reused.",
  },
  {
    type: "API_KEY_GENERIC",
    category: "CREDENTIALS",
    severity: "HIGH",
    regex: /(?:api[_\-.]?key|api[_\-.]?secret|access[_\-.]?token|auth[_\-.]?token)\s*[=:]\s*["']?[A-Za-z0-9\-_]{16,}["']?/i,
    description: "API Key or Access Token",
    riskExplanation: "Unauthorized access to the associated service — data exfiltration and impersonation possible.",
  },

  // ── PII ───────────────────────────────────────────────────────

  {
    type: "SSN",
    category: "PII",
    severity: "CRITICAL",
    regex: /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/,
    description: "Social Security Number (SSN)",
    riskExplanation: "Identity theft enabler. SSNs are used to open credit, file taxes, and impersonate victims for years.",
  },
  {
    type: "PASSPORT_NUMBER",
    category: "PII",
    severity: "HIGH",
    regex: /\b[A-Z]{1,2}[0-9]{6,9}\b/,
    description: "Passport Number",
    riskExplanation: "Used for identity theft and fraudulent travel document applications.",
  },
  {
    type: "DRIVERS_LICENSE",
    category: "PII",
    severity: "HIGH",
    regex: /\b(?:DL|driver[s']?\s*(?:license|licence)|license\s*(?:no|number|#))[:\s]*[A-Z0-9\-]{5,15}\b/i,
    description: "Driver's License Number",
    riskExplanation: "Government-issued ID used for identity theft and fraudulent financial applications.",
  },
  {
    type: "EMAIL_ADDRESS",
    category: "PII",
    severity: "LOW",
    regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/,
    description: "Email Address",
    riskExplanation: "Target for phishing and credential stuffing. Combined with other data, enables identity theft.",
  },
  {
    type: "PHONE_NUMBER",
    category: "PII",
    severity: "LOW",
    regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/,
    description: "Phone Number",
    riskExplanation: "Enables SIM swapping attacks and targeted social engineering.",
  },
  {
    type: "IP_ADDRESS_INTERNAL",
    category: "PII",
    severity: "MEDIUM",
    regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/,
    description: "Internal IP Address",
    riskExplanation: "Reveals internal network topology, enabling targeted attacks against internal services.",
  },

  // ── PHI (HIPAA Protected Health Information) ──────────────────

  {
    type: "MEDICAL_RECORD_NUMBER",
    category: "PHI",
    severity: "HIGH",
    regex: /\b(?:MRN|medical\s*record(?:\s*(?:no|number|#))?|patient\s*(?:id|number|#))[:\s]*[A-Z0-9\-]{4,15}\b/i,
    description: "Medical Record Number",
    riskExplanation: "HIPAA violation. Exposes patient identity and medical history to unauthorized parties.",
  },
  {
    type: "HEALTH_INSURANCE_ID",
    category: "PHI",
    severity: "HIGH",
    regex: /\b(?:insurance\s*(?:id|number|member\s*id)|policy\s*(?:no|number)|member\s*(?:id|number))[:\s]*[A-Z0-9\-]{6,20}\b/i,
    description: "Health Insurance ID",
    riskExplanation: "Insurance fraud enabler. Can be used to file fraudulent medical claims.",
  },
  {
    type: "DATE_OF_BIRTH",
    category: "PHI",
    severity: "MEDIUM",
    regex: /\b(?:DOB|date\s*of\s*birth|born(?:\s*on)?)[:\s]*(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\w+ \d{1,2},?\s*\d{4})\b/i,
    description: "Date of Birth",
    riskExplanation: "Combined with name, DOB is used to verify identity for account takeovers and fraud.",
  },
  {
    type: "DIAGNOSIS_CODE",
    category: "PHI",
    severity: "MEDIUM",
    regex: /\b(?:ICD[-\s]?(?:9|10|11)(?:\s*code)?|diagnosis)[:\s]*[A-Z]\d{2}\.?\d{0,4}\b/i,
    description: "Medical Diagnosis Code (ICD)",
    riskExplanation: "Reveals private medical conditions. HIPAA violation with significant legal and financial penalties.",
  },

  // ── FINANCIAL ─────────────────────────────────────────────────

  {
    type: "CREDIT_CARD_NUMBER",
    category: "FINANCIAL",
    severity: "CRITICAL",
    // Matches Visa (4), Mastercard (5), Amex (3), Discover (6) — with optional separators
    regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}(?:\d[-\s]?\d{3})?\b/,
    description: "Credit / Debit Card Number",
    riskExplanation: "Direct financial fraud. Card numbers can be used immediately for CNP (card-not-present) purchases.",
  },
  {
    type: "BANK_ACCOUNT_NUMBER",
    category: "FINANCIAL",
    severity: "HIGH",
    regex: /\b(?:account(?:\s*(?:no|number|#))|acct(?:\s*(?:no|number|#)))[:\s]*\d{6,17}\b/i,
    description: "Bank Account Number",
    riskExplanation: "Enables fraudulent wire transfers and unauthorized ACH transactions.",
  },
  {
    type: "BANK_ROUTING_NUMBER",
    category: "FINANCIAL",
    severity: "HIGH",
    regex: /\b(?:routing(?:\s*(?:no|number|#))|ABA|RTN)[:\s]*0[0-9]{8}\b/i,
    description: "Bank Routing Number",
    riskExplanation: "Combined with account number enables ACH fraud and check counterfeiting.",
  },
  {
    type: "IBAN",
    category: "FINANCIAL",
    severity: "HIGH",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b/,
    description: "IBAN (International Bank Account Number)",
    riskExplanation: "Exposes international bank account details used to initiate fraudulent transfers.",
  },

  // ── SOURCE CODE ───────────────────────────────────────────────

  {
    type: "ENV_FILE_CONTENT",
    category: "SOURCE_CODE",
    severity: "HIGH",
    regex: /^(?:[A-Z][A-Z0-9_]+=.+\n?){3,}/m,
    description: ".env File Content",
    riskExplanation: "Environment files contain multiple secrets. Even seemingly innocuous values reveal system architecture.",
  },
  {
    type: "INTERNAL_HOSTNAME",
    category: "SOURCE_CODE",
    severity: "MEDIUM",
    regex: /\b(?:internal|corp|intranet|staging|dev|prod|uat)\.[a-z0-9\-]+\.(?:com|net|internal|local)\b/i,
    description: "Internal Hostname",
    riskExplanation: "Reveals internal infrastructure and naming conventions, aiding targeted attacks.",
  },
];

// ─────────────────────────────────────────────
// SEVERITY SCORES (used by riskScorer)
// ─────────────────────────────────────────────

export const SEVERITY_SCORES: Record<Severity, number> = {
  CRITICAL: 50,
  HIGH:     25,
  MEDIUM:   10,
  LOW:       5,
};

// ─────────────────────────────────────────────
// scan(text) → ScanResult
// Runs all patterns against the input text.
// Returns findings, a raw score, and the set of categories hit.
// ─────────────────────────────────────────────

export function scan(text: string): ScanResult {
  if (!text || text.trim() === "") {
    return { findings: [], rawScore: 0, categories: new Set() };
  }

  const findings: Finding[] = [];
  let rawScore = 0;
  const categories = new Set<Category>();

  for (const pattern of PATTERNS) {
    const globalRegex = new RegExp(pattern.regex.source, "gim");
    const matches = [...text.matchAll(globalRegex)];

    for (const match of matches) {
      if (match[0].includes("[REDACTED]")) continue;

      findings.push({
        type:            pattern.type,
        category:        pattern.category,
        severity:        pattern.severity,
        match:           match[0],
        description:     pattern.description,
        riskExplanation: pattern.riskExplanation,
      });

      rawScore += SEVERITY_SCORES[pattern.severity];
      categories.add(pattern.category);
    }
  }

  return { findings, rawScore: Math.min(rawScore, 100), categories };
}
