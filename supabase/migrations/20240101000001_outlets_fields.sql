-- Add new columns to outlets
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS fssai_license TEXT;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS opened_at DATE;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Unique petpooja restaurant ID across active (non-archived) outlets
CREATE UNIQUE INDEX IF NOT EXISTS outlets_petpooja_unique
  ON public.outlets (petpooja_restaurant_id)
  WHERE archived_at IS NULL AND petpooja_restaurant_id IS NOT NULL;

-- Active outlets view (archived ones are hidden from normal queries)
CREATE OR REPLACE VIEW public.active_outlets AS
  SELECT * FROM public.outlets WHERE archived_at IS NULL;

-- is_partner overload that accepts an explicit user_id (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_partner(user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outlet_members
    WHERE outlet_members.user_id = $1 AND role = 'partner'
  );
$$;

-- Drop and recreate outlets RLS policies to match spec:
--   SELECT: member of that outlet (any role) OR any partner anywhere
--   INSERT/UPDATE: partner only
--   DELETE: never

DROP POLICY IF EXISTS "outlets_all_partners" ON public.outlets;
DROP POLICY IF EXISTS "outlets_select_managers" ON public.outlets;

CREATE POLICY "outlets_select"
  ON public.outlets FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.outlet_members
      WHERE outlet_id = outlets.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "outlets_insert"
  ON public.outlets FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "outlets_update"
  ON public.outlets FOR UPDATE
  USING (public.is_partner(auth.uid()));
