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

export interface IngestionEvaluateRequest {
  dataset_code: string;
  domain?: string | null;
  target_url?: string | null;
  period?: string | null;
  force_refresh?: boolean;
  request_id?: string | null;
  source_id?: string | null;
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
  cached_artifact_id?: string | null;
  in_flight_task_id?: string | null;
  task_id?: string | null;
  status: string;
  subscribers_count: number;
  derivation_query?: string | null;
  missing_periods?: string[] | null;
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

export interface DownloadStatusItem {
  download_id: string;
  source_id: string;
  canonical_url: string;
  status: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';
  bytes_downloaded: number;
  total_bytes?: number | null;
  task_id?: string | null;
  subscribers_count: number;
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
  status?: 'PENDING' | 'DOWNLOADING';
  task_id?: string | null;
}

export interface DomainCircuitStatus {
  domain: string;
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  cooldown_remaining_seconds: number;
  opened_at?: string | null;
  last_attempt_at?: string | null;
}
