export interface CatalogSource {
  source_id: string;
  name: string;
  entrypoint: string;
  workflow: string;
  health_status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';
  update_category: string;
  audit_code?: string;
  audit_note?: string;
  seeds?: string[];
  allowed_extensions?: string[];
  rate_limit_seconds?: number;
  max_urls?: number;
  max_resources?: number;
  ignore_robots_txt?: boolean;
  contingency_url?: string;
  contingency_urls?: string[];
  excluded_path_keywords?: string[];
  allowed_hosts?: string[];
  consecutive_failures?: number;
  first_failure_at?: string;
  next_eligible_at?: string;
  last_run_id?: string;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CatalogResource {
  resource_key: string;
  url: string;
  source_id: string;
  title?: string;
  file_extension?: string;
  content_type?: string | null;
  content_length_bytes?: number | null;
  last_modified_header?: string | null;
  etag?: string | null;
  discovered_from_url?: string;
  extracted_from_archive?: string | null;
  period_label?: string;
  content_hash?: string | null;
  change_status: 'NEW' | 'MODIFIED' | 'UNCHANGED' | 'DELETED';
  discovered_at: string;
  raw_url?: string;
  discovery_method?: string;
  anchor_text?: string | null;
  context_text?: string | null;
  http_status?: number | null;
  resource_type?: string;
  api?: string | null;
}

export interface RunCoverage {
  pages_visited: number;
  urls_discovered: number;
  resources_found: number;
  urls_rejected: number;
  urls_failed: number;
  requests_total?: number;
  stop_reason?: string;
  [key: string]: any;
}

export interface SourceRunResult {
  observation_id: string;
  source_id: string;
  run_id: string;
  workflow: string;
  execution_status: string;
  content_status: string;
  coverage: RunCoverage;
  observed_at: string;
}

export interface RunReport {
  run_id: string;
  started_at: string;
  finished_at: string;
  sources_selected: number;
  sources_processed: number;
  sources_skipped: number;
  sources_failed: number;
  sources_with_changes: number;
  sources_without_changes: number;
  source_results: SourceRunResult[];
}

export interface SourcePolicyUpdate {
  entrypoint?: string;
  seeds?: string[];
  update_category?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  next_eligible_at?: string;
  allowed_extensions?: string[];
  rate_limit_seconds?: number;
  max_urls?: number;
  max_resources?: number;
  ignore_robots_txt?: boolean;
  health_status?: 'ACTIVE' | 'WARNING' | 'SUSPENDED';
  audit_code?: string;
  audit_note?: string;
  contingency_url?: string;
  contingency_urls?: string[];
  excluded_path_keywords?: string[];
  allowed_hosts?: string[];
}

export interface StorageStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  database_type: string;
  mongo_connected: boolean;
  mongo_database: string;
  collections: {
    sources: number;
    discovered_urls: number;
    resource_candidates: number;
    runs: number;
    snapshots: number;
  };
  local_state_healthy: boolean;
  local_sources_count: number;
  local_resources_count: number;
  local_state_path: string;
  last_backup_at?: string | null;
  backups_count: number;
}

export interface BackupSyncResult {
  status: 'SUCCESS' | 'FAILED';
  backup_id: string;
  backup_path: string;
  sources_backed_up: number;
  resources_backed_up: number;
  timestamp: string;
}

