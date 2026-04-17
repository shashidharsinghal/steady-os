# @stride-os/db

Supabase-generated TypeScript types for the Stride OS database schema.

## Regenerating types

After running migrations against a Supabase project (local or remote), regenerate with:

```bash
# Against local Supabase (after supabase start)
pnpm supabase gen types typescript --local > packages/db/index.ts

# Against a remote project
pnpm supabase gen types typescript --project-id <project-ref> > packages/db/index.ts
```

Then commit the updated `index.ts`. Do **not** hand-edit the generated types — they will be overwritten.
