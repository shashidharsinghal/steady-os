function Customers() {
  const { Card, Btn, Pill, Seg, PageHead, Stat } = window.Shell;
  const { Sparkline } = window.Charts;
  const { customers, fmtINR } = window.MOCK;
  const [seg, setSeg] = React.useState("all");

  const segCounts = {
    all: customers.length,
    Champion: customers.filter((c) => c.segment === "Champion").length,
    Regular: customers.filter((c) => c.segment === "Regular").length,
    Lapsed: customers.filter((c) => c.segment === "Lapsed").length,
    New: customers.filter((c) => c.segment === "New").length,
  };

  const SEG_COLOR = {
    Champion: "var(--accent)",
    Regular: "var(--blue)",
    Lapsed: "var(--red)",
    New: "var(--green)",
  };
  const filtered = seg === "all" ? customers : customers.filter((c) => c.segment === seg);

  return (
    <>
      <PageHead
        eyebrow="CUSTOMER INTELLIGENCE"
        title="Who's coming back."
        sub="Unified across dine-in payments, Swiggy, and Zomato. Phone is the merge key."
        actions={
          <>
            <Btn icon="Sparkles">3 merge suggestions</Btn>
            <Btn icon="Plus" kind="primary">
              Add customer
            </Btn>
          </>
        }
      />

      {/* Segment cards */}
      <div className="row cols-4" style={{ marginBottom: 16 }}>
        {[
          {
            name: "Champions",
            count: 298,
            val: "₹48L LTV",
            desc: "≥10 visits, last 14 days",
            color: "var(--accent)",
            spark: [40, 44, 47, 50, 52, 55, 58, 60, 62, 65, 67, 70],
          },
          {
            name: "Regulars",
            count: 612,
            val: "₹62L LTV",
            desc: "5–9 visits, last 30 days",
            color: "var(--blue)",
            spark: [50, 52, 49, 53, 56, 54, 58, 60, 58, 62, 64, 66],
          },
          {
            name: "New this month",
            count: 184,
            val: "12% conv to regular",
            desc: "First-order in last 30 days",
            color: "var(--green)",
            spark: [10, 14, 18, 22, 25, 30, 34, 38, 42, 48, 52, 58],
          },
          {
            name: "Lapsed regulars",
            count: 47,
            val: "₹14L at risk",
            desc: "Was regular, gone 30+ days",
            color: "var(--red)",
            spark: [80, 75, 70, 68, 64, 62, 58, 55, 52, 50, 48, 47],
          },
        ].map((c) => (
          <Card key={c.name} className="elev">
            <div className="row-flex">
              <span style={{ width: 8, height: 8, background: c.color, borderRadius: 999 }} />
              <div className="card-title">{c.name}</div>
            </div>
            <div
              className="num"
              style={{ fontSize: 32, fontWeight: 600, marginTop: 8, letterSpacing: "-0.02em" }}
            >
              {c.count}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.color, marginTop: 2 }}>
              {c.val}
            </div>
            <div className="muted xs" style={{ marginTop: 6 }}>
              {c.desc}
            </div>
            <div style={{ marginTop: 10 }}>
              <Sparkline values={c.spark} color={c.color} fill height={28} />
            </div>
          </Card>
        ))}
      </div>

      {/* Lapsed regulars highlight */}
      <Card style={{ marginBottom: 16, background: "var(--red-soft)", border: 0 }}>
        <div className="row-flex" style={{ gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--red)",
              color: "white",
              display: "grid",
              placeItems: "center",
            }}
          >
            {React.createElement(window.Icons.AlertTriangle, { size: 20 })}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              47 regulars haven't ordered in 30+ days
            </div>
            <div className="small" style={{ color: "var(--red)", marginTop: 2 }}>
              Roughly <b>₹14L</b> in annual revenue at risk. Riya M., Karthik I., and 4 others were
              weekly orderers.
            </div>
          </div>
          <Btn>View all</Btn>
          <Btn kind="primary">Send win-back SMS</Btn>
        </div>
      </Card>

      {/* Filters + table */}
      <Card>
        <div className="row-flex" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <Seg
            options={[
              { value: "all", label: `All · ${segCounts.all}` },
              { value: "Champion", label: `Champions · ${segCounts.Champion}` },
              { value: "Regular", label: `Regulars · ${segCounts.Regular}` },
              { value: "Lapsed", label: `Lapsed · ${segCounts.Lapsed}` },
              { value: "New", label: `New · ${segCounts.New}` },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <div className="card-spacer" />
          <select className="sel" style={{ width: 150 }}>
            <option>Any channel</option>
            <option>Dine-in only</option>
            <option>Aggregator only</option>
            <option>Cross-channel</option>
          </select>
          <select className="sel" style={{ width: 150 }}>
            <option>Any visits</option>
            <option>5+ visits</option>
            <option>10+ visits</option>
          </select>
          <Btn size="sm" icon="Filter">
            More filters
          </Btn>
        </div>
        <table className="t">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Segment</th>
              <th>Channels</th>
              <th style={{ textAlign: "right" }}>Visits</th>
              <th style={{ textAlign: "right" }}>Lifetime spend</th>
              <th>Last seen</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="row-flex" style={{ gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: SEG_COLOR[c.segment],
                        color: "white",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {c.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="muted xs mono">{c.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Pill
                    tone={
                      c.segment === "Champion"
                        ? "default"
                        : c.segment === "Lapsed"
                          ? "red"
                          : c.segment === "New"
                            ? "green"
                            : "blue"
                    }
                  >
                    {c.segment}
                  </Pill>
                </td>
                <td className="muted xs">{c.channels.join(" · ")}</td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {c.visits}
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtINR(c.spend)}
                </td>
                <td className="small">{c.last}</td>
                <td style={{ width: 90 }}>
                  <Sparkline
                    values={Array.from(
                      { length: 10 },
                      (_, i) => 30 + Math.sin(i * 0.7) * 10 + i * (c.segment === "Lapsed" ? -2 : 1)
                    )}
                    color={SEG_COLOR[c.segment]}
                    height={20}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

window.Customers = Customers;
