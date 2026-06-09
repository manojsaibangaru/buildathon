"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — popup.js
// Reads chrome.storage data written by content.js and renders
// the current status, platform, toggle state, and last scan result.
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {

  const statusDot    = document.getElementById("status-dot");
  const statusText   = document.getElementById("status-text");
  const platformText = document.getElementById("platform-text");
  const toggleInput  = document.getElementById("toggle-input");
  const lastScore    = document.getElementById("last-score");
  const lastLevel    = document.getElementById("last-level");
  const lastFindings = document.getElementById("last-findings");

  // ── Load all saved state from chrome.storage ──
  chrome.storage.local.get(
    ["aegisStatus", "aegisEnabled", "platform", "lastScan"],
    (data) => {

      // Status dot + text
      if (data.aegisStatus === "active") {
        statusDot.classList.remove("dot-inactive");
        statusDot.classList.add("dot-active");
        statusText.textContent = data.aegisEnabled === false ? "Paused" : "Active";
      } else {
        statusText.textContent = "Not on AI page";
      }

      // Platform name
      platformText.textContent = data.platform || "Not an AI page";

      // Toggle state — default ON
      toggleInput.checked = data.aegisEnabled !== false;

      // Last scan results
      if (data.lastScan) {
        const scan = data.lastScan;

        lastScore.textContent = `${scan.score}/100`;

        // Color-code the risk level
        const levelColors = {
          CRITICAL: "#e74c3c",
          HIGH:     "#e67e22",
          MEDIUM:   "#f1c40f",
          LOW:      "#2ecc71",
          NONE:     "#888",
        };
        lastLevel.textContent  = scan.level;
        lastLevel.style.color  = levelColors[scan.level] || "#fff";

        // Show each detected finding type as a tag
        if (scan.findings && scan.findings.length > 0) {
          lastFindings.innerHTML = scan.findings
            .map((f) => `<span class="finding-tag">${f}</span>`)
            .join("");
        }
      }
    }
  );

  // ── Toggle protection on/off ──
  toggleInput.addEventListener("change", () => {
    const isEnabled = toggleInput.checked;
    chrome.storage.local.set({ aegisEnabled: isEnabled });

    statusText.textContent = isEnabled ? "Active" : "Paused";

    if (isEnabled) {
      statusDot.classList.add("dot-active");
      statusDot.classList.remove("dot-inactive");
    } else {
      statusDot.classList.remove("dot-active");
      statusDot.classList.add("dot-inactive");
    }
  });
});
