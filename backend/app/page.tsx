// ═══════════════════════════════════════════════════════════════
// AEGIS AI — Landing Page
// First thing judges see. Communicates the product in 10 seconds.
// ═══════════════════════════════════════════════════════════════

import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight:  "100vh",
      background: "#0f1117",
      color:      "#e0e0e0",
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "18px 48px",
        borderBottom:   "1px solid #1e1e2e",
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#e94560" }}>
          🛡️ Aegis AI
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Link href="/dashboard" style={{ color: "#888", fontSize: 14, textDecoration: "none" }}>
            Dashboard
          </Link>
          <a
            href="/api/scan"
            style={{ color: "#888", fontSize: 14, textDecoration: "none" }}
          >
            API
          </a>
          <a
            href="https://github.com/manojsaibangaru/buildathon"
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#e94560",
              color:      "#fff",
              fontSize:   13,
              fontWeight: 700,
              padding:    "8px 18px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            GitHub →
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section style={{
        textAlign: "center",
        padding:   "90px 24px 60px",
        maxWidth:  800,
        margin:    "0 auto",
      }}>
        <div style={{
          display:        "inline-flex",
          alignItems:     "center",
          gap:            8,
          background:     "rgba(233,69,96,0.1)",
          border:         "1px solid rgba(233,69,96,0.3)",
          borderRadius:   99,
          padding:        "6px 16px",
          fontSize:       12,
          color:          "#e94560",
          marginBottom:   28,
          fontWeight:     600,
        }}>
          🔒 Module 1 — Human Exposure Protection
        </div>

        <h1 style={{
          fontSize:   52,
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: 20,
          background: "linear-gradient(135deg, #fff 60%, #e94560)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor:  "transparent",
        }}>
          The security layer between<br />your team and AI tools
        </h1>

        <p style={{
          fontSize:   18,
          color:      "#888",
          lineHeight: 1.7,
          maxWidth:   560,
          margin:     "0 auto 40px",
        }}>
          Aegis AI detects and redacts secrets, PII, PHI, and financial data
          before your employees accidentally send them to ChatGPT, Claude, or Gemini.
          Real-time protection. Zero latency. Enterprise-grade.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{
            background:    "#e94560",
            color:         "#fff",
            fontWeight:    700,
            fontSize:      15,
            padding:       "14px 32px",
            borderRadius:  8,
            textDecoration: "none",
          }}>
            View Dashboard →
          </Link>
          <a href="/api/scan" style={{
            background:    "transparent",
            color:         "#e0e0e0",
            fontWeight:    600,
            fontSize:      15,
            padding:       "14px 32px",
            borderRadius:  8,
            border:        "1px solid #2a2a3d",
            textDecoration: "none",
          }}>
            Try the API
          </a>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section style={{
        padding:   "60px 24px",
        maxWidth:  1100,
        margin:    "0 auto",
      }}>
        <div style={{
          fontSize:      11,
          color:         "#555",
          textTransform: "uppercase",
          letterSpacing: 2,
          textAlign:     "center",
          marginBottom:  40,
        }}>
          How it works
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            {
              icon:  "⌨️",
              title: "Employee types a prompt",
              body:  "An engineer pastes code with an AWS key. A salesperson pastes a spreadsheet with SSNs. It happens every day.",
            },
            {
              icon:  "🔍",
              title: "Aegis scans in real time",
              body:  "30+ detection patterns scan for credentials, PII, PHI, and financial data — before the message is sent.",
            },
            {
              icon:  "🚨",
              title: "Warning modal fires",
              body:  "The employee sees exactly what was found, why it's dangerous, and gets the option to redact automatically.",
            },
            {
              icon:  "📊",
              title: "CISO sees everything",
              body:  "Every detection event flows to the dashboard in real time. Risk analytics, audit log, policy management.",
            },
          ].map((step, i) => (
            <div key={i} style={{
              background:   "#1a1a2e",
              border:       "1px solid #2a2a3d",
              borderRadius: 12,
              padding:      "28px 24px",
              flex:         "1 1 220px",
              maxWidth:     260,
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{step.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{step.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── What we detect ───────────────────────────────────── */}
      <section style={{
        padding:    "60px 24px",
        background: "#0c0e14",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            fontSize:      11,
            color:         "#555",
            textTransform: "uppercase",
            letterSpacing: 2,
            textAlign:     "center",
            marginBottom:  40,
          }}>
            30+ detection patterns across 5 categories
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "CREDENTIALS",  count: 11, color: "#e74c3c", items: "AWS Keys · API Keys · JWT · DB Strings · GitHub Tokens · Stripe Keys" },
              { label: "PII",          count: 6,  color: "#e67e22", items: "SSN · Passport · Email · Phone · Driver's License · Internal IPs" },
              { label: "PHI",          count: 4,  color: "#f1c40f", items: "Medical Record No · Health Insurance ID · Diagnosis Codes · DOB" },
              { label: "FINANCIAL",    count: 4,  color: "#2ecc71", items: "Credit Cards · Bank Account · Routing No · IBAN" },
              { label: "SOURCE CODE",  count: 2,  color: "#3498db", items: ".env Files · Internal Hostnames" },
            ].map((cat) => (
              <div key={cat.label} style={{
                background:   "#1a1a2e",
                border:       `1px solid ${cat.color}44`,
                borderTop:    `3px solid ${cat.color}`,
                borderRadius: 10,
                padding:      "20px 20px",
                flex:         "1 1 160px",
                maxWidth:     200,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, letterSpacing: 1, marginBottom: 6 }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>
                  {cat.count}
                </div>
                <div style={{ fontSize: 10, color: "#555", lineHeight: 1.6 }}>{cat.items}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API snippet ──────────────────────────────────────── */}
      <section style={{ padding: "60px 24px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{
          fontSize:      11,
          color:         "#555",
          textTransform: "uppercase",
          letterSpacing: 2,
          textAlign:     "center",
          marginBottom:  32,
        }}>
          REST API — integrate Aegis into any workflow
        </div>

        <div style={{
          background:   "#1a1a2e",
          border:       "1px solid #2a2a3d",
          borderRadius: 12,
          overflow:     "hidden",
        }}>
          <div style={{
            borderBottom: "1px solid #2a2a3d",
            padding:      "10px 18px",
            fontSize:     11,
            color:        "#555",
            display:      "flex",
            gap:          8,
          }}>
            <span style={{ color: "#e94560" }}>●</span>
            <span style={{ color: "#e67e22" }}>●</span>
            <span style={{ color: "#2ecc71" }}>●</span>
            <span style={{ marginLeft: 8 }}>terminal</span>
          </div>
          <pre style={{
            padding:      "20px 24px",
            margin:       0,
            fontSize:     13,
            color:        "#aaa",
            lineHeight:   1.8,
            overflowX:    "auto",
          }}>{`$ curl -X POST https://aegis-ai.vercel.app/api/scan \\
    -H "Content-Type: application/json" \\
    -H "x-aegis-key: demo" \\
    -d '{"text": "AKIA1234567890ABCDEF password=hunter2"}'

{
  "score": 90,
  "level": "CRITICAL",
  "action": "BLOCK",
  "findings": [
    { "type": "AWS_ACCESS_KEY",  "severity": "CRITICAL" },
    { "type": "PASSWORD",        "severity": "HIGH"     }
  ],
  "redacted": "[REDACTED:AWS_ACCESS_KEY] password=[REDACTED:PASSWORD]"
}`}</pre>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{
        textAlign:  "center",
        padding:    "80px 24px",
        background: "linear-gradient(180deg, #0f1117 0%, #1a0a14 100%)",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, color: "#fff" }}>
          Ready to protect your team?
        </h2>
        <p style={{ color: "#666", fontSize: 16, marginBottom: 32 }}>
          Install the extension. Watch the dashboard. Ship with confidence.
        </p>
        <Link href="/dashboard" style={{
          background:     "#e94560",
          color:          "#fff",
          fontWeight:     700,
          fontSize:       16,
          padding:        "16px 40px",
          borderRadius:   8,
          textDecoration: "none",
          display:        "inline-block",
        }}>
          Open Dashboard →
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={{
        borderTop:  "1px solid #1e1e2e",
        padding:    "20px 48px",
        display:    "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize:   12,
        color:      "#444",
      }}>
        <span>🛡️ Aegis AI — Built for the Buildathon 2025</span>
        <span>Module 1: Human Exposure Protection</span>
      </footer>
    </main>
  );
}
