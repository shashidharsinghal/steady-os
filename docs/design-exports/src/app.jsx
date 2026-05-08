const { useState, useEffect } = React;

function App() {
  const [tweaks, setTweak] = window.useTweaks(window.__TWEAK_DEFAULTS);

  // Apply tweak attributes to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-card", tweaks.cardStyle);
    document.documentElement.setAttribute("data-density", tweaks.density);
    document.documentElement.setAttribute("data-sidebar", tweaks.sidebar);
    document.documentElement.style.setProperty("--accent", tweaks.accent);
  }, [tweaks]);

  const onNav = (id) => setTweak("module", id);

  const M = tweaks.module;
  const breadcrumb = {
    dashboard: ["Workspace", "Dashboard"],
    ingest: ["Workspace", "Ingest"],
    inventory: ["Workspace", "Inventory"],
    expenses: ["Workspace", "Expenses"],
    customers: ["Workspace", "Customers"],
    outlets: ["Workspace", "Outlets"],
    employees: ["Workspace", "Employees"],
    pnl: ["Workspace", "P&L"],
    admin: ["Settings", "Admin"],
    canvas: ["Design review", "All modules"],
  }[M] || ["Workspace"];

  return (
    <>
      <div className="app">
        <window.Shell.Sidebar activeId={M} onNav={onNav} />
        <div className="main">
          <window.Shell.TopBar breadcrumbs={breadcrumb} />
          <main className="content">
            {M === "dashboard" && <window.Dashboard />}
            {M === "ingest" && <window.Ingest />}
            {M === "inventory" && <window.Inventory />}
            {M === "expenses" && <window.Expenses />}
            {M === "customers" && <window.Customers />}
            {M === "outlets" && <window.Outlets />}
            {M === "employees" && <window.Employees />}
            {M === "pnl" && <window.Pnl />}
            {M === "admin" && <window.Admin />}
            {M === "canvas" && <window.CanvasOverview onNav={onNav} />}
          </main>
        </div>
      </div>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Module">
          <window.TweakSelect
            label="Active screen"
            value={tweaks.module}
            onChange={(v) => setTweak("module", v)}
            options={[
              { value: "dashboard", label: "Dashboard" },
              { value: "ingest", label: "Ingest" },
              { value: "inventory", label: "Inventory" },
              { value: "expenses", label: "Expenses" },
              { value: "customers", label: "Customers" },
              { value: "outlets", label: "Outlets" },
              { value: "employees", label: "Employees" },
              { value: "pnl", label: "P&L" },
              { value: "admin", label: "Admin" },
              { value: "canvas", label: "All modules (canvas)" },
            ]}
          />
        </window.TweakSection>

        <window.TweakSection title="Appearance">
          <window.TweakRadio
            label="Theme"
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <window.TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={["#ff5b3a", "#2a5cd6", "#5b3a9e", "#3a7d4e", "#b8862c"]}
          />
        </window.TweakSection>

        <window.TweakSection title="Layout">
          <window.TweakRadio
            label="Sidebar"
            value={tweaks.sidebar}
            onChange={(v) => setTweak("sidebar", v)}
            options={[
              { value: "full", label: "Full" },
              { value: "rail", label: "Rail" },
            ]}
          />
          <window.TweakSelect
            label="Card style"
            value={tweaks.cardStyle}
            onChange={(v) => setTweak("cardStyle", v)}
            options={[
              { value: "default", label: "Default" },
              { value: "flat", label: "Flat" },
              { value: "bordered", label: "Bordered" },
              { value: "elevated", label: "Elevated" },
            ]}
          />
          <window.TweakSelect
            label="Density"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "cozy", label: "Cozy" },
              { value: "comfy", label: "Comfy" },
            ]}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
