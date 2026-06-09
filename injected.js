"use strict";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — injected.js  (MAIN world, runs at document_start)
//
// Problem this solves:
//   React registers its capture-phase paste listener when the page
//   loads — before our content script (document_idle) can attach.
//   React's handler fires first, reads the clipboard, and calls
//   document.execCommand('insertText') to insert the text into the
//   contenteditable div.  By the time our content-script handler
//   runs, the text is already in the box and preventDefault() is a
//   no-op on the already-dispatched event.
//
// Solution (two interlocking layers):
//   1. Register a capture-phase paste listener on document HERE,
//      at document_start, before React has loaded.  We are first
//      in the listener queue and set pasteInProgress = true plus
//      fire the 'aegis:paste-starting' custom event so the content
//      script can scan the text.
//   2. Override document.execCommand so that when React's handler
//      eventually calls execCommand('insertText', …) we can block
//      the insertion while pasteInProgress is true.
//
// Communication with the content script (isolated world):
//   Content script  → MAIN world : aegis:insert-text  (approve insertion)
//   MAIN world      → content script: aegis:paste-starting (text to scan)
//   Both directions use window custom events, which cross the world
//   boundary because both worlds share the same underlying window
//   object for event dispatch / listening.
// ═══════════════════════════════════════════════════════════════

(function () {

  // ── State ─────────────────────────────────────────────────────
  // Tracks whether a paste is currently being intercepted so the
  // execCommand override knows to block the upcoming insertText.
  let pasteInProgress = false;

  // Keep a reference to the real execCommand before any library
  // (React, etc.) can monkey-patch it.
  const origExecCommand = document.execCommand.bind(document);


  // ── Helper ────────────────────────────────────────────────────
  function isAIInput(el) {
    if (!el) return false;
    // Prioritise known AI platform prompt boxes
    if (el.id === "prompt-textarea") return true;
    if (el.getAttribute("role") === "textbox") return true;
    if (el.tagName === "TEXTAREA") return true;
    // Generic contenteditable — only match if it's a direct child of a
    // form-like container (avoids title/sidebar/contenteditable widgets)
    if (el.getAttribute("contenteditable") === "true") {
      const tag = el.tagName;
      return tag === "DIV" || tag === "P" || tag === "SECTION";
    }
    return false;
  }


  // ── Layer 1: capture-phase paste listener (before React) ──────
  // Registered NOW at document_start so it sits ahead of React's
  // capture listener in the event-listener queue.
  //
  // We call preventDefault() + stopImmediatePropagation() here to
  // block BOTH the native browser paste AND React's own paste handler
  // (which is also a capture-phase listener on document, but registered
  // later).  Modern Chrome/React no longer routes contenteditable paste
  // through execCommand, so the execCommand override alone is not
  // sufficient — we must stop the event here.
  document.addEventListener(
    "paste",
    function (e) {
      const el = document.activeElement;
      if (!isAIInput(el)) return;

      const text = e.clipboardData && e.clipboardData.getData("text");
      if (!text) return;

      // Block the paste unconditionally — the content script will
      // insert the approved (or redacted) text via aegis:insert-text.
      e.preventDefault();
      e.stopImmediatePropagation();

      pasteInProgress = true;

      window.dispatchEvent(
        new CustomEvent("aegis:paste-starting", { detail: { text } })
      );
    },
    true // capture phase — fires before React's listener
  );


  // ── Layer 2: execCommand override ─────────────────────────────
  // When React (or any script) calls execCommand('insertText') as
  // part of handling the paste, we block it if our flag is set.
  // The flag is cleared whether we block or not, so normal typing
  // (which also goes through insertText) is never affected.
  document.execCommand = function (command, showUI, value) {
    if (command === "insertText" && pasteInProgress) {
      pasteInProgress = false; // reset regardless

      // Block React's insertion — content script will insert the
      // approved/redacted text via the aegis:insert-text event.
      return false;
    }
    return origExecCommand(command, showUI, value);
  };


  // ── Approval bridge ───────────────────────────────────────────
  // Content script fires this event when the user has approved the
  // paste (either the original text or the redacted version).
  // We use the saved origExecCommand so React's synthetic input
  // event fires normally and the framework stays in sync.
  window.addEventListener("aegis:insert-text", function (e) {
    const text = e.detail && e.detail.text;
    if (typeof text === "string") {
      origExecCommand("insertText", false, text);
    }
  });

  console.log("[Aegis AI] injected.js loaded in MAIN world ✓");
})();
