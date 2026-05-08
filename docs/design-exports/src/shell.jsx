const { useState, useEffect } = React;

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "Dashboard" },
  { id: "ingest", label: "Ingest", icon: "Upload", badge: "12" },
  { id: "inventory", label: "Inventory", icon: "Box", badge: "3" },
  { id: "expenses", label: "Expenses", icon: "Wallet" },
  { id: "customers", label: "Customers", icon: "Users" },
  { id: "outlets", label: "Outlets", icon: "Store" },
  { id: "employees", label: "Employees", icon: "Team" },
  { id: "pnl", label: "P&L", icon: "Trending" },
  { id: "admin", label: "Admin", icon: "Settings" },
  { id: "canvas", label: "All modules", icon: "Layout" },
];

function Sidebar({ activeId, onNav, sidebarMode, theme, onThemeToggle }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <svg
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 13l3-7 3 4 3-3 3 6" />
            <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="name">SteadyStrideOS</div>
          <div className="sub">Restaurant ops</div>
        </div>
      </div>

      <div className="sidebar-section" style={{ flex: 1, overflowY: "auto" }}>
        <div className="sidebar-label">Workspace</div>
        {NAV.slice(0, 9).map((n) => {
          const Icon = window.Icons[n.icon];
          return (
            <a
              key={n.id}
              className={"nav-item" + (activeId === n.id ? " active" : "")}
              onClick={() => onNav(n.id)}
            >
              <Icon className="nav-icon" />
              <span className="label">{n.label}</span>
              {n.badge && <span className="dot">{n.badge}</span>}
            </a>
          );
        })}

        <div className="sidebar-label" style={{ marginTop: 16 }}>
          Design review
        </div>
        {NAV.slice(9).map((n) => {
          const Icon = window.Icons[n.icon];
          return (
            <a
              key={n.id}
              className={"nav-item" + (activeId === n.id ? " active" : "")}
              onClick={() => onNav(n.id)}
            >
              <Icon className="nav-icon" />
              <span className="label">{n.label}</span>
            </a>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="avatar">RM</div>
          <div className="user-info">
            <div className="n">Rohan Mehra</div>
            <div className="r">Partner · 6 outlets</div>
          </div>
          <button className="icon-btn" title="Sign out">
            {React.createElement(window.Icons.Logout, { size: 14 })}
          </button>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ title, sub, breadcrumbs = [], children }) {
  return (
    <div className="topbar">
      {breadcrumbs.length > 0 ? (
        <div className="crumb">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: "var(--line-strong)" }}>/</span>}
              <span className={i === breadcrumbs.length - 1 ? "here" : ""}>{b}</span>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="crumb">
          <span className="here">{title}</span>
        </div>
      )}
      <div className="topbar-spacer" />
      <div className="search">
        {React.createElement(window.Icons.Search, { size: 14 })}
        <span style={{ flex: 1 }}>Search outlets, customers, runs…</span>
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" title="Notifications" style={{ position: "relative" }}>
        {React.createElement(window.Icons.Bell, { size: 16 })}
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            background: "var(--accent)",
            borderRadius: 999,
          }}
        />
      </button>
      {children}
    </div>
  );
}

function PageHead({ eyebrow, title, sub, actions, kicker }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
        {kicker}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

function Pill({ tone = "default", children }) {
  return <span className={"pill" + (tone !== "default" ? " " + tone : "")}>{children}</span>;
}

function Btn({ children, kind = "default", size, icon, onClick, style }) {
  const Icon = icon ? window.Icons[icon] : null;
  return (
    <button
      className={"btn " + (kind !== "default" ? kind : "") + (size === "sm" ? " sm" : "")}
      onClick={onClick}
      style={style}
    >
      {Icon && <Icon size={size === "sm" ? 12 : 14} />}
      {children}
    </button>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? "on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, action, children, span, style, className = "" }) {
  return (
    <div
      className={"card " + className}
      style={{ ...(span ? { gridColumn: `span ${span}` } : {}), ...style }}
    >
      {(title || action) && (
        <div className="card-head">
          {title && <div className="card-title">{title}</div>}
          <div className="card-spacer" />
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, sub, delta, deltaDir, big }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className={"stat-num" + (big ? " lg" : "")} style={{ marginTop: 6 }}>
        {value}
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
        {delta && (
          <span className={"delta " + (deltaDir || "up")}>
            {deltaDir === "down" ? "▾" : "▴"} {delta}
          </span>
        )}
        {sub && <span className="muted small">{sub}</span>}
      </div>
    </div>
  );
}

window.Shell = { Sidebar, TopBar, PageHead, Pill, Btn, Seg, Card, Stat };
