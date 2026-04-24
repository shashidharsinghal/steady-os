CREATE POLICY "ingestion_runs_delete"
  ON public.ingestion_runs FOR DELETE
  USING (public.is_partner(auth.uid()));
