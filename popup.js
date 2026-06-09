"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const statusDot      = document.getElementById("status-dot");
  const statusText     = document.getElementById("status-text");
  const platformText   = document.getElementById("platform-text");
  const toggleInput    = document.getElementById("toggle-input");
  const lastFindings   = document.getElementById("last-findings");
  const threatLevelEl  = document.getElementById("threat-level-text");
  const threatTimeEl   = document.getElementById("threat-time");
  const lastThreatCard = document.getElementById("last-threat-card");
  const noThreatCard   = document.getElementById("no-threat-card");

  const levelColors = {
    CRITICAL: "#e74c3c",
    HIGH:     "#e67e22",
    MEDIUM:   "#f1c40f",
    LOW:      "#2ecc71",
  };

  function timeAgo(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 60)  return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  chrome.storage.local.get(
    ["aegisStatus", "aegisEnabled", "platform", "lastScan"],
    (data) => {

      // Status
      if (data.aegisStatus === "active") {
        statusDot.classList.replace("dot-inactive", "dot-active");
        statusText.textContent = data.aegisEnabled === false ? "Paused" : "Active";
      } else {
        statusText.textContent = "Not on AI page";
      }

      // Platform
      platformText.textContent = data.platform || "—";

      // Toggle
      toggleInput.checked = data.aegisEnabled !== false;

      // Last threat
      if (data.lastScan && data.lastScan.score > 0) {
        lastThreatCard.style.display = "block";
        noThreatCard.style.display   = "none";

        const level = data.lastScan.level;
        threatLevelEl.textContent  = level;
        threatLevelEl.style.color  = levelColors[level] || "#fff";

        threatTimeEl.textContent = timeAgo(data.lastScan.timestamp);

        // Deduplicate finding types
        const unique = [...new Set(data.lastScan.findings)];
        lastFindings.innerHTML = unique
          .map((f) => `<span class="finding-tag">${f.replace(/_/g, " ")}</span>`)
          .join("");
      }
    }
  );

  // Toggle protection
  toggleInput.addEventListener("change", () => {
    const on = toggleInput.checked;
    chrome.storage.local.set({ aegisEnabled: on });
    statusText.textContent = on ? "Active" : "Paused";
    if (on) {
      statusDot.classList.replace("dot-inactive", "dot-active");
    } else {
      statusDot.classList.replace("dot-active", "dot-inactive");
    }
  });
});
