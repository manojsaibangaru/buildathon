"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — content.js  (isolated world, document_idle)
//
// Load order (manifest.json):
//   1. injected.js   (MAIN world, document_start) — paste intercept
//   2. aegis-core.js (compiled bundle)            — detection engine
//   3. modal.js                                   — warning UI
//   4. content.js    (this file)                  — wires it together
//
// Detection is fully delegated to AegisCore (aegis-core.js).
// This file only handles:
//   • Listening for paste / Enter-key events
//   • Calling AegisCore.scan() + AegisCore.calculateExposure()
//   • Calling showWarningModal() (modal.js)
//   • Persisting last-scan data to chrome.storage
//   • Sending events to the Aegis backend (if configured)
// ═══════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────
// SECTION 1: aegisEnabled cache
// ─────────────────────────────────────────────

let aegisEnabled = true;

chrome.storage.local.get(["aegisEnabled"], (data) => {
  if (data.aegisEnabled === false) aegisEnabled = false;
});

chrome.storage.onChanged.addListener((changes) => {
  if ("aegisEnabled" in changes) {
    aegisEnabled = changes.aegisEnabled.newValue !== false;
  }
});


// ─────────────────────────────────────────────
// SECTION 2: Platform context
// Used by AegisCore.calculateExposure() to amplify scores based
// on which AI tool the user is on (some retain data longer).
// ─────────────────────────────────────────────

function getPlatformContext() {
  const host = window.location.hostname;
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com"))
    return { platform: "ChatGPT", sourceCode: true,  internalDocs: true,  customerData: false, contracts: false };
  if (host.includes("claude.ai"))
    return { platform: "Claude",  sourceCode: false, internalDocs: true,  customerData: false, contracts: true  };
  if (host.includes("gemini.google.com"))
    return { platform: "Gemini",  sourceCode: false, internalDocs: true,  customerData: true,  contracts: false };
  return   { platform: "Unknown", sourceCode: false, internalDocs: false, customerData: false, contracts: false };
}


// ─────────────────────────────────────────────
// SECTION 3: runPipeline(text, inputEl, originalText)
// The main detection + response flow.
// originalText → non-null when triggered by paste (null = Enter key)
// ─────────────────────────────────────────────

function runPipeline(text, inputEl, originalText = null) {
  // Use AegisCore detection engine (loaded from aegis-core.js)
  const { findings, rawScore } = AegisCore.scan(text);
  if (rawScore === 0) return;

  const context  = getPlatformContext();
  const exposure = AegisCore.calculateExposure(findings, context);
  const redacted = AegisCore.redact(text);

  showWarningModal(findings, exposure, redacted, inputEl, originalText);

  // Persist for popup display
  chrome.storage.local.set({
    lastScan: {
      timestamp:   new Date().toISOString(),
      score:       exposure.score,
      level:       exposure.level,
      findings:    findings.map((f) => f.type),
      categories:  [...new Set(findings.map((f) => f.category))],
      explanation: exposure.explanation,
    },
  });

  // Send event to backend (fire-and-forget; non-blocking)
  sendEventToBackend({
    timestamp:  new Date().toISOString(),
    platform:   context.platform,
    score:      exposure.score,
    level:      exposure.level,
    categories: [...new Set(findings.map((f) => f.category))],
    types:      [...new Set(findings.map((f) => f.type))],
    action:     "DETECTED",
  });
}


// ─────────────────────────────────────────────
// SECTION 4: sendEventToBackend(event)
// Sends detection events to the Aegis dashboard backend.
// The backend URL and org API key are read from chrome.storage
// (set by the user in popup settings or via the dashboard onboarding).
// This is completely non-blocking — if the backend is unreachable,
// the extension continues to work normally.
// ─────────────────────────────────────────────

function sendEventToBackend(event) {
  chrome.storage.local.get(["backendUrl", "orgApiKey"], (data) => {
    const url    = data.backendUrl  || "https://aegis-ai.vercel.app";
    const apiKey = data.orgApiKey   || "demo";

    fetch(`${url}/api/events`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "x-aegis-key":   apiKey,
      },
      body: JSON.stringify(event),
    }).catch(() => {
      // Backend unreachable — extension still works, just no dashboard sync
    });
  });
}


// ─────────────────────────────────────────────
// SECTION 5: getPromptText(el)
// ─────────────────────────────────────────────

function getPromptText(el) {
  return el.tagName === "TEXTAREA"
    ? el.value.trim()
    : (el.innerText || "").trim();
}


// ─────────────────────────────────────────────
// SECTION 6: Paste + Enter-key interception
// ─────────────────────────────────────────────

let trackedInput = null;

// Bridge from injected.js (MAIN world) — fires for contenteditable inputs
window.addEventListener("aegis:paste-starting", (e) => {
  if (!trackedInput) return;
  if (document.activeElement !== trackedInput &&
      !trackedInput.contains(document.activeElement)) return;

  const text = e.detail && e.detail.text;
  if (!text || !aegisEnabled) {
    window.dispatchEvent(new CustomEvent("aegis:insert-text", { detail: { text: text || "" } }));
    return;
  }

  const { rawScore } = AegisCore.scan(text);
  if (rawScore === 0) {
    window.dispatchEvent(new CustomEvent("aegis:insert-text", { detail: { text } }));
    return;
  }

  runPipeline(text, trackedInput, text);
});


function attachListeners(inputEl) {
  if (inputEl.dataset.aegisAttached) return;
  inputEl.dataset.aegisAttached = "true";
  trackedInput = inputEl;

  // Native paste fallback for <textarea> (React path handled by injected.js)
  inputEl.addEventListener("paste", (e) => {
    if (inputEl.tagName !== "TEXTAREA") return;

    const pastedText = (e.clipboardData || window.clipboardData).getData("text");
    if (!pastedText) return;

    const { rawScore } = AegisCore.scan(pastedText);
    if (rawScore === 0) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!aegisEnabled) {
      insertIntoTextarea(inputEl, pastedText);
      return;
    }

    runPipeline(pastedText, inputEl, pastedText);
  }, true);

  // Enter key submission interception
  inputEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (!aegisEnabled) return;

    const text = getPromptText(inputEl);
    if (!text) return;

    const { rawScore } = AegisCore.scan(text);
    if (rawScore === 0) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    runPipeline(text, inputEl, null);
  }, true);

  console.log("[Aegis AI] Listeners attached ✓");
}


// ─────────────────────────────────────────────
// Helper: insert text into <textarea> at cursor
// ─────────────────────────────────────────────

function insertIntoTextarea(el, text) {
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  el.value    = el.value.slice(0, start) + text + el.value.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}


// ─────────────────────────────────────────────
// SECTION 7: init() — find the AI prompt input and attach
// ─────────────────────────────────────────────

function init() {
  const host = window.location.hostname;
  let platform = "Unknown";
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) platform = "ChatGPT";
  else if (host.includes("claude.ai"))     platform = "Claude";
  else if (host.includes("gemini.google")) platform = "Gemini";

  chrome.storage.local.set({ aegisStatus: "active", platform });
  console.log(`[Aegis AI] v1.1.0 loaded on: ${platform} | Patterns: ${AegisCore.PATTERNS.length}`);

  function findInput() {
    return (
      document.querySelector("#prompt-textarea") ||
      document.querySelector("textarea#prompt-textarea") ||
      document.querySelector("[contenteditable='true'][role='textbox']") ||
      document.querySelector("[contenteditable='true']")
    );
  }

  const inputEl = findInput();
  if (inputEl) {
    attachListeners(inputEl);
    return;
  }

  const observer = new MutationObserver(() => {
    const input = findInput();
    if (input) {
      attachListeners(input);
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
