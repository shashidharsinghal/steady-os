export interface DetectionContext {
  fileName: string;
  fileSize: number;
  /** First 50 KB of file content for header inspection. */
  sampleBuffer: Buffer;
}

export interface DetectionResult {
  /** Confidence score 0..1. */
  confidence: number;
  /** Human-readable reason, shown in UI when confidence is borderline. */
  reason: string;
}

export interface RowError {
  rowNumber: number;
  errorCode: string;
  errorMessage: string;
  fieldName?: string;
  rawValue?: string;
  rawRow?: unknown;
}

export interface ParseContext {
  runId: string;
  outletId: string | null;
  /** Supabase Storage path of the uploaded file (for reference/logging). */
  filePath: string;
  /** Full file content — parsers receive this to avoid needing Storage access. */
  fileBuffer: Buffer;
  recordError: (err: RowError) => void;
}

export interface ParseResult<TRaw> {
  rowsSeen: number;
  records: TRaw[];
}

export interface NormalizeContext<TRaw> {
  runId: string;
  outletId: string | null;
  records: TRaw[];
}

export interface NormalizeResult<TCanonical> {
  toInsert: TCanonical[];
  duplicateCount: number;
}

export interface CommitContext<TCanonical> {
  runId: string;
  outletId: string | null;
  records: TCanonical[];
  committedBy: string;
}

export interface CommitResult {
  rowsInserted: number;
}

export interface RollbackContext {
  runId: string;
}

/**
 * Contract every parser must satisfy. TRaw is the domain-specific intermediate
 * representation; TCanonical is the shape written to the database.
 *
 * Feature packages register parsers via registerParser() — the framework
 * itself has no knowledge of domain-specific schemas.
 */
export interface Parser<TRaw = unknown, TCanonical = unknown> {
  /** Matches source_type column in ingestion_runs. */
  readonly sourceType: string;

  /** Human-readable name shown in the upload UI. */
  readonly displayName: string;

  /** File extensions accepted, without leading dot (e.g. ['xlsx', 'csv']). */
  readonly acceptedExtensions: readonly string[];

  /**
   * Heuristic detection — called during file classification.
   * Return confidence 0 if this parser definitely doesn't match.
   */
  readonly detect: (ctx: DetectionContext) => Promise<DetectionResult>;

  /**
   * Parse the raw file into domain-specific records.
   * Call ctx.recordError() for recoverable row-level issues.
   * Throw IngestionError for fatal errors that abort parsing entirely.
   */
  readonly parse: (ctx: ParseContext) => Promise<ParseResult<TRaw>>;

  /**
   * Map raw records to canonical shape and determine which are new vs. duplicate.
   * Runs after parse, before showing the preview.
   */
  readonly normalize: (ctx: NormalizeContext<TRaw>) => Promise<NormalizeResult<TCanonical>>;

  /**
   * Write canonical records to the database within the caller-managed transaction.
   * Called only after user approves the preview.
   */
  readonly commit: (ctx: CommitContext<TCanonical>) => Promise<CommitResult>;

  /**
   * Undo a committed run. Delete all canonical rows tied to runId.
   * Called within a transaction; throw to abort.
   */
  readonly rollback: (ctx: RollbackContext) => Promise<void>;
}
