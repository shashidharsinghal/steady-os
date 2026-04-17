# Stride OS

Operations platform for the Steady Strides franchise portfolio. Built for two outlets today (Gabru Di Chaap Sector 84, Wafflesome) and designed to scale across a multi-brand portfolio. See [CLAUDE.md](CLAUDE.md) for full architecture context.

## Prerequisites

- **Node 22** (`nvm use` or check `.nvmrc`)
- **pnpm 10** (`npm i -g pnpm`)
- **Docker Desktop** — required for local Supabase

## Local setup

```bash
# 1. Clone and install
git clone <repo-url> stride-os && cd stride-os
pnpm install

# 2. Environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Supabase project URL and anon key

# 3. Start local Supabase (Docker required)
pnpm supabase start
# This runs migrations and seed automatically

# 4. Start dev server
pnpm dev
# → http://localhost:3000
```

### Build with placeholder env vars (for CI / initial check)

The Next.js build references `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at
compile-time. If you don't have real values yet, stub them so the build completes:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder \
pnpm build
```

## Architecture

```
stride-os/
├── apps/
│   └── web/                  # Next.js 15 (App Router, React 19, TypeScript)
│       ├── app/
│       │   ├── (auth)/       # Unauthenticated routes (login)
│       │   ├── (app)/        # Authenticated shell (dashboard, outlets, ingest)
│       │   └── api/auth/     # Supabase OAuth callback
│       ├── components/       # App-specific components
│       ├── lib/supabase/     # Supabase client/server/middleware helpers
│       └── middleware.ts     # Route guard
│
├── packages/
│   ├── config/
│   │   ├── eslint-config/    # ESLint flat config (Next.js + TS + React)
│   │   ├── tsconfig/         # Shared tsconfig presets
│   │   └── tailwind-config/  # Shared Tailwind preset with CSS variables
│   ├── db/                   # Supabase-generated TypeScript types
│   ├── shared/               # Domain types, INR formatter, date utils, Zod schemas
│   └── ui/                   # shadcn/ui component library (new-york, neutral)
│
├── supabase/
│   ├── config.toml           # Supabase CLI project config
│   ├── migrations/           # SQL migrations (run in order)
│   └── seed.sql              # Local dev seed data
│
└── .github/workflows/ci.yml  # PR checks: lint + typecheck + build
```

## Stack

| Layer     | Tech                                             |
| --------- | ------------------------------------------------ |
| Framework | Next.js 15 (App Router) + React 19               |
| Language  | TypeScript 5 (strict + noUncheckedIndexedAccess) |
| Database  | Supabase (Postgres + Auth + Storage)             |
| Auth      | Supabase Auth — Google OAuth + RLS               |
| Styling   | Tailwind CSS 3 + shadcn/ui (new-york)            |
| Monorepo  | Turborepo + pnpm workspaces                      |
| CI        | GitHub Actions                                   |

## Links

- [CLAUDE.md](CLAUDE.md) — Architecture decisions, coding conventions, module roadmap
- [packages/db/README.md](packages/db/README.md) — Regenerating Supabase types
- [apps/web/.env.example](apps/web/.env.example) — Required env vars
