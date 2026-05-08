// Pure-SVG chart helpers
const { useMemo, useState } = React;

function Sparkline({ values, height = 40, color = "var(--ink)", fill = false }) {
  if (!values?.length) return null;
  const w = 200,
    h = height;
  const max = Math.max(...values),
    min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y];
  });
  const line = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: h, display: "block" }}
    >
      {fill && <path d={area} fill={color} fillOpacity="0.12" />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function BarChart({
  data,
  accessor = "sales",
  color = "var(--ink)",
  height = 220,
  comparison = null,
  dowAccent = true,
  format,
  secondary = null,
}) {
  const w = 800,
    h = height,
    pad = { l: 36, r: secondary ? 42 : 12, t: 16, b: 28 };
  const max = Math.max(
    ...data.map((d) => d[accessor]),
    ...(comparison ? comparison.map((d) => d[accessor]) : [0])
  );
  const bw = (w - pad.l - pad.r) / data.length;
  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {/* y grid */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = pad.t + (i / yTicks) * (h - pad.t - pad.b);
        const v = max - (i / yTicks) * max;
        return (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeDasharray={i === yTicks ? "" : "2 3"}
            />
            <text
              x={pad.l - 6}
              y={y + 3}
              fontSize="9"
              textAnchor="end"
              fill="var(--muted)"
              fontFamily="JetBrains Mono"
            >
              {format ? format(v) : Math.round(v)}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {data.map((d, i) => {
        const x = pad.l + i * bw;
        const v = d[accessor];
        const barH = (v / max) * (h - pad.t - pad.b) || 0;
        const y = h - pad.b - barH;
        const isWeekend = d.dow === 0 || d.dow === 6;
        const cmp = comparison?.[i];
        return (
          <g key={i}>
            {cmp != null && (
              <rect
                x={x + bw * 0.18}
                y={h - pad.b - (cmp[accessor] / max) * (h - pad.t - pad.b)}
                width={bw * 0.64}
                height={(cmp[accessor] / max) * (h - pad.t - pad.b)}
                fill="var(--line-strong)"
                opacity="0.5"
              />
            )}
            <rect
              x={x + bw * 0.18}
              y={y}
              width={bw * 0.64}
              height={barH}
              fill={dowAccent && isWeekend ? "var(--accent)" : color}
              rx="1"
            />
            {/* x label every 5 */}
            {i % 5 === 0 && (
              <text
                x={x + bw / 2}
                y={h - 8}
                fontSize="9"
                textAnchor="middle"
                fill="var(--muted)"
                fontFamily="JetBrains Mono"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      {secondary &&
        (() => {
          const sMax = Math.max(...data.map((d) => d[secondary.accessor])) || 1;
          const sPts = data.map((d, i) => {
            const x = pad.l + i * bw + bw / 2;
            const y = pad.t + (1 - d[secondary.accessor] / sMax) * (h - pad.t - pad.b);
            return [x, y];
          });
          const sLine = sPts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
          return (
            <g>
              {[0, 0.5, 1].map((t, i) => {
                const y = pad.t + t * (h - pad.t - pad.b);
                const v = sMax - t * sMax;
                return (
                  <text
                    key={i}
                    x={w - pad.r + 4}
                    y={y + 3}
                    fontSize="9"
                    fill={secondary.color}
                    fontFamily="JetBrains Mono"
                  >
                    {secondary.format ? secondary.format(v) : Math.round(v)}
                  </text>
                );
              })}
              <path
                d={sLine}
                fill="none"
                stroke={secondary.color}
                strokeWidth="2"
                strokeLinecap="round"
              />
              {sPts
                .filter((_, i) => i % 5 === 0)
                .map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r="2.5" fill={secondary.color} />
                ))}
            </g>
          );
        })()}
    </svg>
  );
}

function LineArea({
  data,
  accessor = "sales",
  height = 200,
  color = "var(--ink)",
  showFill = true,
  comparison = null,
  format,
  secondary = null,
}) {
  // secondary: { accessor, color, format, label } — drawn on a right-axis 0..max
  const w = 800,
    h = height,
    pad = { l: 36, r: secondary ? 42 : 12, t: 16, b: 24 };
  const allValues = comparison
    ? [...data.map((d) => d[accessor]), ...comparison.map((d) => d[accessor])]
    : data.map((d) => d[accessor]);
  const max = Math.max(...allValues);
  const min = 0;
  const span = max - min || 1;
  const points = data.map((d, i) => {
    const x = pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
    const y = pad.t + (1 - (d[accessor] - min) / span) * (h - pad.t - pad.b);
    return [x, y];
  });
  const cmpPoints = comparison
    ? comparison.map((d, i) => {
        const x = pad.l + (i / (comparison.length - 1)) * (w - pad.l - pad.r);
        const y = pad.t + (1 - (d[accessor] - min) / span) * (h - pad.t - pad.b);
        return [x, y];
      })
    : null;
  const line = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${line} L${points[points.length - 1][0]},${h - pad.b} L${pad.l},${h - pad.b} Z`;
  const cmpLine = cmpPoints?.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.t + t * (h - pad.t - pad.b);
        const v = max - t * max;
        return (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeDasharray={t === 1 ? "" : "2 3"}
            />
            <text
              x={pad.l - 6}
              y={y + 3}
              fontSize="9"
              textAnchor="end"
              fill="var(--muted)"
              fontFamily="JetBrains Mono"
            >
              {format ? format(v) : Math.round(v)}
            </text>
          </g>
        );
      })}
      {cmpLine && (
        <path
          d={cmpLine}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}
      {showFill && <path d={area} fill={color} fillOpacity="0.08" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
      {secondary &&
        (() => {
          const sMax = Math.max(...data.map((d) => d[secondary.accessor])) || 1;
          const sPts = data.map((d, i) => {
            const x = pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
            const y = pad.t + (1 - d[secondary.accessor] / sMax) * (h - pad.t - pad.b);
            return [x, y];
          });
          const sLine = sPts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
          return (
            <g>
              {[0, 0.5, 1].map((t, i) => {
                const y = pad.t + t * (h - pad.t - pad.b);
                const v = sMax - t * sMax;
                return (
                  <text
                    key={i}
                    x={w - pad.r + 4}
                    y={y + 3}
                    fontSize="9"
                    fill={secondary.color}
                    fontFamily="JetBrains Mono"
                  >
                    {secondary.format ? secondary.format(v) : Math.round(v)}
                  </text>
                );
              })}
              <path
                d={sLine}
                fill="none"
                stroke={secondary.color}
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
            </g>
          );
        })()}
      {points
        .filter((_, i) => i % 5 === 0 || i === points.length - 1)
        .map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        ))}
      {data
        .filter((_, i) => i % 5 === 0)
        .map((d, i) => {
          const x = pad.l + ((i * 5) / (data.length - 1)) * (w - pad.l - pad.r);
          return (
            <text
              key={i}
              x={x}
              y={h - 6}
              fontSize="9"
              textAnchor="middle"
              fill="var(--muted)"
              fontFamily="JetBrains Mono"
            >
              {d.label}
            </text>
          );
        })}
    </svg>
  );
}

function StackedBars({ data, keys, colors, height = 200, format }) {
  const w = 800,
    h = height,
    pad = { l: 36, r: 12, t: 16, b: 24 };
  const max = Math.max(...data.map((d) => keys.reduce((s, k) => s + d[k], 0)));
  const bw = (w - pad.l - pad.r) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.t + t * (h - pad.t - pad.b);
        const v = max - t * max;
        return (
          <g key={i}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeDasharray={t === 1 ? "" : "2 3"}
            />
            <text
              x={pad.l - 6}
              y={y + 3}
              fontSize="9"
              textAnchor="end"
              fill="var(--muted)"
              fontFamily="JetBrains Mono"
            >
              {format ? format(v) : Math.round(v)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = pad.l + i * bw;
        let yCursor = h - pad.b;
        return (
          <g key={i}>
            {keys.map((k, ki) => {
              const v = d[k];
              const segH = (v / max) * (h - pad.t - pad.b);
              yCursor -= segH;
              return (
                <rect
                  key={k}
                  x={x + bw * 0.18}
                  y={yCursor}
                  width={bw * 0.64}
                  height={segH}
                  fill={colors[ki]}
                />
              );
            })}
            {i % 5 === 0 && (
              <text
                x={x + bw / 2}
                y={h - 6}
                fontSize="9"
                textAnchor="middle"
                fill="var(--muted)"
                fontFamily="JetBrains Mono"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ segments, size = 140, label, sub }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let cursor = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--paper-2)"
        strokeWidth="14"
      />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = `${len} ${c - len}`;
        const offset = -cursor;
        cursor += len;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={dash}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2 - 2}
        textAnchor="middle"
        fontSize="20"
        fontWeight="600"
        fill="var(--ink)"
      >
        {label}
      </text>
      {sub && (
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          fontSize="9"
          fill="var(--muted)"
          fontFamily="JetBrains Mono"
          letterSpacing="0.1em"
        >
          {sub}
        </text>
      )}
    </svg>
  );
}

function Heatmap({ data, getValue, getLabel, rows = 7, height = 130 }) {
  // data: array of items with .dow and .label, .week
  const w = 800,
    h = height,
    pad = { l: 28, r: 8, t: 8, b: 8 };
  const cols = Math.ceil(data.length / rows);
  const cellW = (w - pad.l - pad.r) / cols;
  const cellH = (h - pad.t - pad.b) / rows;
  const max = Math.max(...data.map(getValue));
  const dows = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {dows.map((d, i) => (
        <text
          key={i}
          x={pad.l - 8}
          y={pad.t + i * cellH + cellH / 2 + 3}
          fontSize="9"
          textAnchor="end"
          fill="var(--muted)"
          fontFamily="JetBrains Mono"
        >
          {d}
        </text>
      ))}
      {data.map((d, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const v = getValue(d);
        const intensity = v / max;
        return (
          <rect
            key={i}
            x={pad.l + col * cellW + 1}
            y={pad.t + row * cellH + 1}
            width={cellW - 2}
            height={cellH - 2}
            rx="2"
            fill="var(--ink)"
            fillOpacity={0.08 + intensity * 0.85}
          />
        );
      })}
    </svg>
  );
}

window.Charts = { Sparkline, BarChart, LineArea, StackedBars, Donut, Heatmap };
