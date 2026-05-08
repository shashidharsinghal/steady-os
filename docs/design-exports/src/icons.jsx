// Lucide-style icons inlined as React components
const I =
  (path, opts = {}) =>
  (props) => (
    <svg
      width={props.size || 16}
      height={props.size || 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={opts.sw || 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {typeof path === "string" ? <path d={path} /> : path}
    </svg>
  );

const Icons = {
  Dashboard: I(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  Trending: I(
    <>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="14 7 21 7 21 14" />
    </>
  ),
  Users: I(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 18c0-2.2-2-4-4.5-4" />
    </>
  ),
  Store: I(
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v11h16V9" />
      <path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3" />
    </>
  ),
  Team: I(
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </>
  ),
  Upload: I(
    <>
      <path d="M12 15V3" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 21h14" />
    </>
  ),
  Search: I(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  Plus: I(
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  Filter: I(
    <>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </>
  ),
  ArrowRight: I(
    <>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </>
  ),
  ArrowUpRight: I(
    <>
      <path d="M7 17 17 7M9 7h8v8" />
    </>
  ),
  Calendar: I(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  Clock: I(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  Bell: I(
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  Settings: I(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  Logout: I(
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  Chevron: I(
    <>
      <path d="m9 18 6-6-6-6" />
    </>
  ),
  ChevronDown: I(
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  Check: I(
    <>
      <path d="M5 12l5 5L20 7" />
    </>
  ),
  X: I(
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>
  ),
  Refresh: I(
    <>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  Trash: I(
    <>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </>
  ),
  Archive: I(
    <>
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M9 12h6" />
    </>
  ),
  Eye: I(
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  Edit: I(
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  More: I(
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  Mail: I(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  Phone: I(
    <>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.9 9.8a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
    </>
  ),
  Link: I(
    <>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  File: I(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  Pin: I(
    <>
      <path d="M12 17v5" />
      <path d="M9 10.8V3h6v7.8a4 4 0 0 0 1 2.5l1 1.4a1 1 0 0 1-.8 1.6H5.8a1 1 0 0 1-.8-1.6l1-1.4a4 4 0 0 0 1-2.5z" />
    </>
  ),
  Coins: I(
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.1 10.4A6 6 0 1 1 11.6 19" />
      <path d="M7 6h1v4h1" />
      <path d="M16.7 13.6h1v4" />
    </>
  ),
  Layers: I(
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </>
  ),
  Globe: I(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  Receipt: I(
    <>
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2z" />
      <path d="M8 6h8M8 10h8M8 14h5" />
    </>
  ),
  Spark: I(
    <>
      <path d="M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l3 3M19 19l-3-3M5 19l3-3M19 5l-3 3" />
    </>
  ),
  Sparkles: I(
    <>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" />
      <path d="M19 14v3M19 20v0M16 17h3M22 17h0" />
    </>
  ),
  CheckCircle: I(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  AlertTriangle: I(
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h0" />
    </>
  ),
  Sun: I(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </>
  ),
  Moon: I(
    <>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </>
  ),
  Grid: I(
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  Download: I(
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  Inbox: I(
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-6z" />
    </>
  ),
  Layout: I(
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  Box: I(
    <>
      <path d="m3 7 9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  Wallet: I(
    <>
      <path d="M3 7a2 2 0 0 1 2-2h14v4" />
      <path d="M19 9H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4h-4a2 2 0 0 1 0-4h4V9z" />
    </>
  ),
  Target: I(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
};

window.Icons = Icons;
