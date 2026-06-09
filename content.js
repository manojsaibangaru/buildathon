"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — content.js
// Depends on: exposureEngine.js, modal.js (loaded before this)
// Intercepts: Paste events + Enter key
// Send button interception removed — React bypasses preventDefault
// ═══════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────
// SECTION 1: DETECTION PATTERNS
// ─────────────────────────────────────────────

const PATTERNS = [
  { type: "AWS_ACCESS_KEY",       severity: "CRITICAL", regex: /(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/ },
  { type: "AWS_SECRET_KEY",       severity: "CRITICAL", regex: /(?:aws[_\-\.]?secret[_\-\.]?(?:access[_\-\.]?)?key)\s*=\s*[^\s"']{10,}/i },
  { type: "PASSWORD",             severity: "HIGH",     regex: /(?:password|db_password|database_password|passwd|pwd)\s*=\s*\S+/i },
  { type: "API_KEY",              severity: "HIGH",     regex: /(?:api[_\-\.]?key|openai[_\-\.]?api[_\-\.]?key)\s*=\s*[^\s"']{8,}/i },
  { type: "JWT",                  severity: "HIGH",     regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/ },
  { type: "DB_CONNECTION_STRING", severity: "CRITICAL", regex: /(?:postgres|mysql|mongodb):\/\/[^\s"'<>]+/i },
];

const SEVERITY_SCORES = { CRITICAL: 50, HIGH: 25, MEDIUM: 10, LOW: 5 };


// ─────────────────────────────────────────────
// SECTION 2: scanPrompt(text)
// ─────────────────────────────────────────────

function scanPrompt(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return { findings: [], score: 0 };
  }

  const findings = [];
  let rawScore = 0;

  for (const { type, severity, regex } of PATTERNS) {
    const globalRegex = new RegExp(regex.source, "gi");
    const matches = [...text.matchAll(globalRegex)];
    if (!matches.length) continue;
    for (const match of matches) {
      findings.push({ type, severity, match: match[0] });
      rawScore += SEVERITY_SCORES[severity];
    }
  }

  return { findings, score: Math.min(rawScore, 100) };
}


// ─────────────────────────────────────────────
// SECTION 3: redactSecrets(text)
// ─────────────────────────────────────────────

function redactSecrets(text) {
  if (typeof text !== "string" || text.trim() === "") return text;

  let r = text;
  r = r.replace(/(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])/g, "[REDACTED]");
  r = r.replace(/(aws[_\-\.]?secret[_\-\.]?(?:access[_\-\.]?)?key\s*=\s*)([^\s"']{10,})/gi, "$1[REDACTED]");
  r = r.replace(/((?:password|db_password|database_password|passwd|pwd)\s*=\s*)(\S+)/gi, "$1[REDACTED]");
  r = r.replace(/((?:api[_\-\.]?key|openai[_\-\.]?api[_\-\.]?key)\s*=\s*)([^\s"']{8,})/gi, "$1[REDACTED]");
  r = r.replace(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_\-]+/g, "[REDACTED]");
  r = r.replace(/((?:postgres|mysql|mongodb):\/\/)([^\s"'<>]+)/gi, "$1[REDACTED]");
  return r;
}


// ─────────────────────────────────────────────
// SECTION 4: getPlatformContext()
// ─────────────────────────────────────────────

function getPlatformContext() {
  const host = window.location.hostname;
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com"))
    return { sourceCode: true,  internalDocs: true,  customerData: false, contracts: false };
  if (host.includes("claude.ai"))
    return { sourceCode: false, internalDocs: true,  customerData: false, contracts: true  };
  if (host.includes("gemini.google.com"))
    return { sourceCode: false, internalDocs: true,  customerData: true,  contracts: false };
  return { sourceCode: false, internalDocs: false, customerData: false, contracts: false };
}


// ─────────────────────────────────────────────
// SECTION 5: runPipeline(text, inputEl, originalText)
// originalText → only set when triggered by paste
// null         → when triggered by Enter key
// ─────────────────────────────────────────────

function runPipeline(text, inputEl, originalText = null) {

  // Step 1: Scan for secrets
  const scanResult = scanPrompt(text);
  if (scanResult.score === 0) return;

  // Step 2: Calculate exposure score
  const context  = getPlatformContext();
  const exposure = calculateExposure(scanResult.findings, context);

  // Step 3: Compute redacted version of the text
  const redactedText = redactSecrets(text);

  // Step 4: Show warning modal
  // originalText tells modal whether this was a paste or Enter
  showWarningModal(scanResult.findings, exposure, redactedText, inputEl, originalText);

  // Step 5: Save result to storage so popup can display it
  chrome.storage.local.set({
    lastScan: {
      timestamp:   new Date().toISOString(),
      score:       exposure.score,
      level:       exposure.level,
      findings:    scanResult.findings.map((f) => f.type),
      explanation: exposure.explanation,
    },
  });
}


// ─────────────────────────────────────────────
// SECTION 6: getPromptText(el)
// Reads current text from textarea or contenteditable div
// ─────────────────────────────────────────────

function getPromptText(el) {
  return el.tagName === "TEXTAREA"
    ? el.value.trim()
    : (el.innerText || "").trim();
}


// ─────────────────────────────────────────────
// SECTION 7: attachListeners(inputEl)
// Two interceptions only:
//   1. Paste  → blocks before text enters box
//   2. Enter  → blocks before ChatGPT submits
// Send button removed — React bypasses preventDefault
// ─────────────────────────────────────────────

function attachListeners(inputEl) {
  if (inputEl.dataset.aegisAttached) return;
  inputEl.dataset.aegisAttached = "true";


  // ── 1. PASTE interception ──────────────────────────────────────
  // Fires the moment user pastes anything into the prompt box.
  // We read the clipboard text BEFORE it enters the input.
  // If secrets found: block the paste and show the modal instead.
  inputEl.addEventListener("paste", (e) => {
    chrome.storage.local.get(["aegisEnabled"], (data) => {
      if (data.aegisEnabled === false) return;

      // Read raw text from clipboard
      const pastedText = (e.clipboardData || window.clipboardData).getData("text");
      if (!pastedText) return;

      // Scan the pasted text
      const scanResult = scanPrompt(pastedText);
      if (scanResult.score === 0) return;

      // Block the paste from entering the box
      e.preventDefault();
      e.stopImmediatePropagation();

      // Run pipeline — pass pastedText as originalText
      // so modal knows this came from paste, not Enter
      runPipeline(pastedText, inputEl, pastedText);
    });
  }, true); // true = capture phase, fires before ChatGPT's handler


  // ── 2. ENTER KEY interception ──────────────────────────────────
  // Fires when user presses Enter to submit the prompt.
  // Shift+Enter = new line (ignored).
  // Enter alone = submit → we scan first and block if secrets found.
  inputEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;

    chrome.storage.local.get(["aegisEnabled"], (data) => {
      if (data.aegisEnabled === false) return;

      // Read text currently in the box
      const text = getPromptText(inputEl);
      if (!text) return;

      // Scan it
      const scanResult = scanPrompt(text);
      if (scanResult.score === 0) return;

      // Block the Enter key from submitting
      e.preventDefault();
      e.stopImmediatePropagation();

      // Run pipeline — originalText = null (text already in box)
      runPipeline(text, inputEl, null);
    });
  }, true); // true = capture phase, fires before ChatGPT's handler


  console.log("[Aegis AI] Listeners attached ✓");
}


// ─────────────────────────────────────────────
// SECTION 8: init()
// Finds the prompt input box.
// If not ready yet, watches DOM via MutationObserver.
// Note: sendBtn no longer needed — removed from attachListeners
// ─────────────────────────────────────────────

function init() {

  // Detect platform and save to storage for popup display
  const host = window.location.hostname;
  let platform = "Unknown";
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) platform = "ChatGPT";
  else if (host.includes("claude.ai"))     platform = "Claude";
  else if (host.includes("gemini.google")) platform = "Gemini";

  chrome.storage.local.set({ aegisStatus: "active", platform });
  console.log("[Aegis AI] Loaded on:", platform);

  // Try to find the input box immediately
  const inputEl = document.querySelector("textarea#prompt-textarea") ||
                  document.querySelector("[contenteditable='true']");

  if (inputEl) {
    attachListeners(inputEl);
    return;
  }

  // Input not ready yet — ChatGPT renders it dynamically via React
  // MutationObserver watches DOM until the input appears
  const observer = new MutationObserver(() => {
    const input = document.querySelector("textarea#prompt-textarea") ||
                  document.querySelector("[contenteditable='true']");
    if (input) {
      attachListeners(input);
      observer.disconnect(); // Stop watching once found
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


// ─────────────────────────────────────────────
// SECTION 9: Boot
// ─────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
