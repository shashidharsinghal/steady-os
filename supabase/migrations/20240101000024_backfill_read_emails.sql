-- Allow Gmail date backfills to re-commit reports from soft-deleted runs.
-- The original dedupe index blocked a matching file hash even when the old
-- committed run had been removed from active product data.
DROP INDEX IF EXISTS public.idx_ingestion_runs_file_hash;

CREATE UNIQUE INDEX idx_ingestion_runs_file_hash
  ON public.ingestion_runs (outlet_id, file_sha256)
  WHERE status = 'committed'
    AND deleted_at IS NULL
    AND file_sha256 IS NOT NULL;
