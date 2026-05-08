function Expenses() {
  const { Card, Btn, Pill, PageHead, Seg } = window.Shell;
  const { Sparkline, Donut } = window.Charts;
  const { expenses, expenseCategories, fmtINR, fmtNum } = window.MOCK;
  const [tab, setTab] = React.useState("ledger");

  const pendingBills = [
    {
      id: "b1",
      vendor: "BESCOM Electricity",
      forItem: "May electricity bill",
      period: "May 2026",
      amount: 4820000,
      due: "2026-05-12",
      status: "scanned",
      source: "Gmail · billing@bescom.org",
      confidence: 96,
    },
    {
      id: "b2",
      vendor: "ACT Fibernet",
      forItem: "Internet — Indiranagar + KOR",
      period: "May 2026",
      amount: 380000,
      due: "2026-05-14",
      status: "scanned",
      source: "Gmail · noreply@actcorp.in",
      confidence: 98,
    },
    {
      id: "b3",
      vendor: "Greenleaf Meats",
      forItem: "Chicken supply, week 18",
      period: "Apr W18",
      amount: 1820000,
      due: "2026-05-08",
      status: "review",
      source: "Gmail · accounts@greenleaf.in",
      confidence: 81,
    },
    {
      id: "b4",
      vendor: "Brigade Property",
      forItem: "May rent — Indiranagar",
      period: "May 2026",
      amount: 38500000,
      due: "2026-05-10",
      status: "approved",
      source: "Manual · Rohan",
      confidence: null,
    },
    {
      id: "b5",
      vendor: "MDH Wholesale",
      forItem: "Spice restock invoice",
      period: "Apr 2026",
      amount: 1240000,
      due: "2026-05-15",
      status: "scanned",
      source: "Gmail · billing@mdh.com",
      confidence: 92,
    },
    {
      id: "b6",
      vendor: "Milky Way Dairy",
      forItem: "Dairy supply, Apr final",
      period: "Apr 2026",
      amount: 2680000,
      due: "2026-05-09",
      status: "overdue",
      source: "Gmail · ops@milkyway.in",
      confidence: 94,
    },
    {
      id: "b7",
      vendor: "Bandra Landlord",
      forItem: "May rent — Bandra West",
      period: "May 2026",
      amount: 42000000,
      due: "2026-05-10",
      status: "approved",
      source: "Manual · Priya",
      confidence: null,
    },
  ];

  const totalPending = pendingBills
    .filter((b) => b.status !== "approved")
    .reduce((s, b) => s + b.amount, 0);
  const overdueCount = pendingBills.filter((b) => b.status === "overdue").length;
  const scanCount = pendingBills.filter((b) => b.source.startsWith("Gmail")).length;

  const totalSpent = expenseCategories.reduce((s, c) => s + c.spent, 0);
  const totalBudget = expenseCategories.reduce((s, c) => s + c.monthBudget, 0);
  const remaining = totalBudget - totalSpent;
  const pct = (totalSpent / totalBudget) * 100;

  const CAT_COLOR = {
    Rent: "var(--accent)",
    Salaries: "var(--blue)",
    Utilities: "var(--violet)",
    Supplies: "var(--green)",
    Marketing: "var(--amber)",
    Repairs: "var(--red)",
  };

  return (
    <>
      <PageHead
        eyebrow="EXPENSES · MAY 2026"
        title="Operating spend."
        sub="Rent, payroll, utilities, marketing — recurring runs auto-import; one-offs are added here or attached in Ingest."
        actions={
          <>
            <Btn icon="Download">Export ledger</Btn>
            <Btn icon="Plus" kind="primary">
              Add expense
            </Btn>
          </>
        }
      />

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { v: "ledger", l: "Spend overview" },
          { v: "pending", l: `Pending bills · ${pendingBills.length}` },
        ].map((t) => (
          <div
            key={t.v}
            className={"tab " + (tab === t.v ? "active" : "")}
            onClick={() => setTab(t.v)}
          >
            {t.l}
          </div>
        ))}
      </div>

      {tab === "ledger" && <></>}
      {tab === "pending" && (
        <>
          <div className="row cols-3" style={{ marginBottom: 16 }}>
            <Card className="elev">
              <div className="card-title">Total pending</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
                {fmtINR(totalPending)}
              </div>
              <div className="muted small">{pendingBills.length - 2} bills awaiting approval</div>
            </Card>
            <Card>
              <div className="card-title">Overdue</div>
              <div
                className="num"
                style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: "var(--red)" }}
              >
                {overdueCount}
              </div>
              <div className="muted small">Past their due date</div>
            </Card>
            <Card>
              <div className="card-title">Auto-scanned this week</div>
              <div
                className="num"
                style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: "var(--green)" }}
              >
                {scanCount}
              </div>
              <div className="muted small">From Gmail · last sync 14 min ago</div>
            </Card>
          </div>

          <div
            className="banner"
            style={{
              marginBottom: 12,
              background: "var(--blue-soft)",
              borderColor: "transparent",
              color: "var(--blue)",
            }}
          >
            <span style={{ fontWeight: 600 }}>Gmail scan active</span>
            <span style={{ opacity: 0.8 }}>
              · Watching billing@, accounts@, invoice@ aliases on rohan@steadystride.in
            </span>
            <div className="card-spacer" />
            <Btn size="sm">Sync now</Btn>
            <Btn size="sm" kind="primary" icon="Plus">
              Add manually
            </Btn>
          </div>

          <Card>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <div className="ck" />
                  </th>
                  <th>Vendor / For</th>
                  <th>Period</th>
                  <th>Due</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Status</th>
                  <th>Initiated from</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingBills.map((b) => {
                  const tone =
                    b.status === "overdue"
                      ? "red"
                      : b.status === "review"
                        ? "amber"
                        : b.status === "approved"
                          ? "green"
                          : "blue";
                  const label =
                    b.status === "overdue"
                      ? "Overdue"
                      : b.status === "review"
                        ? "Needs review"
                        : b.status === "approved"
                          ? "Approved"
                          : "Auto-scanned";
                  const fromGmail = b.source.startsWith("Gmail");
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="ck" />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.vendor}</div>
                        <div className="muted xs">{b.forItem}</div>
                      </td>
                      <td className="small">{b.period}</td>
                      <td className="num small">{b.due}</td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                        {fmtINR(b.amount)}
                      </td>
                      <td>
                        <Pill tone={tone}>{label}</Pill>
                      </td>
                      <td>
                        <div className="row-flex" style={{ gap: 6 }}>
                          {fromGmail ? (
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                background: "linear-gradient(135deg,#ea4335,#fbbc05)",
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 3,
                                background: "var(--paper-2)",
                                border: "1px solid var(--line)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <div className="small">{b.source}</div>
                            {b.confidence && <div className="muted xs">{b.confidence}% match</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Btn size="sm">{b.status === "approved" ? "View" : "Approve"}</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {tab === "admin" && null}
      {false && (
        <div className="row cols-2">
          <Card className="elev">
            <div className="row-flex" style={{ marginBottom: 12 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "linear-gradient(135deg,#ea4335,#fbbc05,#34a853,#4285f4)",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                G
              </span>
              <div>
                <div style={{ fontWeight: 600 }}>Gmail integration</div>
                <div className="muted xs">Bill scanning, invoice extraction, payment alerts</div>
              </div>
              <div className="card-spacer" />
              <Pill tone="green">Connected</Pill>
            </div>
            <div className="divider" />
            <div className="stack-sm">
              <div className="row-flex">
                <div style={{ flex: 1 }}>
                  <div className="muted xs">Connected account</div>
                  <div style={{ fontWeight: 600 }}>rohan@steadystride.in</div>
                </div>
                <Btn size="sm">Switch</Btn>
              </div>
              <div className="row-flex">
                <div style={{ flex: 1 }}>
                  <div className="muted xs">Watched aliases</div>
                  <div className="row-flex" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Pill>billing@</Pill>
                    <Pill>accounts@</Pill>
                    <Pill>invoice@</Pill>
                    <Pill>noreply@</Pill>
                    <Btn size="sm" icon="Plus">
                      Add
                    </Btn>
                  </div>
                </div>
              </div>
              <div className="row-flex">
                <div style={{ flex: 1 }}>
                  <div className="muted xs">Auto-create from sender domains</div>
                  <div className="row-flex" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Pill tone="blue">bescom.org</Pill>
                    <Pill tone="blue">actcorp.in</Pill>
                    <Pill tone="blue">milkyway.in</Pill>
                    <Pill tone="blue">greenleaf.in</Pill>
                  </div>
                </div>
              </div>
              <div className="row-flex" style={{ gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="muted xs">Sync frequency</div>
                  <select className="sel" defaultValue="15m">
                    <option value="15m">Every 15 min</option>
                    <option>Hourly</option>
                    <option>Daily</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="muted xs">Auto-approve under</div>
                  <input className="text" defaultValue="₹5,000" />
                </div>
              </div>
              <div className="row-flex" style={{ marginTop: 8 }}>
                <Btn>Test connection</Btn>
                <Btn>Re-scan last 30 days</Btn>
                <div className="card-spacer" />
                <Btn kind="ghost" style={{ color: "var(--red)" }}>
                  Disconnect
                </Btn>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Team & access</div>
            <div className="muted small" style={{ marginBottom: 14 }}>
              Invite managers and partners. Roles control which outlets and modules they can see.
            </div>
            <table className="t">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Role</th>
                  <th>Outlets</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    n: "Rohan Kapoor",
                    e: "rohan@steadystride.in",
                    role: "Owner",
                    outlets: "All 5",
                    status: "active",
                  },
                  {
                    n: "Priya Menon",
                    e: "priya@steadystride.in",
                    role: "Partner",
                    outlets: "All 5",
                    status: "active",
                  },
                  {
                    n: "Arjun Rao",
                    e: "arjun.r@steadystride.in",
                    role: "Manager",
                    outlets: "Indiranagar",
                    status: "active",
                  },
                  {
                    n: "Neha Iyer",
                    e: "neha.i@steadystride.in",
                    role: "Manager",
                    outlets: "Koramangala, HSR",
                    status: "invite-sent",
                  },
                ].map((p) => (
                  <tr key={p.e}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.n}</div>
                      <div className="muted xs">{p.e}</div>
                    </td>
                    <td>
                      <Pill
                        tone={
                          p.role === "Owner" ? "violet" : p.role === "Partner" ? "blue" : "amber"
                        }
                      >
                        {p.role}
                      </Pill>
                    </td>
                    <td className="small">{p.outlets}</td>
                    <td>
                      {p.status === "active" ? (
                        <Pill tone="green">Active</Pill>
                      ) : (
                        <Pill tone="amber">Invite sent</Pill>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Btn size="sm">Edit</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row-flex" style={{ marginTop: 14, gap: 8 }}>
              <input className="text" placeholder="manager@email.com" />
              <select className="sel" style={{ width: 160 }}>
                <option>Manager</option>
                <option>Partner</option>
              </select>
              <Btn kind="primary" icon="Plus">
                Send invite
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {tab !== "ledger" ? null : <></>}
      {tab === "ledger" && (
        <>
          <div className="row cols-12" style={{ marginBottom: 16 }}>
            <Card span={5} className="elev">
              <div className="card-title">May spend so far</div>
              <div
                className="num"
                style={{ fontSize: 36, fontWeight: 600, marginTop: 8, letterSpacing: "-0.02em" }}
              >
                {fmtINR(totalSpent)}
              </div>
              <div className="muted small">
                of {fmtINR(totalBudget)} monthly budget · {pct.toFixed(1)}% used
              </div>
              <div className="bar-track" style={{ height: 8, marginTop: 14 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: pct + "%",
                    background: pct > 95 ? "var(--red)" : pct > 80 ? "var(--amber)" : "var(--ink)",
                  }}
                />
              </div>
              <div className="row-flex" style={{ marginTop: 12, gap: 16 }}>
                <div>
                  <div className="muted xs">Days into month</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>
                    5 of 31
                  </div>
                </div>
                <div className="vdivider" style={{ height: 28 }} />
                <div>
                  <div className="muted xs">Pace</div>
                  <div
                    className="num"
                    style={{ fontWeight: 700, fontSize: 16, color: "var(--amber)" }}
                  >
                    +12% over budget
                  </div>
                </div>
                <div className="vdivider" style={{ height: 28 }} />
                <div>
                  <div className="muted xs">Recurring (auto)</div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>
                    87%
                  </div>
                </div>
              </div>
            </Card>
            <Card span={7} title="By category">
              {expenseCategories.map((c) => {
                const p = (c.spent / c.monthBudget) * 100;
                return (
                  <div
                    key={c.name}
                    style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}
                  >
                    <div className="row-flex" style={{ marginBottom: 6 }}>
                      <span style={{ width: 8, height: 8, background: c.color, borderRadius: 2 }} />
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                      <span className="num" style={{ fontWeight: 600 }}>
                        {fmtINR(c.spent)}
                      </span>
                      <span className="muted xs num" style={{ width: 80, textAlign: "right" }}>
                        of {fmtINR(c.monthBudget)}
                      </span>
                      <span
                        className={"num xs " + (p > 100 ? "delta down" : "muted")}
                        style={{ width: 50, textAlign: "right", fontWeight: 600 }}
                      >
                        {p.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bar-track" style={{ height: 4 }}>
                      <div
                        className="bar-fill"
                        style={{ width: Math.min(100, p) + "%", background: c.color }}
                      />
                      {p > 100 && (
                        <div
                          style={{
                            position: "relative",
                            marginTop: -4,
                            height: 4,
                            width: p - 100 + "%",
                            background: "var(--red)",
                            borderRadius: 999,
                            opacity: 0.7,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          <Card
            title="Expense ledger"
            action={
              <>
                <Seg
                  options={[
                    { value: "all", label: "All" },
                    { value: "recurring", label: "Recurring" },
                    { value: "oneoff", label: "One-off" },
                  ]}
                  value="all"
                  onChange={() => {}}
                />
              </>
            }
          >
            <table className="t">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Outlet</th>
                  <th>Note</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="num small">{e.date}</td>
                    <td>
                      <span className="row-flex" style={{ gap: 6 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            background: CAT_COLOR[e.category],
                            borderRadius: 999,
                          }}
                        />
                        <span className="small" style={{ fontWeight: 500 }}>
                          {e.category}
                        </span>
                      </span>
                    </td>
                    <td className="small">{e.vendor}</td>
                    <td className="muted small">{e.outlet}</td>
                    <td className="small">{e.note}</td>
                    <td>
                      {e.recurring ? <Pill tone="blue">Recurring</Pill> : <Pill>One-off</Pill>}
                    </td>
                    <td className="muted xs">{e.added}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtINR(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}

window.Expenses = Expenses;
