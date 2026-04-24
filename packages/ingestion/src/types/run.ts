export type IngestionStatus =
  | "uploaded"
  | "parsing"
  | "preview_ready"
  | "committing"
  | "committed"
  | "rolled_back"
  | "failed"
  | "purged";

export type DetectionMethod =
  | "filename_pattern"
  | "header_inspection"
  | "content_llm"
  | "user_override";

export interface IngestionRun {
  id: string;
  outlet_id: string | null;
  uploaded_by: string;
  uploaded_at: string;
  source_type: string;
  detection_method: DetectionMethod;
  detection_confidence: number | null;
  user_confirmed_source: boolean;
  file_name: string;
  file_size_bytes: number;
  file_mime_type: string | null;
  file_storage_path: string;
  file_sha256: string | null;
  status: IngestionStatus;
  parsing_started_at: string | null;
  parsing_completed_at: string | null;
  committing_started_at: string | null;
  committed_at: string | null;
  rolled_back_at: string | null;
  failed_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  purge_scheduled_at: string | null;
  rows_seen: number | null;
  rows_parsed: number | null;
  rows_to_insert: number | null;
  rows_duplicate: number | null;
  rows_errored: number | null;
  preview_payload: unknown | null;
  error_details: unknown | null;
  committed_by: string | null;
  rolled_back_by: string | null;
  rollback_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionRowError {
  id: string;
  run_id: string;
  row_number: number;
  error_code: string;
  error_message: string;
  field_name: string | null;
  raw_value: string | null;
  raw_row: unknown | null;
  created_at: string;
}

/** Valid state transitions for the ingestion lifecycle. */
export const VALID_TRANSITIONS: Record<IngestionStatus, IngestionStatus[]> = {
  uploaded: ["parsing", "failed"],
  parsing: ["preview_ready", "failed"],
  preview_ready: ["committing", "failed"],
  committing: ["committed", "failed"],
  committed: ["rolled_back", "purged"],
  rolled_back: [],
  failed: [],
  purged: [],
};

export function isValidTransition(from: IngestionStatus, to: IngestionStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
