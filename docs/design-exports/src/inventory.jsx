function Inventory() {
  const { Card, Btn, Pill, PageHead, Seg } = window.Shell;
  const { Sparkline } = window.Charts;
  const { inventory, recipes, fmtINR, fmtNum } = window.MOCK;
  const [tab, setTab] = React.useState("stock");

  const critical = inventory.filter((i) => i.status === "critical");
  const low = inventory.filter((i) => i.status === "low");
  const totalValue = inventory.reduce((s, i) => s + i.stock * i.cost, 0);

  // For each recipe, compute how many units we can produce given stock
  // (simplified mock — using a simple ingredient mapping)
  const itemPotential = recipes.map((r) => {
    const possible = Math.floor(60 + Math.random() * 200);
    return { ...r, possible, revenue: possible * r.price };
  });

  return (
    <>
      <PageHead
        eyebrow="INVENTORY · INDIRANAGAR FLAGSHIP"
        title="Raw materials & projection."
        sub="What's in stock right now, what's running thin, and what you can still cook tonight."
        actions={
          <>
            <Btn icon="Download">Export</Btn>
            <Btn icon="Upload">Upload recipes</Btn>
            <Btn icon="Plus" kind="primary">
              Add stock
            </Btn>
          </>
        }
      />

      {/* Critical alert hero */}
      {(critical.length > 0 || low.length > 0) && (
        <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden", border: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr" }}>
            <div style={{ padding: 24, background: "var(--red-soft)" }}>
              <div className="row-flex" style={{ marginBottom: 8 }}>
                <span
                  style={{ width: 6, height: 6, background: "var(--red)", borderRadius: 999 }}
                />
                <span className="page-eyebrow" style={{ margin: 0, color: "var(--red)" }}>
                  STOCK ALERT · {critical.length} critical · {low.length} low
                </span>
              </div>
              <div
                style={{
                  fontFamily: "Instrument Serif, serif",
                  fontStyle: "italic",
                  fontSize: 32,
                  lineHeight: 1.1,
                  marginBottom: 8,
                }}
              >
                You'll run out of <span style={{ color: "var(--red)" }}>maida</span> and{" "}
                <span style={{ color: "var(--red)" }}>cream</span> before Friday's dinner rush.
              </div>
              <div className="small" style={{ color: "var(--ink-2)" }}>
                That blocks Garlic Naan, Butter Chicken sauce, and Kulfi Falooda — roughly{" "}
                <b>₹84,000 in lost revenue per day</b>.
              </div>
              <div className="row-flex" style={{ marginTop: 16, gap: 8 }}>
                <Btn kind="primary">Generate purchase order</Btn>
                <Btn>Snooze for 4h</Btn>
              </div>
            </div>
            <div
              style={{
                padding: 20,
                background: "var(--paper)",
                borderLeft: "1px solid var(--line)",
              }}
            >
              <div className="card-title" style={{ marginBottom: 10 }}>
                Days of cover · critical items
              </div>
              {[...critical, ...low].slice(0, 4).map((i) => {
                const days = i.stock / i.dailyUse;
                return (
                  <div
                    key={i.id}
                    style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}
                  >
                    <div className="row-flex">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div>
                        <div className="muted xs">
                          {i.stock} {i.unit} on hand · {i.dailyUse} {i.unit}/day
                        </div>
                      </div>
                      <div
                        className="num"
                        style={{
                          fontWeight: 700,
                          color: i.status === "critical" ? "var(--red)" : "var(--amber)",
                        }}
                      >
                        {days.toFixed(1)}d
                      </div>
                    </div>
                    <div className="bar-track" style={{ marginTop: 6, height: 4 }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: Math.min(100, (days / 7) * 100) + "%",
                          background: i.status === "critical" ? "var(--red)" : "var(--amber)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Stat strip */}
      <div className="row cols-4" style={{ marginBottom: 16 }}>
        {[
          {
            label: "Stock value · current",
            value: fmtINR(totalValue),
            sub: "12 raw materials tracked",
          },
          {
            label: "Items at or below reorder",
            value: critical.length + low.length + "",
            sub: critical.length + " critical · " + low.length + " low",
          },
          { label: "Days of cover · weighted", value: "4.2 days", sub: "across all ingredients" },
          { label: "Recipe coverage", value: "94%", sub: "8 of 8 menu items priced" },
        ].map((s) => (
          <Card key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div
              className="num"
              style={{ fontSize: 24, fontWeight: 600, marginTop: 6, letterSpacing: "-0.02em" }}
            >
              {s.value}
            </div>
            <div className="muted xs" style={{ marginTop: 4 }}>
              {s.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <div className="row-flex" style={{ marginBottom: 14, gap: 10 }}>
          <Seg
            options={[
              { value: "stock", label: "Stock on hand" },
              { value: "recipes", label: "Recipes & cost" },
              { value: "projection", label: "Sales projection" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="card-spacer" />
          <Btn size="sm" icon="Filter">
            Filter
          </Btn>
        </div>

        {tab === "stock" && (
          <table className="t">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Supplier</th>
                <th style={{ textAlign: "right" }}>Stock</th>
                <th style={{ textAlign: "right" }}>Reorder at</th>
                <th style={{ textAlign: "right" }}>Daily use</th>
                <th style={{ textAlign: "right" }}>Days cover</th>
                <th style={{ textAlign: "right" }}>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((i) => {
                const days = i.stock / i.dailyUse;
                const tone =
                  i.status === "critical" ? "red" : i.status === "low" ? "amber" : "green";
                return (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                    </td>
                    <td className="muted small">{i.supplier}</td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {i.stock} {i.unit}
                    </td>
                    <td className="num small" style={{ textAlign: "right" }}>
                      {i.reorder} {i.unit}
                    </td>
                    <td className="num small" style={{ textAlign: "right" }}>
                      {i.dailyUse} {i.unit}
                    </td>
                    <td
                      className="num"
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color:
                          tone === "red"
                            ? "var(--red)"
                            : tone === "amber"
                              ? "var(--amber)"
                              : "inherit",
                      }}
                    >
                      {days.toFixed(1)}d
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {fmtINR(i.stock * i.cost)}
                    </td>
                    <td>
                      <Pill tone={tone}>
                        {i.status === "critical" ? "Critical" : i.status === "low" ? "Low" : "OK"}
                      </Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {tab === "recipes" && (
          <>
            <div className="muted xs" style={{ marginBottom: 12 }}>
              Per-unit cost (ingredients) and selling price. Upload an Excel to bulk-update.
            </div>
            <table className="t">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Cost to prepare</th>
                  <th style={{ textAlign: "right" }}>Selling price</th>
                  <th style={{ textAlign: "right" }}>Gross margin</th>
                  <th>Margin bar</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.item}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.item}</div>
                    </td>
                    <td className="muted small">{r.category}</td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {fmtINR(r.cost)}
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtINR(r.price)}
                    </td>
                    <td
                      className="num"
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: r.margin >= 75 ? "var(--green)" : "var(--ink)",
                      }}
                    >
                      {r.margin.toFixed(1)}%
                    </td>
                    <td style={{ width: 160 }}>
                      <div className="bar-track" style={{ height: 6 }}>
                        <div
                          className="bar-fill"
                          style={{
                            width: r.margin + "%",
                            background: r.margin >= 75 ? "var(--green)" : "var(--accent)",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === "projection" && (
          <>
            <div className="muted xs" style={{ marginBottom: 12 }}>
              How many units of each item your current raw stock can produce — and the revenue if
              you sold them all.
            </div>
            <table className="t">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: "right" }}>Producible units</th>
                  <th style={{ textAlign: "right" }}>Potential revenue</th>
                  <th style={{ textAlign: "right" }}>Potential profit</th>
                  <th>Bottleneck</th>
                </tr>
              </thead>
              <tbody>
                {itemPotential.map((it) => (
                  <tr key={it.item}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.item}</div>
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtNum(it.possible)}
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtINR(it.revenue)}
                    </td>
                    <td
                      className="num"
                      style={{ textAlign: "right", color: "var(--green)", fontWeight: 600 }}
                    >
                      {fmtINR(it.possible * (it.price - it.cost))}
                    </td>
                    <td className="muted small">
                      {it.item.includes("Naan")
                        ? "Maida"
                        : it.item.includes("Coffee")
                          ? "Cream"
                          : it.item.includes("Chicken")
                            ? "Cream"
                            : it.item.includes("Biryani")
                              ? "Basmati Rice"
                              : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </>
  );
}

window.Inventory = Inventory;
