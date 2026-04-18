CREATE TABLE public.outlet_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id    uuid        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  caption      text,
  is_cover     boolean     NOT NULL DEFAULT false,
  sort_order   integer     NOT NULL,
  uploaded_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outlet_photos_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX outlet_photos_outlet_id_idx ON public.outlet_photos (outlet_id);
CREATE UNIQUE INDEX outlet_photos_cover_idx
  ON public.outlet_photos (outlet_id)
  WHERE is_cover = true;

ALTER TABLE public.outlet_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outlet_photos_select"
  ON public.outlet_photos FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      JOIN public.outlets ON outlets.id = outlet_members.outlet_id
      WHERE outlet_members.outlet_id = outlet_photos.outlet_id
        AND outlet_members.user_id = auth.uid()
        AND outlets.archived_at IS NULL
    )
  );

CREATE POLICY "outlet_photos_insert"
  ON public.outlet_photos FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "outlet_photos_update"
  ON public.outlet_photos FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "outlet_photos_delete"
  ON public.outlet_photos FOR DELETE
  USING (public.is_partner(auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('outlet-photos', 'outlet-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "outlet_photos_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'outlet-photos'
    AND auth.role() = 'authenticated'
    AND (
      public.is_partner(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.outlet_members
        WHERE outlet_members.user_id = auth.uid()
          AND outlet_members.outlet_id::text = split_part(storage.objects.name, '/', 1)
      )
    )
  );

CREATE POLICY "outlet_photos_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'outlet-photos'
    AND public.is_partner(auth.uid())
  );

CREATE POLICY "outlet_photos_storage_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'outlet-photos'
    AND public.is_partner(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'outlet-photos'
    AND public.is_partner(auth.uid())
  );

CREATE POLICY "outlet_photos_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'outlet-photos'
    AND public.is_partner(auth.uid())
  );
