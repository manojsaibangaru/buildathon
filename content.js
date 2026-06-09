"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — content.js  (isolated world, document_idle)
// Depends on: exposureEngine.js, modal.js (loaded before this)
//
// Paste interception works in two layers:
//   • injected.js (MAIN world, document_start) intercepts the paste
//     event and execCommand BEFORE React, then fires the custom
//     event 'aegis:paste-starting' with the clipboard text.
//   • This file listens for that event, scans the text, and either
//     approves the insertion via 'aegis:insert-text' or shows the
//     warning modal.
//
// For Enter-key submission we still use a direct keydown listener
// with a synchronous e.preventDefault() (before any async code).
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
// SECTION 2: aegisEnabled cache
// chrome.storage.local.get is async; we cache the value so we can
// check it synchronously inside event handlers.
// ─────────────────────────────────────────────

let aegisEnabled = true; // default until storage responds

chrome.storage.local.get(["aegisEnabled"], (data) => {
  if (data.aegisEnabled === false) aegisEnabled = false;
});

chrome.storage.onChanged.addListener((changes) => {
  if ("aegisEnabled" in changes) {
    aegisEnabled = changes.aegisEnabled.newValue !== false;
  }
});


// ─────────────────────────────────────────────
// SECTION 3: scanPrompt(text)
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
// SECTION 4: redactSecrets(text)
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
// SECTION 5: getPlatformContext()
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
// SECTION 6: runPipeline(text, inputEl, originalText)
// originalText → set when triggered by paste (null for Enter key)
// ─────────────────────────────────────────────

function runPipeline(text, inputEl, originalText = null) {
  const scanResult = scanPrompt(text);
  if (scanResult.score === 0) return;

  const context    = getPlatformContext();
  const exposure   = calculateExposure(scanResult.findings, context);
  const redactedText = redactSecrets(text);

  showWarningModal(scanResult.findings, exposure, redactedText, inputEl, originalText);

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
// SECTION 7: getPromptText(el)
// ─────────────────────────────────────────────

function getPromptText(el) {
  return el.tagName === "TEXTAREA"
    ? el.value.trim()
    : (el.innerText || "").trim();
}


// ─────────────────────────────────────────────
// SECTION 8: attachListeners(inputEl)
//
// Paste interception path (contenteditable / React):
//   injected.js fires 'aegis:paste-starting' on window →
//   we scan here → approve via 'aegis:insert-text' or show modal.
//
// Paste interception fallback (textarea):
//   Native paste event on the element — e.preventDefault() is
//   called SYNCHRONOUSLY before entering any async callback.
//
// Enter key:
//   e.preventDefault() is called SYNCHRONOUSLY before async check.
// ─────────────────────────────────────────────

function attachListeners(inputEl) {
  if (inputEl.dataset.aegisAttached) return;
  inputEl.dataset.aegisAttached = "true";


  // ── 1. MAIN-world bridge (primary paste path for contenteditable)
  //
  // injected.js has already blocked the paste and fired this event
  // with the clipboard text.  We decide here whether to approve it
  // (possibly after redaction) or show the warning modal.
  //
  // This listener is on window (not inputEl) so it hears the event
  // no matter which input is active.  We check document.activeElement
  // to ensure it's our tracked element before acting.
  window.addEventListener("aegis:paste-starting", (e) => {
    // Ignore if this input isn't the active one
    if (document.activeElement !== inputEl &&
        !inputEl.contains(document.activeElement)) return;

    const text = e.detail && e.detail.text;
    if (!text) {
      // No text — unblock so execCommand proceeds
      window.dispatchEvent(new CustomEvent("aegis:insert-text", { detail: { text: "" } }));
      return;
    }

    if (!aegisEnabled) {
      // Extension disabled — pass text through untouched
      window.dispatchEvent(new CustomEvent("aegis:insert-text", { detail: { text } }));
      return;
    }

    const scanResult = scanPrompt(text);
    if (scanResult.score === 0) {
      // Safe — approve the insertion
      window.dispatchEvent(new CustomEvent("aegis:insert-text", { detail: { text } }));
      return;
    }

    // Secrets found — show the modal; modal buttons dispatch aegis:insert-text
    runPipeline(text, inputEl, text);
  });


  // ── 2. Native paste listener (fallback for <textarea> elements)
  //
  // For textarea, React does NOT use execCommand, so the MAIN-world
  // override in injected.js won't fire.  We catch it here.
  //
  // CRITICAL: e.preventDefault() must be called SYNCHRONOUSLY,
  // before entering any async callback (chrome.storage.local.get
  // is async and the event will have already been processed by the
  // time its callback fires — the old bug).
  inputEl.addEventListener("paste", (e) => {
    // Only handle textarea; contenteditable is handled by the bridge
    if (inputEl.tagName !== "TEXTAREA") return;

    const pastedText = (e.clipboardData || window.clipboardData).getData("text");
    if (!pastedText) return;

    // Quick synchronous scan to see if blocking is warranted
    const quickScan = scanPrompt(pastedText);
    if (quickScan.score === 0) return; // Safe — let native paste proceed

    // Block NOW — synchronously, while the event is still cancellable
    e.preventDefault();
    e.stopImmediatePropagation();

    // Async check is now safe: the paste is already blocked
    if (!aegisEnabled) {
      insertIntoTextarea(inputEl, pastedText);
      return;
    }

    runPipeline(pastedText, inputEl, pastedText);
  }, true);


  // ── 3. ENTER KEY interception ──────────────────────────────────
  //
  // Same fix: scan synchronously first, then block synchronously if
  // secrets found.  The aegisEnabled check can be async after that.
  inputEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;

    const text = getPromptText(inputEl);
    if (!text) return;

    const quickScan = scanPrompt(text);
    if (quickScan.score === 0) return; // Safe — let Enter proceed

    // Block synchronously before any async code
    e.preventDefault();
    e.stopImmediatePropagation();

    if (!aegisEnabled) return; // Disabled — the submit is still blocked, user re-presses Enter

    runPipeline(text, inputEl, null);
  }, true);


  console.log("[Aegis AI] Listeners attached ✓");
}


// ─────────────────────────────────────────────
// Helper: insert text into a <textarea> at cursor position.
// Used when the paste was blocked but Aegis is disabled.
// ─────────────────────────────────────────────

function insertIntoTextarea(el, text) {
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  el.value    = el.value.slice(0, start) + text + el.value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}


// ─────────────────────────────────────────────
// SECTION 9: init()
// ─────────────────────────────────────────────

function init() {
  const host = window.location.hostname;
  let platform = "Unknown";
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) platform = "ChatGPT";
  else if (host.includes("claude.ai"))     platform = "Claude";
  else if (host.includes("gemini.google")) platform = "Gemini";

  chrome.storage.local.set({ aegisStatus: "active", platform });
  console.log("[Aegis AI] Loaded on:", platform);

  const inputEl =
    document.querySelector("textarea#prompt-textarea") ||
    document.querySelector("[contenteditable='true']");

  if (inputEl) {
    attachListeners(inputEl);
    return;
  }

  const observer = new MutationObserver(() => {
    const input =
      document.querySelector("textarea#prompt-textarea") ||
      document.querySelector("[contenteditable='true']");
    if (input) {
      attachListeners(input);
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


// ─────────────────────────────────────────────
// SECTION 10: Boot
// ─────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
