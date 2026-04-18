# Feature: Outlet Photos

Outlets should feel like real places, not database rows. Each outlet can have
up to 5 photos — storefront, interior, signage, team shot, etc. These appear
prominently on the outlet detail page and as a thumbnail on the outlet list.

---

## What Users Can Do

**Partners can:**

- Upload up to 5 photos per outlet (JPEG, PNG, WebP; max 5 MB each)
- Reorder photos by drag-and-drop
- Set one photo as the "cover" (shown on the outlet list)
- Delete a photo

**Managers (future, once login ships):**

- View photos at their outlets
- Cannot upload / delete

---

## Data Model

### `outlet_photos` table

| Field        | Type                 | Notes                                                                             |
| ------------ | -------------------- | --------------------------------------------------------------------------------- |
| id           | uuid PK              |                                                                                   |
| outlet_id    | uuid FK → outlets.id | Required; cascade on outlet archive (photos stay but become inaccessible via RLS) |
| storage_path | text                 | Required; Supabase Storage path                                                   |
| caption      | text                 | Optional                                                                          |
| is_cover     | boolean              | Default false; only one per outlet can be true (enforced by partial unique index) |
| sort_order   | integer              | 0-indexed                                                                         |
| uploaded_by  | uuid FK → auth.users |                                                                                   |
| uploaded_at  | timestamptz          |                                                                                   |

Constraint: partial unique index on `(outlet_id)` where `is_cover = true`.
Constraint: check `(SELECT count(*) FROM outlet_photos WHERE outlet_id = X) <= 5`
— enforce in server action, not DB, to keep error message user-friendly.

---

## Storage

- Supabase Storage bucket: `outlet-photos` (private)
- Path pattern: `{outlet_id}/{uuid}.{ext}`
- RLS on storage matches table RLS
- Serve via signed URLs (expire in 1 hour) generated server-side — never expose the bucket publicly

---

## RLS Policies

### `outlet_photos`

- **SELECT:** anyone who can SELECT the parent outlet (reuse outlet RLS logic)
- **INSERT / UPDATE / DELETE:** partner only

### Storage bucket policies

- **SELECT:** authenticated users whose outlet-member row matches the outlet in the path
- **INSERT / UPDATE / DELETE:** partner only

---

## Server Actions

`apps/web/app/(app)/outlets/[id]/actions.ts` (extend existing):

- `uploadOutletPhoto(outletId, file: File): Promise<{ id: string }>` — validates type/size, enforces 5-photo cap, uploads to Storage, inserts row
- `deleteOutletPhoto(photoId): Promise<void>`
- `setCoverPhoto(photoId): Promise<void>` — unsets previous cover, sets new
- `reorderPhotos(outletId, orderedIds: string[]): Promise<void>`

---

## UI

On `/outlets/[id]` overview tab, above the metadata:

- **No photos:** "Add photos" button → opens upload dialog
- **1–5 photos:** gallery grid (cover photo larger, left; other photos in a 2×2 grid, right; tap to lightbox)
- Partner-only controls visible on hover: delete, set-as-cover, drag-to-reorder

On `/outlets` list: each OutletListItem shows the cover photo as the top of the card (or a tasteful placeholder if none).

New components:

- `OutletPhotoGallery.tsx` (display)
- `UploadOutletPhotoDialog.tsx` (upload + crop-preview, using react-dropzone)
- `OutletPhotoLightbox.tsx`
- `OutletCoverImage.tsx` (used by list card)

Use signed URLs generated in the Server Component pass; revalidate when photos mutate.

---

## Edge Cases

- **Upload fails partway.** Clean up the Storage object if the DB insert fails (use try/finally in the server action).
- **No cover set.** First uploaded photo auto-becomes cover. If cover is deleted, the next lowest `sort_order` photo becomes cover.
- **Outlet archived.** Photos remain in Storage but become unreachable via RLS. Garbage-collection job can be added later if needed.

---

## Out of Scope

- Image editing / cropping / filters (just upload and display)
- Video uploads
- Public sharing / social embeds
- AI-generated captions

---

## Definition of Done

- Partner uploads 3 photos to GDC Elan, sets one as cover, reorders
- Cover photo appears on `/outlets` list card
- Gallery renders cleanly on detail page; tap opens lightbox
- 6th upload is rejected with a clear error
- `pnpm build && pnpm typecheck` clean
- CLAUDE.md updated
