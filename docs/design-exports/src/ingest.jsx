const { useState, useMemo } = React;

function Ingest() {
  const { Card, Btn, Pill, Seg, PageHead } = window.Shell;
  const { ingestionRuns, fmtNum } = window.MOCK;

  const [tab, setTab] = useState("active");
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    return ingestionRuns.filter((r) => {
      if (source !== "all" && r.source !== source) return false;
      if (filter !== "all" && r.status !== filter) return false;
      return true;
    });
  }, [filter, source]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map((r) => r.id)));
  };

  const SOURCE_LABELS = {
    petpooja_payment: { label: "Petpooja · Payment", color: "var(--ink)" },
    petpooja_item_bill: { label: "Petpooja · Items", color: "var(--ink-2)" },
    swiggy: { label: "Swiggy", color: "var(--accent)" },
    zomato: { label: "Zomato", color: "var(--red)" },
    pine_labs: { label: "Pine Labs", color: "var(--blue)" },
    pnl_pdf: { label: "P&L PDF", color: "var(--violet)" },
  };
  const STATUS = {
    committed: { label: "Committed", tone: "green" },
    preview_ready: { label: "Preview ready", tone: "blue" },
    needs_review: { label: "Needs review", tone: "amber" },
    failed: { label: "Failed", tone: "red" },
  };

  return (
    <>
      <PageHead
        eyebrow="DATA OPERATIONS"
        title="Ingest workspace."
        sub="Upload, preview, and commit operational files. Gmail auto-sync runs nightly across connected outlets."
        actions={
          <>
            <Btn icon="Refresh">Sync now</Btn>
            <Btn icon="Upload" kind="primary">
              Upload files
            </Btn>
          </>
        }
      />

      {/* Auto-sync status strip */}
      <div className="row cols-4" style={{ marginBottom: 16 }}>
        {[
          {
            label: "Connected outlets",
            value: "5 / 6",
            sub: "Whitefield ITPL not connected",
            icon: "Link",
            tone: "amber",
          },
          {
            label: "Files this week",
            value: "47",
            sub: "32 auto · 15 manual",
            icon: "Inbox",
            tone: "default",
          },
          {
            label: "Pending review",
            value: "2",
            sub: "Zomato + Bandra P&L",
            icon: "AlertTriangle",
            tone: "red",
          },
          {
            label: "Last sync",
            value: "9:14 AM",
            sub: "All sources up to date",
            icon: "Clock",
            tone: "green",
          },
        ].map((s) => {
          const Icon = window.Icons[s.icon];
          return (
            <div
              key={s.label}
              className="card"
              style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background:
                    s.tone === "amber"
                      ? "var(--amber-soft)"
                      : s.tone === "red"
                        ? "var(--red-soft)"
                        : s.tone === "green"
                          ? "var(--green-soft)"
                          : "var(--paper-2)",
                  color:
                    s.tone === "amber"
                      ? "var(--amber)"
                      : s.tone === "red"
                        ? "var(--red)"
                        : s.tone === "green"
                          ? "var(--green)"
                          : "var(--ink)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="stat-label">{s.label}</div>
                <div
                  className="num"
                  style={{ fontSize: 22, fontWeight: 600, marginTop: 4, letterSpacing: "-0.02em" }}
                >
                  {s.value}
                </div>
                <div className="muted xs" style={{ marginTop: 4 }}>
                  {s.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload + Auto-sync side by side */}
      <div className="row cols-12" style={{ marginBottom: 16 }}>
        <Card span={7} className="elev">
          <div className="card-head">
            <div className="card-title">Manual upload</div>
            <div className="card-spacer" />
            <select className="sel" style={{ width: 200, fontSize: 12 }}>
              <option>Indiranagar Flagship</option>
              <option>Koramangala 5th Block</option>
              <option>HSR Layout</option>
            </select>
          </div>
          <div
            style={{
              border: "2px dashed var(--line-strong)",
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              background: "var(--paper-2)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "var(--ink)",
                color: "var(--paper)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
              }}
            >
              {React.createElement(window.Icons.Upload, { size: 22 })}
            </div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
              Drop files or click to browse
            </div>
            <div className="muted small" style={{ marginBottom: 16 }}>
              Petpooja CSV · Swiggy/Zomato XLSX · Pine Labs CSV · P&L PDF
            </div>
            <div
              className="row-flex"
              style={{ justifyContent: "center", gap: 6, flexWrap: "wrap" }}
            >
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <span key={k} className="pill" style={{ fontSize: 10 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: v.color,
                      borderRadius: 999,
                      marginRight: 4,
                    }}
                  />
                  {v.label}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card span={5} title="Gmail auto-sync">
          <div className="banner ok" style={{ marginBottom: 14 }}>
            {React.createElement(window.Icons.CheckCircle, { size: 14 })}
            <div className="small">
              Connected as <b>ops@steadystride.com</b> · last run 9:14 AM
            </div>
          </div>
          <div className="stack-sm">
            {[
              { name: "Indiranagar Flagship", state: "active", last: "9:14 AM" },
              { name: "Koramangala 5th Block", state: "active", last: "9:14 AM" },
              { name: "HSR Layout", state: "active", last: "9:14 AM" },
              { name: "Bandra West", state: "active", last: "9:14 AM" },
              { name: "Powai Hiranandani", state: "active", last: "9:13 AM" },
              { name: "Whitefield ITPL", state: "disconnected", last: "—" },
            ].map((o) => (
              <div
                key={o.name}
                className="row-flex"
                style={{ padding: "8px 10px", borderRadius: 8, background: "var(--paper-2)" }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: o.state === "active" ? "var(--green)" : "var(--muted)",
                  }}
                />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{o.name}</span>
                <span className="muted xs num">{o.last}</span>
                {o.state === "disconnected" && <Btn size="sm">Connect</Btn>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Runs table with selection, filtering, pagination */}
      <Card>
        <div className="row-flex" style={{ marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <div className="tabs" style={{ borderBottom: 0 }}>
            {[
              { id: "active", label: "Active runs", count: 12 },
              { id: "archived", label: "Archived", count: 47 },
              { id: "deleted", label: "Trash", count: 3 },
            ].map((t) => (
              <div
                key={t.id}
                className={"tab" + (tab === t.id ? " active" : "")}
                onClick={() => setTab(t.id)}
              >
                {t.label} <span className="muted num xs">{t.count}</span>
              </div>
            ))}
          </div>
          <div className="card-spacer" />
          <select
            className="sel"
            style={{ width: 180 }}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            className="sel"
            style={{ width: 160 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="committed">Committed</option>
            <option value="preview_ready">Preview ready</option>
            <option value="needs_review">Needs review</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              padding: "10px 14px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span className="num" style={{ fontWeight: 600 }}>
              {selected.size}
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>selected</span>
            <div style={{ flex: 1 }} />
            <button
              className="btn sm"
              style={{ background: "rgba(255,255,255,0.1)", color: "var(--paper)", border: 0 }}
            >
              {React.createElement(window.Icons.Archive, { size: 12 })} Archive
            </button>
            <button
              className="btn sm"
              style={{ background: "rgba(255,255,255,0.1)", color: "var(--paper)", border: 0 }}
            >
              {React.createElement(window.Icons.Download, { size: 12 })} Export
            </button>
            <button className="btn sm danger">
              {React.createElement(window.Icons.Trash, { size: 12 })} Delete
            </button>
            <button
              className="icon-btn"
              style={{ color: "rgba(255,255,255,0.7)" }}
              onClick={() => setSelected(new Set())}
            >
              {React.createElement(window.Icons.X, { size: 14 })}
            </button>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <div
                    className={
                      "ck" + (selected.size === pageRows.length && pageRows.length > 0 ? " on" : "")
                    }
                    onClick={toggleAll}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>File</th>
                <th>Source</th>
                <th>Outlet</th>
                <th>Trigger</th>
                <th style={{ textAlign: "right" }}>Rows</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const src = SOURCE_LABELS[r.source];
                const st = STATUS[r.status];
                return (
                  <tr
                    key={r.id}
                    style={{ background: selected.has(r.id) ? "var(--paper-2)" : undefined }}
                  >
                    <td>
                      <div
                        className={"ck" + (selected.has(r.id) ? " on" : "")}
                        onClick={() => toggle(r.id)}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <div className="row-flex" style={{ gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "var(--paper-2)",
                            display: "grid",
                            placeItems: "center",
                            color: "var(--muted)",
                          }}
                        >
                          {React.createElement(window.Icons.File, { size: 14 })}
                        </div>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                          {r.file}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="row-flex" style={{ gap: 6 }}>
                        <span
                          style={{ width: 6, height: 6, background: src.color, borderRadius: 999 }}
                        />
                        <span className="small">{src.label}</span>
                      </span>
                    </td>
                    <td className="small">{r.outlet}</td>
                    <td className="muted xs">{r.by}</td>
                    <td className="num small" style={{ textAlign: "right", fontWeight: 600 }}>
                      {r.rows ? fmtNum(r.rows) : "—"}
                    </td>
                    <td>
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </td>
                    <td className="muted xs num">{r.uploadedAt}</td>
                    <td>
                      <button className="icon-btn">
                        {React.createElement(window.Icons.More, { size: 14 })}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="row-flex"
          style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}
        >
          <div className="muted xs">
            Showing{" "}
            <b className="num">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </b>{" "}
            of <b className="num">{filtered.length}</b> runs
          </div>
          <div className="card-spacer" />
          <Btn size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
            ← Prev
          </Btn>
          <div className="row-flex" style={{ gap: 4 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className="btn sm"
                style={
                  page === i + 1
                    ? { background: "var(--ink)", color: "var(--paper)", borderColor: "var(--ink)" }
                    : {}
                }
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Btn size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Next →
          </Btn>
        </div>
      </Card>
    </>
  );
}

window.Ingest = Ingest;
