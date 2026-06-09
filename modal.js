"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — modal.js
// ═══════════════════════════════════════════════════════════════

function showWarningModal(findings, exposure, redactedText, inputEl, originalText = null) {

  const existing = document.getElementById("aegis-modal-overlay");
  if (existing) existing.remove();

  // ── Config ────────────────────────────────────────────────────

  const levelConfig = {
    CRITICAL: { color: "#e74c3c", bg: "#2c0a0a", label: "CRITICAL RISK" },
    HIGH:     { color: "#e67e22", bg: "#2c1a0a", label: "HIGH RISK"     },
    MEDIUM:   { color: "#f1c40f", bg: "#2c2a0a", label: "MEDIUM RISK"   },
    LOW:      { color: "#2ecc71", bg: "#0a2c1a", label: "LOW RISK"      },
    NONE:     { color: "#888888", bg: "#1a1a1a", label: "NO RISK"       },
  };

  const severityColors = {
    CRITICAL: "#e74c3c",
    HIGH:     "#e67e22",
    MEDIUM:   "#f1c40f",
    LOW:      "#2ecc71",
  };

  // What could actually happen for each secret type — plain English, urgent
  const RISK_DESCRIPTIONS = {
    AWS_ACCESS_KEY:       "Full AWS account access. Attackers scan AI logs. Average time to exploit: 4 minutes.",
    AWS_SECRET_KEY:       "Complete cloud takeover — spin up servers, drain S3 buckets, run up thousands in charges.",
    PASSWORD:             "Account takeover on every service where this password is reused.",
    API_KEY:              "Your credits get stolen and every conversation you've had becomes readable to the attacker.",
    JWT:                  "Session hijack — attacker logs in as you instantly, no password needed.",
    DB_CONNECTION_STRING: "Direct read, write, and delete access to your entire database. All data exposed.",
  };

  // Platform-specific context message
  const platformMessages = {
    ChatGPT: "ChatGPT retains conversation data that can be accessed by OpenAI staff and potentially leaked.",
    Claude:  "Claude stores conversation history — leaked contracts and credentials persist on Anthropic servers.",
    Gemini:  "Gemini is connected to your Google account and may use inputs to train future models.",
  };

  const host = window.location.hostname;
  let platform = "this AI";
  let platformMsg = "AI tools store your conversations on external servers you don't control.";
  if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) { platform = "ChatGPT"; platformMsg = platformMessages.ChatGPT; }
  else if (host.includes("claude.ai"))          { platform = "Claude";  platformMsg = platformMessages.Claude;  }
  else if (host.includes("gemini.google.com"))  { platform = "Gemini";  platformMsg = platformMessages.Gemini;  }

  const cfg = levelConfig[exposure.level] || levelConfig.NONE;

  // ── Group duplicate findings by type ─────────────────────────
  const grouped = {};
  for (const f of findings) {
    if (!grouped[f.type]) grouped[f.type] = { ...f, count: 0 };
    grouped[f.type].count++;
  }
  const uniqueFindings = Object.values(grouped);

  // ── Build finding rows ────────────────────────────────────────
  const findingsHTML = uniqueFindings.map((f) => {
    const riskDesc = RISK_DESCRIPTIONS[f.type] || "Sensitive data that should not leave your machine.";
    const countLabel = f.count > 1 ? ` <span style="color:#888;font-size:10px;">(×${f.count})</span>` : "";
    const displayName = f.type.replace(/_/g, " ");
    return `
      <div style="
        padding:10px 14px; background:#12121f;
        border:1px solid #2a2a3d;
        border-left:3px solid ${severityColors[f.severity] || "#888"};
        border-radius:6px; margin-bottom:8px;
      ">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
          <span style="
            font-size:12px; font-weight:700; color:#e0e0e0;
            font-family:monospace; letter-spacing:0.3px;
          ">${displayName}${countLabel}</span>
          <span style="
            font-size:10px; font-weight:700; color:${severityColors[f.severity] || "#888"};
            background:${severityColors[f.severity]}18;
            padding:2px 8px; border-radius:3px;
          ">${f.severity}</span>
        </div>
        <div style="font-size:11px; color:#aaa; line-height:1.5;">
          ${riskDesc}
        </div>
      </div>
    `;
  }).join("");

  // ── Modal HTML ────────────────────────────────────────────────
  const modalHTML = `
    <div id="aegis-modal-overlay" style="
      position:fixed; top:0; left:0; width:100vw; height:100vh;
      background:rgba(0,0,0,0.8); z-index:2147483647;
      display:flex; align-items:center; justify-content:center;
      font-family:'Segoe UI',Arial,sans-serif; backdrop-filter:blur(4px);
    ">
      <div id="aegis-modal" style="
        background:#0f1117; border:1px solid ${cfg.color};
        border-radius:12px; width:500px; max-width:95vw; max-height:90vh;
        overflow-y:auto;
        box-shadow:0 0 40px ${cfg.color}33, 0 24px 64px rgba(0,0,0,0.9);
        animation:aegisFadeIn 0.18s ease;
      ">

        <!-- Top bar -->
        <div style="height:4px; background:${cfg.color}; border-radius:12px 12px 0 0;"></div>

        <!-- Header -->
        <div style="padding:18px 22px 14px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #1e1e2e;">
          <div style="
            width:38px; height:38px; flex-shrink:0;
            background:${cfg.bg}; border:1px solid ${cfg.color};
            border-radius:8px; display:flex; align-items:center; justify-content:center;
            font-size:20px;
          ">🛡️</div>
          <div>
            <div style="font-size:15px; font-weight:700; color:#fff;">
              Aegis AI — Secrets Detected
            </div>
            <div style="font-size:12px; color:#666; margin-top:2px;">
              ${originalText ? "Your pasted text" : "Your prompt"} contains <strong style="color:#e0e0e0;">${uniqueFindings.length} type${uniqueFindings.length > 1 ? "s" : ""} of sensitive data</strong>
            </div>
          </div>
        </div>

        <!-- Risk summary -->
        <div style="
          margin:16px 22px 0;
          padding:14px 16px;
          background:${cfg.bg}; border:1px solid ${cfg.color}44;
          border-radius:8px;
        ">
          <div style="font-size:18px; font-weight:800; color:${cfg.color}; margin-bottom:6px;">
            🔴 ${cfg.label}
          </div>
          <div style="font-size:12px; color:#bbb; line-height:1.6;">
            ${platformMsg}
          </div>
        </div>

        <!-- Findings -->
        <div style="padding:16px 22px 4px;">
          <div style="font-size:10px; font-weight:700; color:#555; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">
            What's at risk
          </div>
          ${findingsHTML}
        </div>

        <!-- Buttons -->
        <div style="padding:14px 22px 20px;">

          <!-- Redact — primary, full width -->
          <button id="aegis-btn-redact" style="
            width:100%; padding:12px;
            background:#e94560; border:none; border-radius:8px;
            color:#fff; font-size:14px; font-weight:700;
            cursor:pointer; margin-bottom:10px; letter-spacing:0.3px;
          ">✓ Redact Secrets — Recommended</button>

          <!-- Secondary row -->
          <div style="display:flex; gap:8px;">
            <button id="aegis-btn-cancel" style="
              flex:1; padding:9px;
              background:transparent; border:1px solid #2a2a3d;
              border-radius:6px; color:#666; font-size:13px;
              font-weight:600; cursor:pointer;
            ">Cancel</button>

            <button id="aegis-btn-proceed" style="
              flex:1; padding:9px;
              background:transparent; border:1px solid #e67e2266;
              border-radius:6px; color:#e67e22; font-size:13px;
              font-weight:600; cursor:pointer;
            ">Send Original</button>
          </div>

          <div id="aegis-confirm-hint" style="
            display:none; text-align:center;
            font-size:11px; color:#e67e22; margin-top:8px;
          ">⚠️ Click "Send Original" again to confirm sending your secrets</div>
        </div>

      </div>
    </div>

    <style>
      @keyframes aegisFadeIn {
        from { opacity:0; transform:scale(0.96) translateY(-8px); }
        to   { opacity:1; transform:scale(1)    translateY(0);    }
      }
      #aegis-btn-redact:hover  { background:#c0392b !important; }
      #aegis-btn-cancel:hover  { border-color:#555 !important; color:#aaa !important; }
      #aegis-btn-proceed:hover { background:#2c1a0a !important; }
    </style>
  `;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = modalHTML;
  document.body.appendChild(wrapper);


  // ── Helpers ───────────────────────────────────────────────────

  function closeModal() {
    const overlay = document.getElementById("aegis-modal-overlay");
    if (overlay && overlay.parentNode) overlay.parentNode.remove();
  }

  function writeToInput(text) {
    if (inputEl.tagName === "TEXTAREA") {
      inputEl.value = text;
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      inputEl.focus();
      const range = document.createRange();
      range.selectNodeContents(inputEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      window.dispatchEvent(new CustomEvent("aegis:insert-text", { detail: { text } }));
    }
  }


  // ── Button: Redact Secrets (primary) ─────────────────────────
  document.getElementById("aegis-btn-redact")
    .addEventListener("click", () => {
      writeToInput(redactedText);
      closeModal();
      inputEl.focus();
    });


  // ── Button: Cancel ────────────────────────────────────────────
  document.getElementById("aegis-btn-cancel")
    .addEventListener("click", () => closeModal());


  // ── Button: Send Original (double-confirm) ────────────────────
  let sendConfirmPending = false;
  let sendConfirmTimer   = null;

  document.getElementById("aegis-btn-proceed")
    .addEventListener("click", () => {
      if (!sendConfirmPending) {
        // First click — ask for confirmation
        sendConfirmPending = true;
        const btn = document.getElementById("aegis-btn-proceed");
        const hint = document.getElementById("aegis-confirm-hint");
        btn.textContent  = "⚠️ Confirm Send";
        btn.style.background     = "#2c1a0a";
        btn.style.borderColor    = "#e67e22";
        hint.style.display = "block";

        sendConfirmTimer = setTimeout(() => {
          // Reset if user doesn't confirm within 4 seconds
          sendConfirmPending   = false;
          btn.textContent      = "Send Original";
          btn.style.background = "transparent";
          hint.style.display   = "none";
        }, 4000);
      } else {
        // Second click — proceed
        clearTimeout(sendConfirmTimer);
        if (originalText) writeToInput(originalText);
        closeModal();
        inputEl.focus();
      }
    });


  // ── Close on overlay click ────────────────────────────────────
  document.getElementById("aegis-modal-overlay")
    .addEventListener("click", (e) => {
      if (e.target.id === "aegis-modal-overlay") closeModal();
    });
}
