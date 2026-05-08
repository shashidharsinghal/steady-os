function Admin() {
  const { Card, Btn, Pill, PageHead } = window.Shell;
  const [tab, setTab] = React.useState("integrations");

  return (
    <>
      <PageHead
        eyebrow="ADMIN · CONFIGURATION"
        title="Admin & integrations."
        sub="Connect Gmail for bill scanning, manage who has access to which outlets, and configure organization-wide defaults."
        actions={
          <>
            <Btn icon="Download">Audit log</Btn>
          </>
        }
      />

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { v: "integrations", l: "Integrations" },
          { v: "team", l: "Team & access" },
          { v: "organization", l: "Organization" },
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

      {tab === "integrations" && (
        <div className="row cols-2">
          <Card className="elev">
            <div className="row-flex" style={{ marginBottom: 12 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#ea4335,#fbbc05,#34a853,#4285f4)",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
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
              <div>
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
              <div>
                <div className="muted xs">Auto-create from sender domains</div>
                <div className="row-flex" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <Pill tone="blue">bescom.org</Pill>
                  <Pill tone="blue">actcorp.in</Pill>
                  <Pill tone="blue">milkyway.in</Pill>
                  <Pill tone="blue">greenleaf.in</Pill>
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

          <div className="stack">
            <Card>
              <div className="row-flex" style={{ marginBottom: 8 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--ink)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  Z
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>Zomato Partner</div>
                  <div className="muted xs">Daily settlement files & payouts</div>
                </div>
                <div className="card-spacer" />
                <Pill tone="green">Connected</Pill>
              </div>
            </Card>
            <Card>
              <div className="row-flex" style={{ marginBottom: 8 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--accent)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  S
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>Swiggy Partner</div>
                  <div className="muted xs">Daily settlement files & payouts</div>
                </div>
                <div className="card-spacer" />
                <Pill tone="amber">Re-auth</Pill>
              </div>
            </Card>
            <Card>
              <div className="row-flex" style={{ marginBottom: 8 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--blue)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  P
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>Petpooja POS</div>
                  <div className="muted xs">Order-level dine-in data sync</div>
                </div>
                <div className="card-spacer" />
                <Pill>Not connected</Pill>
              </div>
            </Card>
            <Card>
              <div className="row-flex" style={{ marginBottom: 8 }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--green)",
                    color: "white",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                  }}
                >
                  T
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>Tally / Zoho Books</div>
                  <div className="muted xs">Push P&L exports for accountant</div>
                </div>
                <div className="card-spacer" />
                <Pill>Not connected</Pill>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "team" && (
        <Card>
          <div className="row-flex" style={{ marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Team & access</div>
              <div className="muted small">
                Invite managers and partners. Roles control which outlets and modules they can see.
              </div>
            </div>
            <div className="card-spacer" />
            <Btn kind="primary" icon="Plus">
              Invite
            </Btn>
          </div>
          <table className="t">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Outlets</th>
                <th>Last active</th>
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
                  last: "now",
                  status: "active",
                },
                {
                  n: "Priya Menon",
                  e: "priya@steadystride.in",
                  role: "Partner",
                  outlets: "All 5",
                  last: "2h ago",
                  status: "active",
                },
                {
                  n: "Arjun Rao",
                  e: "arjun.r@steadystride.in",
                  role: "Manager",
                  outlets: "Indiranagar",
                  last: "12m ago",
                  status: "active",
                },
                {
                  n: "Neha Iyer",
                  e: "neha.i@steadystride.in",
                  role: "Manager",
                  outlets: "Koramangala, HSR",
                  last: "—",
                  status: "invite-sent",
                },
                {
                  n: "Vikram Shah",
                  e: "vikram.s@steadystride.in",
                  role: "Manager",
                  outlets: "Bandra West",
                  last: "1d ago",
                  status: "active",
                },
              ].map((p) => (
                <tr key={p.e}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.n}</div>
                    <div className="muted xs">{p.e}</div>
                  </td>
                  <td>
                    <Pill
                      tone={p.role === "Owner" ? "violet" : p.role === "Partner" ? "blue" : "amber"}
                    >
                      {p.role}
                    </Pill>
                  </td>
                  <td className="small">{p.outlets}</td>
                  <td className="muted small">{p.last}</td>
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
          <div className="divider" />
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Onboard a new manager or partner</div>
          <div className="row-flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="text" placeholder="Full name" style={{ width: 180 }} />
            <input className="text" placeholder="email@example.com" style={{ width: 220 }} />
            <select className="sel" style={{ width: 140 }}>
              <option>Manager</option>
              <option>Partner</option>
            </select>
            <select className="sel" style={{ width: 200 }}>
              <option>Indiranagar Flagship</option>
              <option>Koramangala</option>
              <option>HSR Layout</option>
              <option>Bandra West</option>
              <option>Powai</option>
              <option>All outlets</option>
            </select>
            <Btn kind="primary" icon="Plus">
              Send invite
            </Btn>
          </div>
        </Card>
      )}

      {tab === "organization" && (
        <div className="row cols-2">
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Organization details</div>
            <div className="stack-sm">
              <div>
                <div className="muted xs">Legal name</div>
                <input className="text" defaultValue="SteadyStride Hospitality Pvt Ltd" />
              </div>
              <div>
                <div className="muted xs">GSTIN</div>
                <input className="text" defaultValue="29ABCDE1234F1Z5" />
              </div>
              <div>
                <div className="muted xs">Reporting currency</div>
                <select className="sel" defaultValue="INR">
                  <option>INR</option>
                  <option>USD</option>
                </select>
              </div>
              <div>
                <div className="muted xs">Fiscal year start</div>
                <select className="sel" defaultValue="apr">
                  <option value="apr">April</option>
                  <option value="jan">January</option>
                </select>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Notifications</div>
            <div className="stack-sm">
              {[
                { k: "Critical inventory alerts", v: "Email + SMS" },
                { k: "Daily morning summary", v: "Email" },
                { k: "Bill auto-scan results", v: "In-app" },
                { k: "Weekly P&L digest", v: "Email" },
              ].map((n) => (
                <div
                  key={n.k}
                  className="row-flex"
                  style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <div style={{ flex: 1, fontWeight: 500 }}>{n.k}</div>
                  <select className="sel" defaultValue={n.v} style={{ width: 140 }}>
                    <option>Off</option>
                    <option>In-app</option>
                    <option>Email</option>
                    <option>Email + SMS</option>
                  </select>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

window.Admin = Admin;
