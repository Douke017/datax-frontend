export interface BridgeReconcileRequest {
  source_id: string;
  external_api_url?: string | null;
  external_map_path?: string | null;
}

export interface ReconciliationDiffItem {
  resource_key: string;
  url: string;
  source_id: string;
  category: 'CONFIRMED' | 'NEW' | 'MODIFIED' | 'URL_CHANGED';
  file_extension: string;
  period_label?: string | null;
  size_bytes?: number | null;
  detail: string;
}

export interface BridgeReconcileResponse {
  source_id: string;
  run_id: string;
  total_external_resources: number;
  total_confirmed: number;
  total_new: number;
  total_modified: number;
  summary_message: string;
  items?: ReconciliationDiffItem[];
}

export interface BridgeSyncRequest {
  source_id: string;
  external_api_url?: string | null;
  external_map_path?: string | null;
  batch_size?: number;
  max_downloads?: number;
  execute_downloads?: boolean;
}

export interface BridgeSyncResponse {
  plan_id: string;
  source_id: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  is_executed: boolean;
  summary: string;
}

export interface BronzeArtifactEntry {
  artifact_id: string;
  dataset_code: string;
  domain: string;
  file_path: string;
  sha256_hash: string;
  size_bytes: number;
  downloaded_at: string;
  http_status: number;
  content_type?: string;
  period?: string;
  is_rescued?: boolean;
}

export type GatekeeperMode = 'DRY_RUN' | 'ACQUIRE_LOCK';

export interface IngestionEvaluateRequest {
  dataset_code: string;
  domain?: string | null;
  target_url?: string | null;
  period?: string | null;
  checksum_sha256?: string | null;
  etag?: string | null;
  force_refresh?: boolean;
  request_id?: string | null;
  source_id?: string | null;
  mode?: GatekeeperMode;
  dry_run?: boolean;
  lock_ttl_seconds?: number;
}

export interface IngestionEvaluateResponse {
  verdict:
    | 'PROCEED_DOWNLOAD'
    | 'CACHE_HIT_BRONZE'
    | 'CACHE_HIT_GOLD'
    | 'IN_FLIGHT_LOCKED'
    | 'REUSE_DERIVATION'
    | 'IN_PROGRESS';
  idempotency_key: string;
  reason: string;
  lock_acquired: boolean;
  mode?: GatekeeperMode;
  cached_artifact_id?: string | null;
  in_flight_task_id?: string | null;
  task_id?: string | null;
  status: string;
  subscribers_count: number;
  derivation_query?: string | null;
  missing_periods?: string[] | null;
  action_links?: Record<string, string>;
  latency_ms?: number;
  dedup_criterion?: string | null;
}

export interface BatchGatekeeperEvaluateRequest {
  items: IngestionEvaluateRequest[];
  mode?: GatekeeperMode;
  lock_ttl_seconds?: number;
}

export interface BatchGatekeeperEvaluateResponse {
  total: number;
  mode: GatekeeperMode;
  elapsed_ms: number;
  summary: Record<string, number>;
  saved_downloads: number;
  results: IngestionEvaluateResponse[];
}

export interface GatekeeperMetricsResponse {
  total_evaluations: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  verdict_counts: Record<string, number>;
  saved_downloads: number;
  deduplication_savings?: {
    total_intercepted: number;
    total_bytes_saved: number;
    total_aliases: number;
    by_criterion: Record<string, number>;
  };
}

export interface DeduplicationAuditEvent {
  audit_id: string;
  source_id?: string | null;
  dataset_code?: string | null;
  requested_url?: string | null;
  matched_asset_id?: string | null;
  matched_sha256?: string | null;
  criterion: string;
  bytes_saved: number;
  occurred_at: string;
}

export interface AssetAliasRecord {
  alias_id: string;
  canonical_url: string;
  canonical_asset_id: string;
  sha256_hash: string;
  source_id?: string | null;
  created_at: string;
}

export interface DeduplicationAuditResponse {
  summary: {
    total_intercepted: number;
    total_bytes_saved: number;
    total_aliases: number;
    by_criterion: Record<string, number>;
  };
  events: DeduplicationAuditEvent[];
  aliases: AssetAliasRecord[];
}

export interface DerivationEvaluationRequest {
  dataset_code: string;
  period: string;
  institution_id?: string | null;
}

export interface DerivationEvaluationResult {
  status: 'DERIVABLE' | 'MISSING_PERIODS' | 'NOT_DERIVABLE';
  is_derivable: boolean;
  target_period: string;
  granularity: 'ANNUAL' | 'SEMESTER' | 'QUARTER' | 'MONTHLY' | 'CUSTOM_RANGE';
  required_periods: string[];
  available_periods: string[];
  missing_periods: string[];
  coverage_ratio: number;
  precompiled_sql?: string | null;
  explanation: string;
}

export interface EnqueueMissingPeriodsRequest {
  dataset_code: string;
  period: string;
  source_id?: string | null;
  url_template?: string | null;
  institution_id?: string | null;
  execute_now?: boolean;
}

export interface EnqueueMissingPeriodsResponse {
  action: 'DIRECT_EXPORT_READY' | 'ENQUEUED_MISSING_PERIODS' | 'NO_ACTION';
  dataset_code: string;
  period: string;
  coverage_ratio: number;
  available_periods: string[];
  missing_periods: string[];
  enqueued_count: number;
  enqueued_downloads: Array<{
    period: string;
    download_id: string;
    canonical_url: string;
    status: string;
    coalesced: boolean;
  }>;
  export_urls?: Record<string, string>;
  message: string;
}

export type DownloadLifecycleStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'DOWNLOADING'
  | 'VERIFYING_SHA256'
  | 'COMPLETED'
  | 'DEDUPLICATED'
  | 'FAILED'
  | 'CANCELLED';

export interface DownloadStatusItem {
  download_id: string;
  source_id: string;
  canonical_url: string;
  status: DownloadLifecycleStatus;
  bytes_downloaded: number;
  total_bytes?: number | null;
  progress_pct?: number;
  speed_bps?: number;
  retry_count?: number;
  max_retries?: number;
  last_error_code?: string | null;
  sha256_checksum?: string | null;
  local_path?: string | null;
  task_id?: string | null;
  worker_id?: string | null;
  resource_key?: string | null;
  priority?: number;
  subscribers_count: number;
  coalesced?: boolean;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface DownloadsStatusListResponse {
  total_active: number;
  downloads: DownloadStatusItem[];
}

export interface EnqueueDownloadRequest {
  source_id: string;
  canonical_url: string;
  status?: 'QUEUED' | 'PENDING' | 'DOWNLOADING';
  task_id?: string | null;
  request_id?: string | null;
  priority?: number;
  resource_key?: string | null;
  dataset_code?: string | null;
  period_label?: string | null;
  etag?: string | null;
  execute_now?: boolean;
}

export interface DomainCircuitStatus {
  domain: string;
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  cooldown_remaining_seconds: number;
  opened_at?: string | null;
  last_attempt_at?: string | null;
}

export interface AssetColumnSummary {
  sheet_name?: string;
  column_name: string;
  inferred_type: string;
  null_count?: number;
  null_pct: number;
  distinct_count: number;
  sample_values?: unknown[];
}

export interface AssetTechnicalProfile {
  asset_id: string;
  source_id: string;
  sha256_hash?: string | null;
  detected_format: string;
  detected_encoding?: string | null;
  detected_delimiter?: string | null;
  sheets?: string[];
  archive_entries?: Array<{
    filename: string;
    size_bytes: number;
    compressed_bytes?: number;
    extension?: string;
  }>;
  row_count: number;
  column_count: number;
  columns_summary: AssetColumnSummary[];
  sample_rows: Record<string, unknown>[];
  size_bytes?: number;
  profiled_at?: string;
  warning?: string | null;
}

export interface GlobalCatalogColumnMatch {
  asset_id: string;
  source_id: string;
  dataset_id?: string | null;
  sheet_name?: string;
  column_name: string;
  inferred_type: string;
  null_pct: number;
  distinct_count: number;
  origin: 'RAW_FILE_PROFILE' | 'GOLD_DICTIONARY';
  download_url?: string;
  profile_url?: string;
  export_parquet_url?: string;
}

export interface GlobalCatalogAssetMatch {
  asset_id: string;
  source_id: string;
  dataset_id: string;
  storage_layer: string;
  period_start?: string | null;
  period_end?: string | null;
  size_bytes: number;
  sha256_hash: string;
  download_url: string;
  profile_url: string;
}

export interface GlobalCatalogSearchResponse {
  query: Record<string, string | null>;
  total_column_matches: number;
  total_asset_matches: number;
  column_matches: GlobalCatalogColumnMatch[];
  asset_matches: GlobalCatalogAssetMatch[];
}
