function Pnl() {
  const { Card, Btn, Pill, PageHead, Seg } = window.Shell;
  const { LineArea, Sparkline } = window.Charts;
  const { pnlReports, fmtINR } = window.MOCK;
  const [month, setMonth] = React.useState("Apr 2026");

  const aprReports = pnlReports.filter((p) => p.month === "Apr 2026");
  const totalRev = aprReports.reduce((s, r) => s + r.revenue, 0);
  const totalProfit = aprReports.reduce((s, r) => s + r.profit, 0);
  const totalCosts = aprReports.reduce((s, r) => s + r.costs, 0);
  const margin = (totalProfit / totalRev) * 100;

  const trend = Array.from({ length: 12 }, (_, i) => ({
    label: ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"][i],
    sales: 80000000 + Math.sin(i * 0.5) * 10000000 + i * 1500000,
  }));

  return (
    <>
      <PageHead
        eyebrow="MONTHLY P&L"
        title="April 2026 closed cleanly."
        sub="Five outlets reporting profit. Powai is the only loss-maker — third month in a row."
        actions={
          <>
            <Btn icon="Download">Export consolidated</Btn>
            <Btn icon="Upload" kind="primary">
              Upload report
            </Btn>
          </>
        }
      />

      <div className="row cols-4" style={{ marginBottom: 16 }}>
        {[
          { label: "Gross revenue", value: fmtINR(totalRev), delta: "+12.4%", dir: "up" },
          { label: "Total costs", value: fmtINR(totalCosts), delta: "+8.2%", dir: "down" },
          { label: "Net profit", value: fmtINR(totalProfit), delta: "+24.1%", dir: "up" },
          { label: "Avg margin", value: margin.toFixed(1) + "%", delta: "+1.8pp", dir: "up" },
        ].map((s) => (
          <Card key={s.label} className="elev">
            <div className="stat-label">{s.label}</div>
            <div
              className="num"
              style={{ fontSize: 28, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em" }}
            >
              {s.value}
            </div>
            <div className={"delta " + s.dir} style={{ fontSize: 12, marginTop: 4 }}>
              {s.dir === "up" ? "▴" : "▾"} {s.delta} <span className="muted">vs Mar</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="row cols-12" style={{ marginBottom: 16 }}>
        <Card
          span={8}
          title="12-month trailing revenue · all outlets"
          action={
            <Seg
              options={[
                { value: "rev", label: "Revenue" },
                { value: "profit", label: "Profit" },
                { value: "margin", label: "Margin" },
              ]}
              value="rev"
              onChange={() => {}}
            />
          }
        >
          <LineArea
            data={trend}
            accessor="sales"
            color="var(--ink)"
            height={220}
            format={(v) => "₹" + (v / 10000000).toFixed(1) + " Cr"}
          />
        </Card>
        <Card span={4} title="Cost composition · April">
          {[
            { name: "Cost of goods", val: 42, color: "var(--ink)" },
            { name: "Rent", val: 18, color: "var(--accent)" },
            { name: "Salaries", val: 22, color: "var(--blue)" },
            { name: "Utilities", val: 8, color: "var(--violet)" },
            { name: "Marketing", val: 5, color: "var(--green)" },
            { name: "Other", val: 5, color: "var(--muted)" },
          ].map((c) => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div className="row-flex" style={{ marginBottom: 6, fontSize: 12 }}>
                <span style={{ flex: 1, fontWeight: 500 }}>{c.name}</span>
                <span className="num" style={{ fontWeight: 600 }}>
                  {c.val}%
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: c.val + "%", background: c.color }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card
        title="Per-outlet breakdown"
        action={
          <Seg
            options={[
              { value: "Apr 2026", label: "Apr 2026" },
              { value: "Mar 2026", label: "Mar 2026" },
            ]}
            value={month}
            onChange={setMonth}
          />
        }
      >
        <table className="t">
          <thead>
            <tr>
              <th>Outlet</th>
              <th style={{ textAlign: "right" }}>Revenue</th>
              <th style={{ textAlign: "right" }}>Costs</th>
              <th style={{ textAlign: "right" }}>Net profit</th>
              <th style={{ textAlign: "right" }}>Margin</th>
              <th>Trend</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {aprReports.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.outlet}</div>
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtINR(r.revenue)}
                </td>
                <td className="num" style={{ textAlign: "right" }}>
                  {fmtINR(r.costs)}
                </td>
                <td
                  className="num"
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color: r.profit < 0 ? "var(--red)" : "var(--ink)",
                  }}
                >
                  {r.profit < 0 ? "−" : ""}
                  {fmtINR(Math.abs(r.profit))}
                </td>
                <td style={{ textAlign: "right" }}>
                  <Pill tone={r.margin < 0 ? "red" : r.margin < 18 ? "amber" : "green"}>
                    {r.margin.toFixed(1)}%
                  </Pill>
                </td>
                <td style={{ width: 100 }}>
                  <Sparkline
                    values={Array.from(
                      { length: 12 },
                      (_, i) => 50 + Math.sin(i * 0.5 + r.id.length) * 12 + i * (r.margin / 30)
                    )}
                    color={r.profit < 0 ? "var(--red)" : "var(--green)"}
                    height={22}
                  />
                </td>
                <td>
                  <Btn size="sm">Open</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

window.Pnl = Pnl;
