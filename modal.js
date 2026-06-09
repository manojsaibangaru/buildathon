"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — modal.js
// Defines: showWarningModal(findings, exposure, redactedText, inputEl, originalText)
// originalText → set when triggered by paste (null when triggered by Send/Enter)
// ═══════════════════════════════════════════════════════════════

function showWarningModal(findings, exposure, redactedText, inputEl, originalText = null) {

  const existing = document.getElementById("aegis-modal-overlay");
  if (existing) existing.remove();

  const levelConfig = {
    CRITICAL: { color: "#e74c3c", bg: "#2c0a0a", icon: "🔴" },
    HIGH:     { color: "#e67e22", bg: "#2c1a0a", icon: "🟠" },
    MEDIUM:   { color: "#f1c40f", bg: "#2c2a0a", icon: "🟡" },
    LOW:      { color: "#2ecc71", bg: "#0a2c1a", icon: "🟢" },
    NONE:     { color: "#888888", bg: "#1a1a1a", icon: "⚪" },
  };

  const cfg = levelConfig[exposure.level] || levelConfig.NONE;

  const severityColors = {
    CRITICAL: "#e74c3c",
    HIGH:     "#e67e22",
    MEDIUM:   "#f1c40f",
    LOW:      "#2ecc71",
  };

  const findingsHTML = findings.map((f) => `
    <div style="
      display:flex; align-items:center; gap:10px;
      padding:8px 12px; background:#1a1a2e;
      border:1px solid #2a2a3d;
      border-left:3px solid ${severityColors[f.severity] || "#888"};
      border-radius:6px; margin-bottom:6px;
    ">
      <span style="
        background:#2a2a3d; color:#e0e0e0;
        font-size:11px; font-weight:700;
        padding:3px 8px; border-radius:4px;
        letter-spacing:0.5px; font-family:monospace;
      ">${f.type}</span>
      <span style="
        color:${severityColors[f.severity] || "#888"};
        font-size:11px; font-weight:600; margin-left:auto;
      ">${f.severity}</span>
    </div>
  `).join("");

  const radius        = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset    = circumference - (exposure.score / 100) * circumference;

  const scoreRingHTML = `
    <div style="position:relative; width:90px; height:90px; flex-shrink:0;">
      <svg width="90" height="90" style="transform:rotate(-90deg);">
        <circle cx="45" cy="45" r="${radius}" fill="none" stroke="#2a2a3d" stroke-width="8"/>
        <circle cx="45" cy="45" r="${radius}" fill="none"
          stroke="${cfg.color}" stroke-width="8" stroke-linecap="round"
          stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"/>
      </svg>
      <div style="
        position:absolute; top:50%; left:50%;
        transform:translate(-50%,-50%); text-align:center; line-height:1;
      ">
        <div style="font-size:20px; font-weight:800; color:${cfg.color};">${exposure.score}</div>
        <div style="font-size:9px; color:#888; margin-top:2px;">/ 100</div>
      </div>
    </div>
  `;

  const modalHTML = `
    <div id="aegis-modal-overlay" style="
      position:fixed; top:0; left:0; width:100vw; height:100vh;
      background:rgba(0,0,0,0.75); z-index:2147483647;
      display:flex; align-items:center; justify-content:center;
      font-family:'Segoe UI',Arial,sans-serif; backdrop-filter:blur(3px);
    ">
      <div id="aegis-modal" style="
        background:#0f1117; border:1px solid ${cfg.color};
        border-radius:12px; width:480px; max-width:95vw;
        box-shadow:0 0 40px ${cfg.color}44, 0 20px 60px rgba(0,0,0,0.8);
        overflow:hidden; animation:aegisFadeIn 0.2s ease;
      ">

        <!-- Top color bar -->
        <div style="height:4px; background:${cfg.color};"></div>

        <!-- Header -->
        <div style="
          padding:20px 24px 16px; border-bottom:1px solid #1e1e2e;
          display:flex; align-items:center; gap:12px;
        ">
          <div style="
            width:42px; height:42px; background:${cfg.bg};
            border:1px solid ${cfg.color}; border-radius:8px;
            display:flex; align-items:center; justify-content:center;
            font-size:22px; flex-shrink:0;
          ">🛡️</div>
          <div>
            <div style="font-size:16px; font-weight:700; color:#fff; letter-spacing:0.3px;">
              Aegis AI — Sensitive Data Detected
            </div>
            <div style="font-size:12px; color:#888; margin-top:3px;">
              ${originalText ? "Pasted content contains secrets." : "Your prompt contains secrets."} Choose an action below.
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:20px 24px;">

          <!-- Score + Level -->
          <div style="
            display:flex; align-items:center; gap:20px; padding:16px;
            background:${cfg.bg}; border:1px solid ${cfg.color}44;
            border-radius:8px; margin-bottom:18px;
          ">
            ${scoreRingHTML}
            <div style="flex:1; min-width:0;">
              <div style="font-size:24px; font-weight:800; color:${cfg.color}; letter-spacing:1px;">
                ${cfg.icon} ${exposure.level}
              </div>
              <div style="font-size:11px; color:#aaa; margin-top:6px; line-height:1.6; word-break:break-word;">
                ${exposure.explanation[0]}
              </div>
            </div>
          </div>

          <!-- Findings label -->
          <div style="
            font-size:11px; font-weight:700; color:#666;
            text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;
          ">Detected Secrets (${findings.length})</div>

          <!-- Findings list -->
          <div style="margin-bottom:18px;">${findingsHTML}</div>

          <!-- Warning text -->
          <div style="
            background:#1a0a0a; border:1px solid #e74c3c44;
            border-radius:6px; padding:10px 14px;
            font-size:12px; color:#ccc; line-height:1.6;
          ">
            ⚠️ Sending this prompt exposes your secrets to an external AI server.
            <strong style="color:#e94560;">Redact &amp; Continue</strong> is strongly recommended.
          </div>
        </div>

        <!-- Footer buttons -->
        <div style="
          padding:16px 24px 20px; border-top:1px solid #1e1e2e;
          display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;
        ">
          <button id="aegis-btn-cancel" style="
            padding:9px 18px; background:transparent;
            border:1px solid #3a3a4d; border-radius:6px;
            color:#888; font-size:13px; font-weight:600; cursor:pointer;
          ">Cancel</button>

          <button id="aegis-btn-proceed" style="
            padding:9px 18px; background:#1a1a2e;
            border:1px solid #e67e22; border-radius:6px;
            color:#e67e22; font-size:13px; font-weight:600; cursor:pointer;
          ">Proceed Anyway</button>

          <button id="aegis-btn-redact" style="
            padding:9px 18px; background:#e94560;
            border:1px solid #e94560; border-radius:6px;
            color:#fff; font-size:13px; font-weight:600; cursor:pointer;
          ">✓ Redact &amp; Continue</button>
        </div>

      </div>
    </div>

    <style>
      @keyframes aegisFadeIn {
        from { opacity:0; transform:scale(0.95) translateY(-10px); }
        to   { opacity:1; transform:scale(1)    translateY(0);     }
      }
      #aegis-btn-cancel:hover  { border-color:#888 !important; color:#ccc !important; }
      #aegis-btn-proceed:hover { background:#2c1a0a !important; }
      #aegis-btn-redact:hover  { background:#c0392b !important; border-color:#c0392b !important; }
    </style>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper);


  // ── HELPERS ──────────────────────────────────────────────────

  function closeModal() {
    const overlay = document.getElementById("aegis-modal-overlay");
    if (overlay && overlay.parentNode) overlay.parentNode.remove();
  }

  // Writes text into the input element.
  // isPaste = true  → inserting pasted text (was blocked, now approved)
  // isPaste = false → replacing entire box content (Enter-key redact case)
  function writeToInput(text, isPaste = false) {
    if (inputEl.tagName === "TEXTAREA") {
      if (isPaste) {
        const start   = inputEl.selectionStart;
        const end     = inputEl.selectionEnd;
        const current = inputEl.value;
        inputEl.value = current.slice(0, start) + text + current.slice(end);
        inputEl.selectionStart = inputEl.selectionEnd = start + text.length;
      } else {
        inputEl.value = text;
      }
      // Notify React / framework that the value changed
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // contenteditable div ─────────────────────────────────────
      // Focus FIRST — document.activeElement must be the input when
      // origExecCommand('insertText') runs in the MAIN world, otherwise
      // the insertion lands nowhere (modal button still has focus).
      inputEl.focus();

      if (isPaste) {
        // Clear the entire input first — if any text slipped through
        // the paste block, this prevents the redacted text from being
        // appended after the original secrets.
        const range = document.createRange();
        range.selectNodeContents(inputEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // Insert the approved/redacted text, replacing the selection.
        window.dispatchEvent(
          new CustomEvent("aegis:insert-text", { detail: { text } })
        );
      } else {
        // Replace entire content: select all text first so insertText
        // overwrites it.
        const range = document.createRange();
        range.selectNodeContents(inputEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        window.dispatchEvent(
          new CustomEvent("aegis:insert-text", { detail: { text } })
        );
      }
    }
  }

  // Auto-submits the form after redaction
  function autoSubmit() {
    // Give React two animation frames to process the input event and
    // re-enable the send button before we try to click it.
    setTimeout(() => {
      const sendBtn =
        document.querySelector('[data-testid="send-button"]') ||
        document.querySelector('button[aria-label="Send prompt"]');
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        inputEl.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter", bubbles: true, cancelable: true
        }));
      }
    }, 300);
  }


  // ── BUTTON: Cancel ────────────────────────────────────────────
  // Close modal. Nothing happens. Box stays unchanged.
  document.getElementById("aegis-btn-cancel")
    .addEventListener("click", () => {
      closeModal();
      console.log("[Aegis AI] Cancelled.");
    });


  // ── BUTTON: Proceed Anyway ────────────────────────────────────
  // If paste: insert ORIGINAL unredacted text into box
  // If send:  just close modal — text already in box, auto-submit
  document.getElementById("aegis-btn-proceed")
    .addEventListener("click", () => {
      if (originalText) {
        // Paste was blocked — insert original text and submit
        writeToInput(originalText, true);
        closeModal();
        autoSubmit();
      } else {
        // Send was blocked — text in box already, just submit
        closeModal();
        autoSubmit();
      }
      console.warn("[Aegis AI] ⚠️ User proceeded with unredacted content.");
    });


  // ── BUTTON: Redact & Continue ─────────────────────────────────
  // If paste: insert REDACTED text into box, then auto-submit
  // If send:  replace box content with redacted text, then auto-submit
  document.getElementById("aegis-btn-redact")
    .addEventListener("click", () => {
      if (originalText) {
        // Paste case — insert redacted text at cursor
        writeToInput(redactedText, true);
      } else {
        // Send case — replace full box content
        writeToInput(redactedText, false);
      }
      closeModal();
      autoSubmit();
      console.log("[Aegis AI] ✓ Redacted and submitted.");
    });


  // ── CLOSE ON OVERLAY CLICK ────────────────────────────────────
  document.getElementById("aegis-modal-overlay")
    .addEventListener("click", (e) => {
      if (e.target.id === "aegis-modal-overlay") closeModal();
    });
}
