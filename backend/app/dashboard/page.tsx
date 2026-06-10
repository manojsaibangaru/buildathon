"use client";

// ═══════════════════════════════════════════════════════════════
// AEGIS AI — /dashboard
// Security dashboard for the CISO / security team.
// Shows: live event feed, risk analytics, top threat types.
// Polls /api/events every 5 seconds for live updates.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";

interface AegisEvent {
  id:         string;
  created_at: string;
  platform:   string;
  score:      number;
  level:      string;
  categories: string[];
  types:      string[];
  action:     string;
}

const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: "#e74c3c",
  HIGH:     "#e67e22",
  MEDIUM:   "#f1c40f",
  LOW:      "#2ecc71",
  NONE:     "#555",
};

const LEVEL_BG: Record<string, string> = {
  CRITICAL: "rgba(231,76,60,0.15)",
  HIGH:     "rgba(230,126,34,0.15)",
  MEDIUM:   "rgba(241,196,15,0.15)",
  LOW:      "rgba(46,204,113,0.15)",
  NONE:     "rgba(85,85,85,0.15)",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "#1a1a2e",
      border:     "1px solid #2a2a3d",
      borderRadius: 10,
      padding:    "18px 22px",
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#fff" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [events,   setEvents]   = useState<AegisEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const [orgKey,   setOrgKey]   = useState("demo");

  const fetchEvents = useCallback(async () => {
    try {
      const res  = await fetch(`/api/events?org_key=${orgKey}&limit=100`);
      const data = await res.json() as { events: AegisEvent[] };
      setEvents(data.events || []);
      setLastPoll(new Date());
    } catch {
      // silently fail — keep existing data
    } finally {
      setLoading(false);
    }
  }, [orgKey]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // ── Analytics ───────────────────────────────────────────────
  const total      = events.length;
  const critical   = events.filter((e) => e.level === "CRITICAL").length;
  const high       = events.filter((e) => e.level === "HIGH").length;
  const platforms  = [...new Set(events.map((e) => e.platform))];
  const avgScore   = total ? Math.round(events.reduce((s, e) => s + e.score, 0) / total) : 0;

  // Top threat types
  const typeCounts: Record<string, number> = {};
  for (const ev of events) {
    for (const t of (ev.types || [])) {
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
  }
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{
      minHeight:  "100vh",
      background: "#0f1117",
      color:      "#e0e0e0",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      padding:    "0 0 60px",
    }}>

      {/* ── Top nav ─────────────────────────────────────── */}
      <nav style={{
        borderBottom: "1px solid #2a2a3d",
        padding:      "14px 32px",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        position:     "sticky",
        top: 0,
        background:   "#0f1117",
        zIndex:       100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#e94560" }}>🛡️ Aegis AI</span>
          <span style={{ fontSize: 12, color: "#555", borderLeft: "1px solid #2a2a3d", paddingLeft: 12 }}>
            Security Dashboard
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            value={orgKey}
            onChange={(e) => setOrgKey(e.target.value)}
            placeholder="org api key"
            style={{
              background: "#1a1a2e", border: "1px solid #2a2a3d",
              borderRadius: 6, padding: "6px 12px", color: "#e0e0e0",
              fontSize: 12, width: 160,
            }}
          />
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: lastPoll ? "#2ecc71" : "#555",
            boxShadow: lastPoll ? "0 0 6px #2ecc71" : "none",
          }} />
          <span style={{ fontSize: 11, color: "#555" }}>
            {lastPoll ? `Updated ${timeAgo(lastPoll.toISOString())}` : "Connecting..."}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Stats row ──────────────────────────────────── */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
          <StatCard label="Total Events"    value={total}    sub="all time"            />
          <StatCard label="Critical"        value={critical} sub="need attention"  color="#e74c3c" />
          <StatCard label="High Risk"       value={high}     sub="require review"  color="#e67e22" />
          <StatCard label="Avg Risk Score"  value={`${avgScore}/100`} sub="exposure score" color={avgScore > 60 ? "#e74c3c" : avgScore > 30 ? "#e67e22" : "#2ecc71"} />
          <StatCard label="Platforms"       value={platforms.length || "—"} sub={platforms.join(", ") || "none yet"} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>

          {/* ── Live event feed ──────────────────────────── */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
              Live Event Feed
            </div>

            {loading && (
              <div style={{ color: "#555", fontSize: 13, padding: "20px 0" }}>Loading events...</div>
            )}

            {!loading && events.length === 0 && (
              <div style={{
                background: "#1a1a2e", border: "1px solid #2a2a3d",
                borderRadius: 10, padding: "40px 0", textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
                <div style={{ color: "#555", fontSize: 13 }}>No events yet for org key: <strong style={{ color: "#888" }}>{orgKey}</strong></div>
                <div style={{ color: "#444", fontSize: 11, marginTop: 6 }}>
                  Install the extension and paste a secret into ChatGPT to see events appear here.
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {events.map((ev) => (
                <div key={ev.id} style={{
                  background:   "#1a1a2e",
                  border:       `1px solid #2a2a3d`,
                  borderLeft:   `3px solid ${LEVEL_COLORS[ev.level] || "#555"}`,
                  borderRadius: 8,
                  padding:      "12px 16px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          12,
                  animation:    "fadeIn 0.2s ease",
                }}>
                  <div style={{
                    background:   LEVEL_BG[ev.level] || "rgba(85,85,85,0.15)",
                    border:       `1px solid ${LEVEL_COLORS[ev.level] || "#555"}44`,
                    borderRadius: 6,
                    padding:      "3px 10px",
                    fontSize:     11,
                    fontWeight:   700,
                    color:        LEVEL_COLORS[ev.level] || "#555",
                    whiteSpace:   "nowrap",
                    minWidth:     70,
                    textAlign:    "center",
                  }}>
                    {ev.level}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 3 }}>
                      <strong>{ev.platform}</strong>
                      {ev.types && ev.types.length > 0 && (
                        <span style={{ color: "#888", marginLeft: 8 }}>
                          {ev.types.map((t) => t.replace(/_/g, " ")).join(", ")}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#555" }}>
                      Score: {ev.score}/100
                      {ev.categories && ev.categories.length > 0 && (
                        <span style={{ marginLeft: 8 }}>
                          {ev.categories.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>
                    {timeAgo(ev.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar ──────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Top threat types */}
            <div style={{
              background: "#1a1a2e", border: "1px solid #2a2a3d",
              borderRadius: 10, padding: "18px 20px",
            }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                Top Threat Types
              </div>
              {topTypes.length === 0 && (
                <div style={{ color: "#555", fontSize: 12 }}>No data yet</div>
              )}
              {topTypes.map(([type, count]) => (
                <div key={type} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{type.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 11, color: "#e94560", fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{
                    height: 4, background: "#0f1117", borderRadius: 2, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width:  `${Math.round((count / (topTypes[0]?.[1] || 1)) * 100)}%`,
                      background: "#e94560",
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* API playground */}
            <div style={{
              background: "#1a1a2e", border: "1px solid #2a2a3d",
              borderRadius: 10, padding: "18px 20px",
            }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                API Playground
              </div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
                Test the /api/scan endpoint:
              </div>
              <pre style={{
                background: "#0f1117", border: "1px solid #2a2a3d",
                borderRadius: 6, padding: "10px 12px",
                fontSize: 10, color: "#aaa", overflow: "auto",
                whiteSpace: "pre-wrap", wordBreak: "break-all",
              }}>{`curl -X POST /api/scan \\
  -H "Content-Type: application/json" \\
  -H "x-aegis-key: demo" \\
  -d '{"text":"password=hunter2"}'`}</pre>
            </div>

            {/* Risk breakdown */}
            {total > 0 && (
              <div style={{
                background: "#1a1a2e", border: "1px solid #2a2a3d",
                borderRadius: 10, padding: "18px 20px",
              }}>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                  Risk Breakdown
                </div>
                {(["CRITICAL","HIGH","MEDIUM","LOW"] as const).map((lvl) => {
                  const count = events.filter((e) => e.level === lvl).length;
                  const pct   = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={lvl} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: LEVEL_COLORS[lvl] }}>{lvl}</span>
                        <span style={{ fontSize: 11, color: "#555" }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, background: "#0f1117", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: LEVEL_COLORS[lvl], borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
}
