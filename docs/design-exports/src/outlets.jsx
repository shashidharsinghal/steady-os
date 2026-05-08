function Outlets() {
  const { Card, Btn, Pill, PageHead } = window.Shell;
  const { Sparkline } = window.Charts;
  const { outlets, fmtINR } = window.MOCK;

  return (
    <>
      <PageHead
        eyebrow="PORTFOLIO"
        title="Six outlets, two cities."
        sub="Live status, this-month revenue, and what each location needs from you today."
        actions={
          <>
            <Btn icon="Globe">Map view</Btn>
            <Btn icon="Plus" kind="primary">
              New outlet
            </Btn>
          </>
        }
      />

      <div className="row cols-3">
        {outlets.map((o) => {
          const tone = o.status === "live" ? "green" : o.status === "onboarding" ? "blue" : "amber";
          const label =
            o.status === "live"
              ? "Live"
              : o.status === "onboarding"
                ? "Onboarding"
                : "Needs attention";
          return (
            <div
              key={o.id}
              className="card elev"
              style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              <div className="photo" style={{ height: 130, borderRadius: 0, position: "relative" }}>
                <span>OUTLET PHOTO</span>
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    right: 12,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Pill tone={tone}>● {label}</Pill>
                  <div
                    className="pill"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      borderColor: "transparent",
                      color: "var(--ink)",
                    }}
                  >
                    {o.city}
                  </div>
                </div>
              </div>
              <div style={{ padding: 18, flex: 1 }}>
                <div
                  className="muted xs"
                  style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}
                >
                  {o.brand}
                </div>
                <div
                  style={{ fontSize: 17, fontWeight: 600, marginTop: 4, letterSpacing: "-0.01em" }}
                >
                  {o.name}
                </div>
                <div className="row-flex" style={{ marginTop: 14, gap: 16 }}>
                  <div>
                    <div className="muted xs">This month</div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>
                      {fmtINR(o.rev)}
                    </div>
                  </div>
                  <div className="vdivider" style={{ height: 28 }} />
                  <div>
                    <div className="muted xs">Team</div>
                    <div className="num" style={{ fontWeight: 700, fontSize: 16 }}>
                      {o.staff}
                    </div>
                  </div>
                  <div className="vdivider" style={{ height: 28 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="muted xs">30d trend</div>
                    <Sparkline
                      values={Array.from(
                        { length: 30 },
                        (_, i) => 50 + Math.sin(i * 0.5 + o.staff) * 14 + i * 0.4
                      )}
                      color={o.status === "attention" ? "var(--red)" : "var(--ink)"}
                      height={26}
                    />
                  </div>
                </div>
              </div>
              <div
                style={{ borderTop: "1px solid var(--line)", padding: 12, display: "flex", gap: 8 }}
              >
                <Btn size="sm" style={{ flex: 1, justifyContent: "center" }}>
                  Open
                </Btn>
                <Btn size="sm" icon="Edit">
                  Edit
                </Btn>
                <button className="icon-btn">
                  {React.createElement(window.Icons.More, { size: 14 })}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Employees() {
  const { Card, Btn, Pill, PageHead, Seg } = window.Shell;
  const { employees } = window.MOCK;
  const [tab, setTab] = React.useState("active");

  return (
    <>
      <PageHead
        eyebrow="TEAM"
        title="Who's on shift."
        sub="Track team members across outlets, manage payroll history, and assignments."
        actions={
          <>
            <Btn icon="Download">Export roster</Btn>
            <Btn icon="Plus" kind="primary">
              New employee
            </Btn>
          </>
        }
      />

      <div className="row cols-4" style={{ marginBottom: 16 }}>
        {[
          { label: "Total team", value: "104", sub: "across 6 outlets" },
          { label: "Full-time", value: "82", sub: "78.8%" },
          { label: "Joined this month", value: "7", sub: "5 still in onboarding" },
          { label: "Unassigned", value: "3", sub: "needs outlet placement" },
        ].map((s) => (
          <Card key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
              {s.value}
            </div>
            <div className="muted xs">{s.sub}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="row-flex" style={{ marginBottom: 14, gap: 10 }}>
          <Seg
            options={[
              { value: "active", label: "Active · 96" },
              { value: "archived", label: "Archived · 8" },
              { value: "unassigned", label: "Unassigned · 3" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="card-spacer" />
          <select className="sel" style={{ width: 160 }}>
            <option>All roles</option>
            <option>Manager</option>
            <option>Chef</option>
            <option>Server</option>
          </select>
          <select className="sel" style={{ width: 180 }}>
            <option>All outlets</option>
            <option>Indiranagar</option>
            <option>Koramangala</option>
          </select>
        </div>
        <table className="t">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Outlet</th>
              <th>Type</th>
              <th>Phone</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="row-flex" style={{ gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--paper-2)",
                        color: "var(--ink)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {e.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                  </div>
                </td>
                <td>
                  <Pill
                    tone={
                      e.role === "Manager" ? "violet" : e.role === "Head Chef" ? "amber" : "default"
                    }
                  >
                    {e.role}
                  </Pill>
                </td>
                <td className="small">{e.outlet}</td>
                <td className="small">{e.type}</td>
                <td className="muted xs mono">{e.phone}</td>
                <td className="small">{e.joined}</td>
                <td>
                  <button className="icon-btn">
                    {React.createElement(window.Icons.More, { size: 14 })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

window.Outlets = Outlets;
window.Employees = Employees;
