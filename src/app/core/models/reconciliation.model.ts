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

export interface BronzeAsset {
  filename: string;
  source_id: string;
  rel_path: string;
  size_bytes: number;
  sha256?: string;
  last_modified: string;
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
  verdict: 'PROCEED_DOWNLOAD' | 'CACHE_HIT_BRONZE' | 'CACHE_HIT_GOLD' | 'IN_FLIGHT_LOCKED' | 'REUSE_DERIVATION' | 'IN_PROGRESS';
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

export interface DomainCircuitStatus {
  domain: string;
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failure_count: number;
  cooldown_remaining_seconds: number;
  opened_at?: string | null;
  last_attempt_at?: string | null;
}
