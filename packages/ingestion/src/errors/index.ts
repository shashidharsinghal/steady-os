export type IngestionErrorCode =
  | "file_too_large"
  | "unsupported_file_type"
  | "file_hash_duplicate"
  | "detection_ambiguous"
  | "parser_not_implemented"
  | "missing_required_column"
  | "missing_required_field"
  | "invalid_date"
  | "invalid_amount"
  | "invalid_enum_value"
  | "parse_error"
  | "commit_conflict"
  | "unknown";

export class IngestionError extends Error {
  readonly code: IngestionErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: IngestionErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = "IngestionError";
    this.code = code;
    this.context = context;
  }
}

export class ParserNotImplementedError extends IngestionError {
  constructor(message: string) {
    super("parser_not_implemented", message);
    this.name = "ParserNotImplementedError";
  }
}

/** User-safe messages for each error code. */
export const INGESTION_ERROR_MESSAGES: Record<IngestionErrorCode, string> = {
  file_too_large: "File exceeds the 50 MB size limit.",
  unsupported_file_type: "Only .xlsx, .xls, and .csv files are supported.",
  file_hash_duplicate:
    "This exact file has already been committed. Upload a different file or check the run history.",
  detection_ambiguous:
    "We could not confidently identify the file type. Please select the source manually.",
  parser_not_implemented: "No parser is available for this source type yet.",
  missing_required_column: "The file is missing one or more required columns.",
  missing_required_field: "A required field was blank on one or more rows.",
  invalid_date: "One or more dates could not be parsed.",
  invalid_amount: "One or more amounts could not be parsed.",
  invalid_enum_value: "A field contained an unexpected value.",
  parse_error: "The file could not be parsed.",
  commit_conflict: "Some rows conflicted with existing data and could not be written.",
  unknown: "An unexpected error occurred.",
};
