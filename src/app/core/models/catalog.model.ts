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
