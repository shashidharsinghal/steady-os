function CanvasOverview({ onNav }) {
  const modules = [
    {
      id: "dashboard",
      label: "Dashboard",
      desc: "Morning check + 30-day analytics with comparisons",
      icon: "Dashboard",
    },
    {
      id: "ingest",
      label: "Ingest",
      desc: "Selectable runs, archive, pagination, bulk actions",
      icon: "Upload",
    },
    {
      id: "customers",
      label: "Customers",
      desc: "Segments, win-back, channel-merged identities",
      icon: "Users",
    },
    {
      id: "outlets",
      label: "Outlets",
      desc: "Portfolio cards with status + 30-day trend",
      icon: "Store",
    },
    {
      id: "employees",
      label: "Employees",
      desc: "Roster across outlets, salary history",
      icon: "Team",
    },
    {
      id: "pnl",
      label: "P&L",
      desc: "Monthly close, cost composition, per-outlet drill",
      icon: "Trending",
    },
  ];

  return (
    <>
      {window.Shell.PageHead({
        eyebrow: "DESIGN REVIEW",
        title: "All six modules.",
        sub: "Click any thumbnail to open the full module. The redesign threads a single dark/coral system across all surfaces with consistent page heads, typography, and chart conventions.",
      })}

      <div className="row cols-3">
        {modules.map((m) => {
          const Icon = window.Icons[m.icon];
          return (
            <div
              key={m.id}
              className="card elev"
              style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
              onClick={() => onNav(m.id)}
            >
              <div
                style={{
                  aspectRatio: "16/10",
                  background: "var(--paper-2)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div className="row-flex" style={{ gap: 8, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "var(--ink)",
                      color: "var(--paper)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div style={{ fontWeight: 700 }}>{m.label}</div>
                  <div style={{ flex: 1 }} />
                  <span className="pill">Redesigned</span>
                </div>
                {/* Sample wireframe */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div style={{ background: "var(--card)", borderRadius: 4, padding: 8 }}>
                    <div
                      style={{
                        height: 4,
                        width: "40%",
                        background: "var(--ink)",
                        borderRadius: 2,
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        height: 12,
                        width: "70%",
                        background: "var(--ink)",
                        borderRadius: 2,
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        height: 30,
                        background: "linear-gradient(90deg, var(--accent), var(--accent-soft))",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div style={{ background: "var(--card)", borderRadius: 4, padding: 8 }}>
                    <div
                      style={{
                        height: 4,
                        width: "60%",
                        background: "var(--muted)",
                        borderRadius: 2,
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 2,
                        alignItems: "end",
                        height: 36,
                      }}
                    >
                      {[0.4, 0.6, 0.5, 0.7, 0.8, 0.9, 1].map((v, i) => (
                        <div
                          key={i}
                          style={{
                            height: v * 100 + "%",
                            background: "var(--ink)",
                            borderRadius: 1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="muted xs">{m.desc}</div>
                <div
                  className="row-flex"
                  style={{ marginTop: 8, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}
                >
                  Open module {React.createElement(window.Icons.ArrowRight, { size: 12 })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

window.CanvasOverview = CanvasOverview;
