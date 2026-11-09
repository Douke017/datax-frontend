export type FileProcessingStatus =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'PROCESADO_EXITOSAMENTE'
  | 'ERROR';

export interface CatalogSource {
  source_id: string;
  name: string;
  entrypoint: string;
  workflow: string;
  health_status: 'ACTIVE' | 'WARNING' | 'SUSPENDED' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';
  update_category: string;
  audit_code?: string | null;
  audit_note?: string | null;
  dom_structural_hash?: string | null;
  api_schema_hash?: string | null;
  baseline_selectors?: string[];
  baseline_resource_count?: number;
  policy_customized?: boolean;
  seeds?: string[];
  allowed_extensions?: string[];
  rate_limit_seconds?: number;
  max_urls?: number;
  max_resources?: number;
  ignore_robots_txt?: boolean;
  contingency_url?: string | null;
  contingency_urls?: string[];
  active_contingency_url?: string | null;
  excluded_path_keywords?: string[];
  allowed_hosts?: string[];
  consecutive_failures?: number;
  first_failure_at?: string | null;
  next_eligible_at?: string;
  last_run_id?: string | null;
  last_run_at?: string | null;
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
  discovered_from_url?: string | null;
  extracted_from_archive?: string | null;
  period_label?: string | null;
  content_hash?: string | null;
  change_status: 'NEW' | 'MODIFIED' | 'UNCHANGED' | 'REMOVED' | 'DELETED' | 'NOT_EVALUATED';
  processing_status?: FileProcessingStatus;
  processing_updated_at?: string | null;
  processing_error?: string | null;
  discovered_at: string;
  raw_url?: string | null;
  discovery_method?: string;
  anchor_text?: string | null;
  context_text?: string | null;
  http_status?: number | null;
  resource_type?: string;
  api?: Record<string, unknown> | null;
}

export interface RunCoverage {
  pages_visited: number;
  urls_discovered: number;
  resources_found: number;
  urls_rejected: number;
  urls_failed: number;
  requests_total?: number;
  stop_reason?: string;
  [key: string]: unknown;
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

export interface TriggerRunRequest {
  source_id?: string | null;
  force?: boolean;
}

export interface TriggerRunResponse {
  status: 'STARTED' | 'COMPLETED' | 'BUSY';
  message: string;
  source_id?: string | null;
  run_id?: string | null;
}

export interface TrustRelevanceBreakdown {
  domain_trust_pts: number;
  protocol_health_pts: number;
  format_availability_pts: number;
  thematic_relevance_pts: number;
}

export interface OpenDiscoveryCandidate {
  candidate_id: string;
  domain: string;
  entrypoint: string;
  title: string;
  sector: string;
  trust_score: number;
  relevance_score: number;
  combined_score: number;
  breakdown: TrustRelevanceBreakdown;
  tls_valid: boolean;
  http_status?: number | null;
  detected_extensions: string[];
  detected_files_count: number;
  sample_resource_urls: string[];
  matched_keywords: string[];
  status: 'PRESELECCIONADA' | 'APROBADA' | 'DESCARTADA';
  promoted_source_id?: string | null;
  discovered_at: string;
}

export interface OpenDiscoverySearchRequest {
  query: string;
  sector: string;
  target_extensions: string[];
  seed_urls: string[];
  trusted_domains_only: boolean;
  min_combined_score: number;
}

export interface PromoteCandidateRequest {
  source_id: string;
  name: string;
  update_category: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  workflow: 'html' | 'javascript' | 'api';
}

export type BackupOriginType =
  | 'CONFIGURADA'
  | 'ESPEJO_INSTITUCIONAL'
  | 'RUTA_ESTADISTICA_ALTERNA'
  | 'DATOS_ABIERTOS'
  | 'WAYBACK_CDX';

export interface ContingencyCandidate {
  url: string;
  origin_type: BackupOriginType;
  reachable: boolean;
  http_status?: number | null;
  latency_ms?: number | null;
  content_type?: string | null;
  valid_structure: boolean;
  detected_resources_count: number;
  confidence_score: number;
  recommendation: string;
  evaluated_at: string;
}

export interface ContingencyEvaluationResponse {
  source_id: string;
  source_name: string;
  primary_entrypoint: string;
  auto_registered_count: number;
  candidates: ContingencyCandidate[];
  updated_contingency_urls: string[];
}

export interface StructuralAlert {
  alert_id: string;
  source_id: string;
  source_name: string;
  entrypoint: string;
  alert_code: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA';
  previous_signature?: string | null;
  current_signature?: string | null;
  affected_selectors: string[];
  diagnostic_summary: string;
  contingency_active?: string | null;
  detected_at: string;
  resolved: boolean;
}

export interface MaintenanceTechnicalReport {
  report_id: string;
  generated_at: string;
  source_id: string;
  source_name: string;
  entrypoint: string;
  workflow: string;
  health_status: string;
  alert_code: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA';
  diagnostic_summary: string;
  previous_signature?: string | null;
  current_signature?: string | null;
  affected_selectors: string[];
  contingency_urls: string[];
  active_contingency_url?: string | null;
  remediation_steps: string[];
  taiga_markdown: string;
}
