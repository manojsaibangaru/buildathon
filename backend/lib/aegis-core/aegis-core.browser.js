"use strict";
var AegisCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    DEFAULT_POLICY: () => DEFAULT_POLICY,
    PATTERNS: () => PATTERNS,
    SEVERITY_SCORES: () => SEVERITY_SCORES,
    calculateExposure: () => calculateExposure,
    evaluate: () => evaluate,
    redact: () => redact,
    scan: () => scan
  });

  // src/detectionEngine.ts
  var PATTERNS = [
    // ── CREDENTIALS ──────────────────────────────────────────────
    {
      type: "AWS_ACCESS_KEY",
      category: "CREDENTIALS",
      severity: "CRITICAL",
      regex: /(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/,
      description: "AWS Access Key ID",
      riskExplanation: "Full AWS account access. Attackers scan AI logs. Average time to exploit: 4 minutes."
    },
    {
      type: "AWS_SECRET_KEY",
      category: "CREDENTIALS",
      severity: "CRITICAL",
      regex: /(?:aws[_\-.]?secret[_\-.]?(?:access[_\-.]?)?key)\s*[=:]\s*[^\s"']{10,}/i,
      description: "AWS Secret Access Key",
      riskExplanation: "Complete cloud takeover \u2014 spin up servers, drain S3 buckets, run up thousands in charges."
    },
    {
      type: "PRIVATE_KEY_PEM",
      category: "CREDENTIALS",
      severity: "CRITICAL",
      regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
      description: "PEM Private Key",
      riskExplanation: "Private key exposure allows impersonation, decryption of past traffic, and signing malicious content."
    },
    {
      type: "GITHUB_TOKEN",
      category: "CREDENTIALS",
      severity: "CRITICAL",
      regex: /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/,
      description: "GitHub Personal Access Token",
      riskExplanation: "Read/write access to all repositories this token has access to. Can exfiltrate all source code."
    },
    {
      type: "OPENAI_API_KEY",
      category: "CREDENTIALS",
      severity: "HIGH",
      regex: /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}|sk-proj-[A-Za-z0-9\-_]{50,}/,
      description: "OpenAI API Key",
      riskExplanation: "Your credits get stolen and every conversation you've had becomes readable to the attacker."
    },
    {
      type: "SLACK_TOKEN",
      category: "CREDENTIALS",
      severity: "HIGH",
      regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/,
      description: "Slack Token",
      riskExplanation: "Full access to Slack workspace \u2014 read all messages, channels, files, and DMs."
    },
    {
      type: "STRIPE_KEY",
      category: "CREDENTIALS",
      severity: "CRITICAL",
      regex: /sk_live_[A-Za-z0-9]{24,}/,
      description: "Stripe Live Secret Key",
      riskExplanation: "Full access to process payments, issue refunds, create charges, and read customer card data."
    },
    {
      type: "STRIPE_KEY_TEST",
      category: "CREDENTIALS",
      severity: "MEDIUM",
      regex: /sk_test_[A-Za-z0-9]{24,}/,
      description: "Stripe Test Secret Key",
      riskExplanation: "Test key exposure reveals your Stripe account structure and can be used for reconnaissance."
    },
    {
      type: "JWT",
      category: "CREDENTIALS",
      severity: "HIGH",
      regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/,
      description: "JSON Web Token (JWT)",
      riskExplanation: "Session hijack \u2014 attacker logs in as you instantly, no password needed."
    },
    {
      type: "DB_CONNECTION_STRING",
      category: "CREDENTIALS",
      severity: "CRITICAL",
      regex: /(?:postgres|postgresql|mysql|mongodb|redis|mssql|sqlserver):\/\/[^\s"'<>]+/i,
      description: "Database Connection String",
      riskExplanation: "Direct read, write, and delete access to your entire database. All data exposed."
    },
    {
      type: "PASSWORD",
      category: "CREDENTIALS",
      severity: "HIGH",
      regex: /(?:password|db_password|database_password|passwd|pwd|secret)\s*[=:]\s*["']?[^\s"']{4,}["']?/i,
      description: "Hardcoded Password",
      riskExplanation: "Account takeover on every service where this password is reused."
    },
    {
      type: "API_KEY_GENERIC",
      category: "CREDENTIALS",
      severity: "HIGH",
      regex: /(?:api[_\-.]?key|api[_\-.]?secret|access[_\-.]?token|auth[_\-.]?token)\s*[=:]\s*["']?[A-Za-z0-9\-_]{16,}["']?/i,
      description: "API Key or Access Token",
      riskExplanation: "Unauthorized access to the associated service \u2014 data exfiltration and impersonation possible."
    },
    // ── PII ───────────────────────────────────────────────────────
    {
      type: "SSN",
      category: "PII",
      severity: "CRITICAL",
      regex: /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/,
      description: "Social Security Number (SSN)",
      riskExplanation: "Identity theft enabler. SSNs are used to open credit, file taxes, and impersonate victims for years."
    },
    {
      type: "PASSPORT_NUMBER",
      category: "PII",
      severity: "HIGH",
      regex: /\b[A-Z]{1,2}[0-9]{6,9}\b/,
      description: "Passport Number",
      riskExplanation: "Used for identity theft and fraudulent travel document applications."
    },
    {
      type: "DRIVERS_LICENSE",
      category: "PII",
      severity: "HIGH",
      regex: /\b(?:DL|driver[s']?\s*(?:license|licence)|license\s*(?:no|number|#))[:\s]*[A-Z0-9\-]{5,15}\b/i,
      description: "Driver's License Number",
      riskExplanation: "Government-issued ID used for identity theft and fraudulent financial applications."
    },
    {
      type: "EMAIL_ADDRESS",
      category: "PII",
      severity: "LOW",
      regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/,
      description: "Email Address",
      riskExplanation: "Target for phishing and credential stuffing. Combined with other data, enables identity theft."
    },
    {
      type: "PHONE_NUMBER",
      category: "PII",
      severity: "LOW",
      regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/,
      description: "Phone Number",
      riskExplanation: "Enables SIM swapping attacks and targeted social engineering."
    },
    {
      type: "IP_ADDRESS_INTERNAL",
      category: "PII",
      severity: "MEDIUM",
      regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/,
      description: "Internal IP Address",
      riskExplanation: "Reveals internal network topology, enabling targeted attacks against internal services."
    },
    // ── PHI (HIPAA Protected Health Information) ──────────────────
    {
      type: "MEDICAL_RECORD_NUMBER",
      category: "PHI",
      severity: "HIGH",
      regex: /\b(?:MRN|medical\s*record(?:\s*(?:no|number|#))?|patient\s*(?:id|number|#))[:\s]*[A-Z0-9\-]{4,15}\b/i,
      description: "Medical Record Number",
      riskExplanation: "HIPAA violation. Exposes patient identity and medical history to unauthorized parties."
    },
    {
      type: "HEALTH_INSURANCE_ID",
      category: "PHI",
      severity: "HIGH",
      regex: /\b(?:insurance\s*(?:id|number|member\s*id)|policy\s*(?:no|number)|member\s*(?:id|number))[:\s]*[A-Z0-9\-]{6,20}\b/i,
      description: "Health Insurance ID",
      riskExplanation: "Insurance fraud enabler. Can be used to file fraudulent medical claims."
    },
    {
      type: "DATE_OF_BIRTH",
      category: "PHI",
      severity: "MEDIUM",
      regex: /\b(?:DOB|date\s*of\s*birth|born(?:\s*on)?)[:\s]*(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\w+ \d{1,2},?\s*\d{4})\b/i,
      description: "Date of Birth",
      riskExplanation: "Combined with name, DOB is used to verify identity for account takeovers and fraud."
    },
    {
      type: "DIAGNOSIS_CODE",
      category: "PHI",
      severity: "MEDIUM",
      regex: /\b(?:ICD[-\s]?(?:9|10|11)(?:\s*code)?|diagnosis)[:\s]*[A-Z]\d{2}\.?\d{0,4}\b/i,
      description: "Medical Diagnosis Code (ICD)",
      riskExplanation: "Reveals private medical conditions. HIPAA violation with significant legal and financial penalties."
    },
    // ── FINANCIAL ─────────────────────────────────────────────────
    {
      type: "CREDIT_CARD_NUMBER",
      category: "FINANCIAL",
      severity: "CRITICAL",
      // Matches Visa (4), Mastercard (5), Amex (3), Discover (6) — with optional separators
      regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}(?:\d[-\s]?\d{3})?\b/,
      description: "Credit / Debit Card Number",
      riskExplanation: "Direct financial fraud. Card numbers can be used immediately for CNP (card-not-present) purchases."
    },
    {
      type: "BANK_ACCOUNT_NUMBER",
      category: "FINANCIAL",
      severity: "HIGH",
      regex: /\b(?:account(?:\s*(?:no|number|#))|acct(?:\s*(?:no|number|#)))[:\s]*\d{6,17}\b/i,
      description: "Bank Account Number",
      riskExplanation: "Enables fraudulent wire transfers and unauthorized ACH transactions."
    },
    {
      type: "BANK_ROUTING_NUMBER",
      category: "FINANCIAL",
      severity: "HIGH",
      regex: /\b(?:routing(?:\s*(?:no|number|#))|ABA|RTN)[:\s]*0[0-9]{8}\b/i,
      description: "Bank Routing Number",
      riskExplanation: "Combined with account number enables ACH fraud and check counterfeiting."
    },
    {
      type: "IBAN",
      category: "FINANCIAL",
      severity: "HIGH",
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b/,
      description: "IBAN (International Bank Account Number)",
      riskExplanation: "Exposes international bank account details used to initiate fraudulent transfers."
    },
    // ── SOURCE CODE ───────────────────────────────────────────────
    {
      type: "ENV_FILE_CONTENT",
      category: "SOURCE_CODE",
      severity: "HIGH",
      regex: /^(?:[A-Z][A-Z0-9_]+=.+\n?){3,}/m,
      description: ".env File Content",
      riskExplanation: "Environment files contain multiple secrets. Even seemingly innocuous values reveal system architecture."
    },
    {
      type: "INTERNAL_HOSTNAME",
      category: "SOURCE_CODE",
      severity: "MEDIUM",
      regex: /\b(?:internal|corp|intranet|staging|dev|prod|uat)\.[a-z0-9\-]+\.(?:com|net|internal|local)\b/i,
      description: "Internal Hostname",
      riskExplanation: "Reveals internal infrastructure and naming conventions, aiding targeted attacks."
    }
  ];
  var SEVERITY_SCORES = {
    CRITICAL: 50,
    HIGH: 25,
    MEDIUM: 10,
    LOW: 5
  };
  function scan(text) {
    if (!text || text.trim() === "") {
      return { findings: [], rawScore: 0, categories: /* @__PURE__ */ new Set() };
    }
    const findings = [];
    let rawScore = 0;
    const categories = /* @__PURE__ */ new Set();
    for (const pattern of PATTERNS) {
      const globalRegex = new RegExp(pattern.regex.source, "gim");
      const matches = [...text.matchAll(globalRegex)];
      for (const match of matches) {
        if (match[0].includes("[REDACTED]")) continue;
        findings.push({
          type: pattern.type,
          category: pattern.category,
          severity: pattern.severity,
          match: match[0],
          description: pattern.description,
          riskExplanation: pattern.riskExplanation
        });
        rawScore += SEVERITY_SCORES[pattern.severity];
        categories.add(pattern.category);
      }
    }
    return { findings, rawScore: Math.min(rawScore, 100), categories };
  }

  // src/riskScorer.ts
  var CONTEXT_WEIGHTS = {
    sourceCode: 20,
    internalDocs: 15,
    customerData: 25,
    contracts: 15
  };
  var PLATFORM_WEIGHTS = {
    ChatGPT: 5,
    Gemini: 5,
    Claude: 0,
    API: 0,
    Unknown: 0
  };
  var LEVEL_THRESHOLDS = [
    { min: 80, level: "CRITICAL" },
    { min: 50, level: "HIGH" },
    { min: 25, level: "MEDIUM" },
    { min: 1, level: "LOW" },
    { min: 0, level: "NONE" }
  ];
  function getLevel(score) {
    return LEVEL_THRESHOLDS.find((t) => score >= t.min)?.level ?? "NONE";
  }
  function uniqueByType(findings) {
    const seen = /* @__PURE__ */ new Set();
    return findings.filter((f) => {
      if (seen.has(f.type)) return false;
      seen.add(f.type);
      return true;
    });
  }
  function calculateExposure(findings, context = {}) {
    if (!findings || findings.length === 0) {
      return { score: 0, level: "NONE", explanation: ["No sensitive findings detected."] };
    }
    const unique = uniqueByType(findings);
    const explanation = [];
    let findingScore = 0;
    let contextScore = 0;
    for (const f of unique) {
      const w = SEVERITY_SCORES[f.severity];
      findingScore += w;
      explanation.push(`${f.description} (+${w} pts)`);
    }
    for (const [key, weight] of Object.entries(CONTEXT_WEIGHTS)) {
      if (context[key] === true) {
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
      `Exposure score: ${finalScore}/100 \u2014 ${level} (findings: ${findingScore} + context: ${contextScore})`
    );
    return { score: finalScore, level, explanation };
  }

  // src/redactor.ts
  function redact(text) {
    if (!text || text.trim() === "") return text;
    let r = text;
    r = r.replace(
      /(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/g,
      "[REDACTED:AWS_ACCESS_KEY]"
    );
    r = r.replace(
      /((?:aws[_\-.]?secret[_\-.]?(?:access[_\-.]?)?key)\s*[=:]\s*)([^\s"']{10,})/gi,
      "$1[REDACTED:AWS_SECRET_KEY]"
    );
    r = r.replace(
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
      "[REDACTED:PRIVATE_KEY_PEM]"
    );
    r = r.replace(
      /ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}/g,
      "[REDACTED:GITHUB_TOKEN]"
    );
    r = r.replace(
      /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}|sk-proj-[A-Za-z0-9\-_]{50,}/g,
      "[REDACTED:OPENAI_API_KEY]"
    );
    r = r.replace(
      /xox[baprs]-[A-Za-z0-9\-]{10,}/g,
      "[REDACTED:SLACK_TOKEN]"
    );
    r = r.replace(
      /sk_live_[A-Za-z0-9]{24,}/g,
      "[REDACTED:STRIPE_KEY]"
    );
    r = r.replace(
      /sk_test_[A-Za-z0-9]{24,}/g,
      "[REDACTED:STRIPE_KEY_TEST]"
    );
    r = r.replace(
      /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/g,
      "[REDACTED:JWT]"
    );
    r = r.replace(
      /((?:postgres|postgresql|mysql|mongodb|redis|mssql|sqlserver):\/\/)([^\s"'<>]+)/gi,
      "$1[REDACTED:DB_CONNECTION_STRING]"
    );
    r = r.replace(
      /((?:password|db_password|database_password|passwd|pwd|secret)\s*[=:]\s*["']?)([^\s"']{4,})(["']?)/gi,
      "$1[REDACTED:PASSWORD]$3"
    );
    r = r.replace(
      /((?:api[_\-.]?key|api[_\-.]?secret|access[_\-.]?token|auth[_\-.]?token)\s*[=:]\s*["']?)([A-Za-z0-9\-_]{16,})(["']?)/gi,
      "$1[REDACTED:API_KEY]$3"
    );
    r = r.replace(
      /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
      "[REDACTED:SSN]"
    );
    r = r.replace(
      /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}(?:\d[-\s]?\d{3})?\b/g,
      "[REDACTED:CREDIT_CARD]"
    );
    return r;
  }

  // src/policyEngine.ts
  var DEFAULT_POLICY = {
    rules: [
      { id: "default-critical", riskLevel: "CRITICAL", action: "BLOCK", reason: "Critical risk always blocked by default" },
      { id: "default-high", riskLevel: "HIGH", action: "WARN", reason: "High risk requires acknowledgment" },
      { id: "default-medium", riskLevel: "MEDIUM", action: "WARN", reason: "Medium risk flagged for review" },
      { id: "default-low", riskLevel: "LOW", action: "ALLOW", reason: "Low risk allowed with logging" }
    ],
    defaultAction: "ALLOW"
  };
  var LEVEL_ORDER = {
    NONE: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  };
  function evaluate(riskLevel, categories, policy = DEFAULT_POLICY) {
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
  return __toCommonJS(src_exports);
})();
