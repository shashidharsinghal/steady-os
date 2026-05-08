const { useState, useMemo } = React;

function Dashboard() {
  const { Card, Stat, Btn, Pill, Seg, PageHead } = window.Shell;
  const { BarChart, LineArea, StackedBars, Donut, Sparkline, Heatmap } = window.Charts;
  const { daily, items, channels, fmtINR, fmtNum, fmtPct } = window.MOCK;

  const [period, setPeriod] = useState("30d");
  const [breakdown, setBreakdown] = useState("all"); // all | weekday | weekend
  const [compare, setCompare] = useState("prev_period");
  const [chartMetric, setChartMetric] = useState("sales");
  const [outletId, setOutletId] = useState("o1");

  const periodData = useMemo(() => {
    if (breakdown === "weekday") return daily.filter((d) => d.dow >= 1 && d.dow <= 5);
    if (breakdown === "weekend") return daily.filter((d) => d.dow === 0 || d.dow === 6);
    return daily;
  }, [breakdown]);

  // Synthetic comparison series — shifted ~5% lower
  const cmpData = useMemo(
    () =>
      periodData.map((d) => ({
        ...d,
        sales: Math.round(d.sales * (0.93 + Math.random() * 0.04)),
        orders: Math.round(d.orders * 0.94),
        aov: Math.round(d.aov * 0.97),
        repeat: Math.round(d.repeat * 0.92),
      })),
    [periodData]
  );

  const totalSales = periodData.reduce((s, d) => s + d.sales, 0);
  const totalCmp = cmpData.reduce((s, d) => s + d.sales, 0);
  const salesDelta = ((totalSales - totalCmp) / totalCmp) * 100;
  const totalOrders = periodData.reduce((s, d) => s + d.orders, 0);
  const cmpOrders = cmpData.reduce((s, d) => s + d.orders, 0);
  const ordersDelta = ((totalOrders - cmpOrders) / cmpOrders) * 100;
  const avgAOV = totalSales / totalOrders;
  const cmpAOV = totalCmp / cmpOrders;
  const aovDelta = ((avgAOV - cmpAOV) / cmpAOV) * 100;
  const totalRepeat = periodData.reduce((s, d) => s + d.repeat, 0);
  const cmpRepeat = cmpData.reduce((s, d) => s + d.repeat, 0);
  const repeatDelta = ((totalRepeat - cmpRepeat) / cmpRepeat) * 100;

  // Profit & investment
  const totalProfit = periodData.reduce((s, d) => s + d.profit, 0);
  const avgProfitPct = periodData.reduce((s, d) => s + d.profitPct, 0) / periodData.length;
  const cmpProfit = cmpData.reduce((s, d) => s + Math.round(d.profit * 0.92), 0);
  const profitDelta = ((totalProfit - cmpProfit) / Math.abs(cmpProfit)) * 100;

  const inv = window.MOCK.investment[outletId] || window.MOCK.investment.o1;
  const recoveredPct = (inv.recovered / inv.invested) * 100;
  const remainingToBE = inv.invested - inv.recovered;
  // Avg monthly profit at this outlet (mock from periodData scaled)
  const monthlyProfit = totalProfit; // 30-day approximation
  const monthsToBE = remainingToBE / monthlyProfit;

  const yesterday = daily[daily.length - 1];
  const yesterdayDOWAvg =
    daily
      .filter((d) => d.dow === yesterday.dow)
      .slice(0, -1)
      .reduce((s, d) => s + d.sales, 0) / 4;
  const yesterdayDelta = ((yesterday.sales - yesterdayDOWAvg) / yesterdayDOWAvg) * 100;

  // Hour-of-day rush (synthetic)
  const hours = Array.from({ length: 14 }, (_, i) => {
    const h = i + 9;
    const lunch = h >= 12 && h <= 14 ? 1 : 0;
    const dinner = h >= 19 && h <= 21 ? 1.4 : 0;
    const evening = h >= 16 && h <= 18 ? 0.5 : 0;
    return {
      hour: h,
      label: (h > 12 ? h - 12 : h) + (h >= 12 ? "p" : "a"),
      value: 0.15 + lunch * 0.6 + dinner * 0.85 + evening * 0.3 + Math.random() * 0.1,
    };
  });

  // DoW averages
  const dowStats = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    const matching = daily.filter((x) => x.dow === d);
    const avg = matching.reduce((s, x) => s + x.sales, 0) / matching.length;
    return { dow: d, label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d], value: avg };
  });

  // Channel sparkline data (random-ish)
  const chPath = (offset) =>
    Array.from(
      { length: 30 },
      (_, i) => 50 + Math.sin((i + offset) * 0.4) * 14 + Math.cos(i * 0.7) * 6 + i * 0.3
    );

  const formatY = (v) => {
    if (chartMetric === "sales" || chartMetric === "profit")
      return "₹" + Math.round(v / 100000) + "L";
    if (chartMetric === "aov") return "₹" + Math.round(v / 100);
    return Math.round(v);
  };

  const overlayProfit = chartMetric === "sales" || chartMetric === "orders";

  return (
    <>
      <PageHead
        eyebrow="MAY 5, 2026 · TUESDAY MORNING"
        title="Good morning, Rohan."
        sub="Here's how Indiranagar Flagship is moving versus its own day-of-week baseline. Three things need a look."
        actions={
          <>
            <select
              className="sel"
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              style={{ width: 220 }}
            >
              {window.MOCK.outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <Btn icon="Download" kind="default">
              Export
            </Btn>
            <Btn icon="Upload" kind="primary">
              Open ingest
            </Btn>
          </>
        }
      />

      {/* Morning check headline */}
      <div
        className="card elev"
        style={{
          marginBottom: 16,
          padding: 0,
          overflow: "hidden",
          background: "var(--ink)",
          color: "var(--paper)",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 0 }}>
          <div style={{ padding: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--accent)",
                  borderRadius: 999,
                  display: "inline-block",
                }}
              />
              Morning check · Yesterday vs typical Monday
            </div>
            <div
              style={{
                fontFamily: "Instrument Serif, serif",
                fontStyle: "italic",
                fontSize: 46,
                lineHeight: 1.05,
                marginTop: 12,
                marginBottom: 8,
              }}
            >
              Yesterday landed{" "}
              <span style={{ color: "var(--accent)" }}>+{yesterdayDelta.toFixed(1)}%</span> above
              your average Monday.
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                lineHeight: 1.5,
                maxWidth: 540,
              }}
            >
              {fmtINR(yesterday.sales)} on {yesterday.orders} orders. Dine-in carried the day;
              Swiggy take-home was thin again. AOV is up because the Hyderabadi Biryani is pulling
              weight.
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                  }}
                >
                  Sales
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }} className="num">
                  {fmtINR(yesterday.sales)}
                </div>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                  +{yesterdayDelta.toFixed(1)}% vs DoW avg
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                  }}
                >
                  Orders
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }} className="num">
                  {yesterday.orders}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  71 dine-in · 78 delivery
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                  }}
                >
                  AOV
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }} className="num">
                  ₹{Math.round(yesterday.aov / 100)}
                </div>
                <div style={{ fontSize: 11, color: "var(--green)" }}>+₹42 vs typical</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 600,
                  }}
                >
                  Repeat
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }} className="num">
                  {Math.round((yesterday.repeat / yesterday.orders) * 100)}%
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                  {yesterday.repeat} returning
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              padding: 28,
              background: "rgba(255,255,255,0.03)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              Three things to look at
            </div>
            {[
              {
                num: "01",
                title: "Maida & cream are critical",
                body: "Stock runs out before Friday dinner. Blocks naan + butter chicken.",
                tone: "red",
              },
              {
                num: "02",
                title: "Cold Coffee orders down 7.8%",
                body: "Three days of decline. Possibly tied to competitor opening.",
                tone: "red",
              },
              {
                num: "03",
                title: "Two payment runs need review",
                body: "Zomato week-18 file flagged duplicate row IDs.",
                tone: "amber",
              },
            ].map((a) => (
              <div
                key={a.num}
                style={{
                  display: "flex",
                  gap: 14,
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.1em",
                    paddingTop: 2,
                  }}
                >
                  {a.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.45 }}>
                    {a.body}
                  </div>
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", paddingTop: 4 }}>
                  {React.createElement(window.Icons.ArrowRight, { size: 14 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top stat strip */}
      <div className="row cols-5" style={{ marginBottom: 16 }}>
        {[
          {
            label:
              period === "30d"
                ? "Sales · 30 days"
                : period === "7d"
                  ? "Sales · 7 days"
                  : period === "90d"
                    ? "Sales · 90 days"
                    : "Sales · YTD",
            value: fmtINR(totalSales),
            delta: fmtPct(salesDelta, true),
            dir: salesDelta > 0 ? "up" : "down",
            spark: periodData.map((d) => d.sales),
          },
          {
            label: "Net profit",
            value: fmtINR(totalProfit),
            delta: fmtPct(profitDelta, true),
            dir: profitDelta > 0 ? "up" : "down",
            spark: periodData.map((d) => d.profit),
          },
          {
            label: "Profit margin · daily",
            value: avgProfitPct.toFixed(1) + "%",
            delta: "+1.8pp",
            dir: "up",
            spark: periodData.map((d) => d.profitPct),
          },
          {
            label: "Orders",
            value: fmtNum(totalOrders),
            delta: fmtPct(ordersDelta, true),
            dir: ordersDelta > 0 ? "up" : "down",
            spark: periodData.map((d) => d.orders),
          },
          {
            label: "Avg order value",
            value: "₹" + Math.round(avgAOV / 100),
            delta: fmtPct(aovDelta, true),
            dir: aovDelta > 0 ? "up" : "down",
            spark: periodData.map((d) => d.aov),
          },
        ].map((s) => (
          <div key={s.label} className="card" style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              className="stat-label"
              style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {s.label}
            </div>
            <div
              className="row-flex"
              style={{ marginTop: 6, alignItems: "baseline", gap: 8, flexWrap: "wrap" }}
            >
              <div className="stat-num" style={{ fontSize: 26 }}>
                {s.value}
              </div>
              <div className={"delta " + s.dir}>
                {s.dir === "up" ? "▴" : "▾"} {s.delta}
              </div>
            </div>
            <div className="muted xs" style={{ marginTop: 4 }}>
              vs prior 30-day window
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline
                values={s.spark}
                color={s.dir === "up" ? "var(--green)" : "var(--red)"}
                fill
                height={36}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Investment recovery tracker */}
      <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden" }} className="elev">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr" }}>
          <div style={{ padding: 24, borderRight: "1px solid var(--line)" }}>
            <div className="row-flex">
              <span className="page-eyebrow" style={{ margin: 0 }}>
                INVESTMENT RECOVERY
              </span>
              <div className="card-spacer" />
              <Pill tone="blue">Opened {inv.openedOn}</Pill>
            </div>
            <div
              style={{
                fontFamily: "Instrument Serif, serif",
                fontStyle: "italic",
                fontSize: 32,
                lineHeight: 1.1,
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              {recoveredPct.toFixed(1)}% recovered.{" "}
              <span style={{ color: "var(--accent)" }}>{Math.ceil(monthsToBE)} months</span> to
              break even at this pace.
            </div>
            <div className="muted small" style={{ marginBottom: 18 }}>
              {fmtINR(inv.invested)} invested · {fmtINR(inv.recovered)} recovered ·{" "}
              {fmtINR(remainingToBE)} to go.
            </div>
            {/* Progress bar with milestones */}
            <div style={{ position: "relative", height: 36 }}>
              <div className="bar-track" style={{ height: 14, borderRadius: 999 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: recoveredPct + "%",
                    background: "linear-gradient(90deg, var(--ink) 0%, var(--accent) 100%)",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "0%",
                  top: 18,
                  fontSize: 10,
                  color: "var(--muted)",
                }}
                className="mono"
              >
                ₹0
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 18,
                  fontSize: 10,
                  color: "var(--muted)",
                  transform: "translateX(-50%)",
                }}
                className="mono"
              >
                {fmtINR(inv.invested / 2)}
              </div>
              <div
                style={{
                  position: "absolute",
                  right: "0%",
                  top: 18,
                  fontSize: 10,
                  color: "var(--muted)",
                }}
                className="mono"
              >
                {fmtINR(inv.invested)}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: recoveredPct + "%",
                  top: -4,
                  transform: "translateX(-50%)",
                }}
              >
                <div style={{ width: 2, height: 22, background: "var(--accent)" }} />
              </div>
            </div>
            <div className="row-flex" style={{ marginTop: 28, gap: 24 }}>
              <div>
                <div className="muted xs">Last 30d profit</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 18 }}>
                  {fmtINR(totalProfit)}
                </div>
              </div>
              <div className="vdivider" style={{ height: 32 }} />
              <div>
                <div className="muted xs">Projected break-even</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{inv.projectedBreakeven}</div>
              </div>
              <div className="vdivider" style={{ height: 32 }} />
              <div>
                <div className="muted xs">Pace vs plan</div>
                <div
                  className="num"
                  style={{ fontWeight: 700, fontSize: 18, color: "var(--green)" }}
                >
                  +2.4mo ahead
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: 24, background: "var(--paper-2)" }}>
            <div className="row-flex" style={{ marginBottom: 14 }}>
              <div className="card-title">Monthly recovery</div>
              <div className="card-spacer" />
              <div className="muted xs mono">Last 12 months</div>
            </div>
            {(() => {
              // Synthesize monthly recovery — last 12 months, mostly positive, one dip
              const monthLabels = [
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
              ];
              const seed = [2.1, 2.4, 2.8, 2.6, 3.1, 3.4, 3.0, -0.4, 2.2, 3.6, 4.1, 4.3]; // in lakhs
              const max = Math.max(...seed);
              const min = Math.min(...seed);
              const range = max - Math.min(0, min);
              const cumulative = seed.reduce((acc, v, i) => {
                acc.push((acc[i - 1] || 0) + v);
                return acc;
              }, []);
              const cumMax = cumulative[cumulative.length - 1];
              return (
                <div>
                  <svg
                    viewBox="0 0 320 130"
                    style={{ width: "100%", height: 130, display: "block" }}
                  >
                    <line x1="0" x2="320" y1="100" y2="100" stroke="var(--line-strong)" />
                    {seed.map((v, i) => {
                      const x = 12 + i * (296 / 12);
                      const bw = 296 / 12 - 4;
                      const isNeg = v < 0;
                      const barH = (Math.abs(v) / range) * 80;
                      const y = isNeg ? 100 : 100 - barH;
                      return (
                        <g key={i}>
                          <rect
                            x={x}
                            y={y}
                            width={bw}
                            height={barH}
                            fill={isNeg ? "var(--red)" : "var(--ink)"}
                            rx="2"
                          />
                          <text
                            x={x + bw / 2}
                            y={120}
                            fontSize="9"
                            textAnchor="middle"
                            fill="var(--muted)"
                            fontFamily="JetBrains Mono"
                          >
                            {monthLabels[i]}
                          </text>
                        </g>
                      );
                    })}
                    {/* Cumulative line */}
                    <polyline
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      points={cumulative
                        .map((v, i) => {
                          const x = 12 + i * (296 / 12) + (296 / 12 - 4) / 2;
                          const y = 100 - (v / cumMax) * 80;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                    {cumulative.map((v, i) => {
                      const x = 12 + i * (296 / 12) + (296 / 12 - 4) / 2;
                      const y = 100 - (v / cumMax) * 80;
                      return <circle key={i} cx={x} cy={y} r="2" fill="var(--accent)" />;
                    })}
                  </svg>
                  <div
                    className="row-flex"
                    style={{ marginTop: 8, gap: 14, fontSize: 11, color: "var(--muted)" }}
                  >
                    <div className="row-flex" style={{ gap: 6 }}>
                      <span
                        style={{ width: 10, height: 10, background: "var(--ink)", borderRadius: 2 }}
                      />{" "}
                      Monthly profit
                    </div>
                    <div className="row-flex" style={{ gap: 6 }}>
                      <span style={{ width: 12, height: 2, background: "var(--accent)" }} />{" "}
                      Cumulative
                    </div>
                  </div>
                  <div
                    className="row-flex"
                    style={{
                      marginTop: 16,
                      paddingTop: 14,
                      borderTop: "1px solid var(--line)",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div className="muted xs">Best month</div>
                      <div style={{ fontWeight: 700 }}>May · ₹4.3L</div>
                    </div>
                    <div className="vdivider" style={{ height: 28 }} />
                    <div>
                      <div className="muted xs">Avg / month</div>
                      <div style={{ fontWeight: 700 }} className="num">
                        ₹{(seed.reduce((s, v) => s + v, 0) / seed.length).toFixed(1)}L
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* Big chart with full controls */}
      <Card style={{ marginBottom: 16 }}>
        <div className="row-flex" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="card-title">Trend</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
              {chartMetric === "sales"
                ? "Sales over time"
                : chartMetric === "profit"
                  ? "Profit over time"
                  : chartMetric === "orders"
                    ? "Orders"
                    : chartMetric === "aov"
                      ? "Average order value"
                      : "Repeat customers"}
            </div>
          </div>
          <div className="card-spacer" />
          <Seg
            options={[
              { value: "sales", label: "Sales" },
              { value: "profit", label: "Profit" },
              { value: "orders", label: "Orders" },
              { value: "aov", label: "AOV" },
              { value: "repeat", label: "Repeat" },
            ]}
            value={chartMetric}
            onChange={setChartMetric}
          />
          <div className="vdivider" />
          <Seg
            options={[
              { value: "all", label: "All days" },
              { value: "weekday", label: "Weekdays" },
              { value: "weekend", label: "Weekends" },
            ]}
            value={breakdown}
            onChange={setBreakdown}
          />
          <div className="vdivider" />
          <Seg
            options={[
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
              { value: "90d", label: "90d" },
              { value: "ytd", label: "YTD" },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <div
          className="row-flex"
          style={{ marginBottom: 12, gap: 16, fontSize: 12, color: "var(--muted)" }}
        >
          <div className="row-flex" style={{ gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 3,
                background: "var(--ink)",
                borderRadius: 2,
                display: "inline-block",
              }}
            />
            This period
          </div>
          <div className="row-flex" style={{ gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: "2px dashed var(--muted)",
                display: "inline-block",
              }}
            />
            Previous period (compare)
          </div>
          <div className="row-flex" style={{ gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: "2px dashed var(--accent)",
                display: "inline-block",
              }}
            />
            Profit % (right axis)
          </div>
          <div className="row-flex" style={{ gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                background: "var(--accent)",
                borderRadius: 2,
                display: "inline-block",
              }}
            />
            Weekend
          </div>
          <div className="card-spacer" />
          <Seg
            options={[
              { value: "prev_period", label: "Prev period" },
              { value: "prev_year", label: "Prev year" },
              { value: "none", label: "Off" },
            ]}
            value={compare}
            onChange={setCompare}
          />
        </div>
        {chartMetric === "sales" || chartMetric === "aov" || chartMetric === "profit" ? (
          <BarChart
            data={periodData}
            comparison={compare !== "none" ? cmpData : null}
            accessor={chartMetric}
            color={chartMetric === "profit" ? "var(--green)" : "var(--ink)"}
            height={260}
            format={formatY}
            secondary={
              overlayProfit
                ? {
                    accessor: "profitPct",
                    color: "var(--accent)",
                    label: "Profit %",
                    format: (v) => v.toFixed(0) + "%",
                  }
                : null
            }
          />
        ) : (
          <LineArea
            data={periodData}
            comparison={compare !== "none" ? cmpData : null}
            accessor={chartMetric}
            color="var(--ink)"
            height={260}
            format={formatY}
            secondary={
              overlayProfit
                ? {
                    accessor: "profitPct",
                    color: "var(--accent)",
                    label: "Profit %",
                    format: (v) => v.toFixed(0) + "%",
                  }
                : null
            }
          />
        )}
      </Card>

      {/* Day of week patterns + Hourly rush */}
      <div className="row cols-12" style={{ marginBottom: 16 }}>
        <Card span={5} title="Day-of-week pattern">
          <div className="muted xs" style={{ marginBottom: 12 }}>
            Average sales per weekday across the last 30 days
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              alignItems: "end",
              height: 160,
            }}
          >
            {dowStats.map((d) => {
              const max = Math.max(...dowStats.map((x) => x.value));
              const isMax = d.value === max;
              return (
                <div
                  key={d.dow}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    className="num"
                    style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2 }}
                  >
                    ₹{Math.round(d.value / 100000)}L
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: (d.value / max) * 100 + "%",
                      background: isMax
                        ? "var(--accent)"
                        : d.dow === 0 || d.dow === 6
                          ? "var(--ink-2)"
                          : "var(--ink)",
                      borderRadius: 3,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                    }}
                  >
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="banner" style={{ marginTop: 16 }}>
            {React.createElement(window.Icons.Sparkles, {
              size: 14,
              style: { color: "var(--accent)" },
            })}
            <div className="small">
              <b>Saturdays</b> are your strongest day, averaging <b>+47%</b> over Mondays. Stack
              pre-orders here.
            </div>
          </div>
        </Card>

        <Card span={7} title="Hourly rush — yesterday vs typical">
          <div className="muted xs" style={{ marginBottom: 12 }}>
            Order density by hour. Red dots mark unusually quiet hours.
          </div>
          <div style={{ position: "relative" }}>
            <svg viewBox="0 0 600 180" style={{ width: "100%", height: 180, display: "block" }}>
              {hours.map((h, i) => {
                const x = 30 + (i / (hours.length - 1)) * 540;
                const yBase = 150 - h.value * 110;
                const cmpY = 150 - h.value * 0.85 * 110;
                return (
                  <g key={i}>
                    <line x1={x} x2={x} y1={150} y2={yBase} stroke="var(--line)" strokeWidth="1" />
                    {/* baseline (typical) */}
                    <line
                      x1={x - 6}
                      x2={x + 6}
                      y1={cmpY}
                      y2={cmpY}
                      stroke="var(--muted)"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle cx={x} cy={yBase} r="5" fill={i === 4 ? "var(--red)" : "var(--ink)"} />
                    <text
                      x={x}
                      y={170}
                      fontSize="9"
                      textAnchor="middle"
                      fill="var(--muted)"
                      fontFamily="JetBrains Mono"
                    >
                      {h.label}
                    </text>
                  </g>
                );
              })}
              <line x1={30} x2={570} y1={150} y2={150} stroke="var(--line-strong)" />
            </svg>
            <div
              style={{
                position: "absolute",
                top: 28,
                right: 8,
                fontSize: 10,
                color: "var(--muted)",
              }}
              className="mono"
            >
              Peak: 8p · 47 orders/hr
            </div>
          </div>
          <div
            className="row-flex"
            style={{ marginTop: 12, gap: 16, fontSize: 11, color: "var(--muted)" }}
          >
            <div className="row-flex" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "var(--ink)", borderRadius: 999 }} />
              Yesterday
            </div>
            <div className="row-flex" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 0, borderTop: "1.5px dashed var(--muted)" }} />
              Typical Mon
            </div>
            <div className="row-flex" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "var(--red)", borderRadius: 999 }} />
              Below baseline
            </div>
          </div>
        </Card>
      </div>

      {/* Channel breakdown */}
      <div className="row cols-12" style={{ marginBottom: 16 }}>
        <Card span={5} title="Channel mix · take-home">
          <div className="row-flex" style={{ alignItems: "center", gap: 24 }}>
            <Donut
              size={180}
              segments={channels.map((c) => ({ value: c.sales, color: c.color }))}
              label={fmtINR(totalSales)}
              sub="LAST 30 DAYS"
            />
            <div style={{ flex: 1 }}>
              {channels.map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      background: c.color,
                      borderRadius: 2,
                      marginRight: 10,
                    }}
                  />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>
                    {c.sales}%
                  </div>
                  <div
                    className="num"
                    style={{
                      fontSize: 11,
                      color:
                        c.take >= 95
                          ? "var(--green)"
                          : c.take >= 80
                            ? "var(--amber)"
                            : "var(--red)",
                      marginLeft: 12,
                      fontWeight: 600,
                    }}
                  >
                    {c.take}% net
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card span={7} title="Channel trend">
          <StackedBars
            data={daily}
            keys={["sales"]}
            colors={["var(--ink)"]}
            height={200}
            format={(v) => "₹" + Math.round(v / 100000) + "L"}
          />
          <div className="row cols-4" style={{ marginTop: 12, gap: 12 }}>
            {channels.map((c, i) => (
              <div key={c.name} className="mini-card">
                <div
                  className="row-flex"
                  style={{ justifyContent: "space-between", marginBottom: 4 }}
                >
                  <span className="xs" style={{ fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span style={{ width: 6, height: 6, background: c.color, borderRadius: 999 }} />
                </div>
                <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>
                  {c.sales}%
                </div>
                <div style={{ marginTop: 4 }}>
                  <Sparkline values={chPath(i * 3)} color={c.color} height={20} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Items + Customers */}
      <div className="row cols-12" style={{ marginBottom: 16 }}>
        <Card
          span={7}
          title="Sales by item · top 8"
          action={
            <Btn size="sm" icon="ArrowRight">
              All items
            </Btn>
          }
        >
          <table className="t">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: "right" }}>Units</th>
                <th style={{ textAlign: "right" }}>Revenue</th>
                <th style={{ textAlign: "right" }}>Profit</th>
                <th style={{ textAlign: "right" }}>vs prev</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const recipe = window.MOCK.recipes?.find((r) => r.item === it.name);
                const marginPct = recipe ? recipe.margin : 65 + (it.change > 0 ? 5 : -3);
                const profitAmt = Math.round(it.revenue * (marginPct / 100));
                return (
                  <tr key={it.name}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{it.name}</div>
                      <div className="muted xs">{it.category}</div>
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {it.units}
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtINR(it.revenue)}
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, color: "var(--green)" }}>
                        {fmtINR(profitAmt)}
                      </div>
                      <div className="muted xs">{marginPct.toFixed(1)}% margin</div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={"delta " + (it.change >= 0 ? "up" : "down")}>
                        {it.change >= 0 ? "▴" : "▾"} {Math.abs(it.change).toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ width: 90 }}>
                      <Sparkline
                        values={Array.from(
                          { length: 12 },
                          (_, i) => 50 + Math.sin(i * (it.change / 50)) * 12 + i * (it.change / 30)
                        )}
                        color={it.change >= 0 ? "var(--green)" : "var(--red)"}
                        height={24}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card span={5} title="Customer movement">
          <div className="row cols-2" style={{ gap: 12 }}>
            {[
              {
                label: "New customers",
                value: "184",
                delta: "+22%",
                dir: "up",
                color: "var(--blue)",
              },
              { label: "Returning", value: "612", delta: "+8%", dir: "up", color: "var(--green)" },
              {
                label: "Lapsed regulars",
                value: "47",
                delta: "+12",
                dir: "down",
                color: "var(--red)",
                suffix: "this week",
              },
              {
                label: "Champions",
                value: "298",
                delta: "stable",
                dir: "up",
                color: "var(--accent)",
              },
            ].map((t) => (
              <div key={t.label} className="mini-card" style={{ padding: 14 }}>
                <div className="row-flex">
                  <span style={{ width: 6, height: 6, background: t.color, borderRadius: 999 }} />
                  <span
                    className="xs"
                    style={{
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {t.label}
                  </span>
                </div>
                <div
                  className="num"
                  style={{ fontSize: 24, fontWeight: 600, marginTop: 8, letterSpacing: "-0.02em" }}
                >
                  {t.value}
                </div>
                <div className={"delta " + t.dir} style={{ fontSize: 11 }}>
                  {t.delta}
                </div>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="card-title" style={{ marginBottom: 8 }}>
            30-day repeat heatmap
          </div>
          <Heatmap data={daily} getValue={(d) => d.repeat} height={120} />
          <div className="muted xs" style={{ marginTop: 8 }}>
            Darker cells = more returning customers. Saturday evenings dominate.
          </div>
        </Card>
      </div>

      {/* Discount + payment */}
      <div className="row cols-12" style={{ marginBottom: 16 }}>
        <Card span={6} title="Discount performance">
          <div className="row-flex" style={{ marginBottom: 16 }}>
            <Stat
              label="Discount cost"
              value="₹3.4L"
              sub="3.8% of gross"
              delta="+0.4pp"
              deltaDir="down"
            />
            <div className="card-spacer" />
            <Stat label="Incremental orders" value="+412" delta="+8.6%" deltaDir="up" />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { name: "Flat ₹100 off · Swiggy", uses: 184, cost: 1840000, lift: 18, on: true },
              { name: "20% off above ₹500", uses: 142, cost: 1120000, lift: 12, on: true },
              { name: "Buy 1 Get 1 · Drinks", uses: 98, cost: 480000, lift: -4, on: true },
              { name: "First order · Zomato", uses: 67, cost: 320000, lift: 22, on: false },
            ].map((d) => (
              <div
                key={d.name}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "var(--paper-2)",
                }}
              >
                <div className="row-flex">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                    <div className="muted xs">
                      {d.uses} uses · {fmtINR(d.cost)} cost
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      className={"delta " + (d.lift >= 0 ? "up" : "down")}
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {d.lift >= 0 ? "+" : ""}
                      {d.lift}%
                    </div>
                    <div className="muted xs">order lift</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card span={6} title="Payment methods · yesterday">
          <div className="row-flex" style={{ alignItems: "center", gap: 24 }}>
            <Donut
              size={150}
              segments={[
                { value: 42, color: "var(--ink)" },
                { value: 31, color: "var(--blue)" },
                { value: 16, color: "var(--accent)" },
                { value: 11, color: "var(--violet)" },
              ]}
              label="₹1.4L"
              sub="GROSS"
            />
            <div style={{ flex: 1 }}>
              {[
                { name: "UPI", val: 42, abs: "₹58,800", color: "var(--ink)" },
                { name: "Card", val: 31, abs: "₹43,400", color: "var(--blue)" },
                { name: "Cash", val: 16, abs: "₹22,400", color: "var(--accent)" },
                { name: "Wallet", val: 11, abs: "₹15,400", color: "var(--violet)" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="row-flex"
                  style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}
                >
                  <span style={{ width: 8, height: 8, background: p.color, borderRadius: 2 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                  <span className="num small" style={{ fontWeight: 600 }}>
                    {p.val}%
                  </span>
                  <span
                    className="muted num xs"
                    style={{ marginLeft: 12, width: 60, textAlign: "right" }}
                  >
                    {p.abs}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="banner ok" style={{ marginTop: 16 }}>
            {React.createElement(window.Icons.CheckCircle, { size: 14 })}
            <div className="small">
              UPI share is up <b>3.2pp</b> month-over-month. Card terminals reconciled cleanly.
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

window.Dashboard = Dashboard;
