export type FileProcessingStatus =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'PROCESADO_EXITOSAMENTE'
  | 'ERROR';

export type StatusActor = 'PROSPECTOR_INTERNO' | 'PIPELINE' | 'MANUAL_OPERATOR';
export type FreshnessClass = 'ESPEJO_VIVO' | 'HISTORICO_SOLO_LECTURA';
export type AlertSeverity = 'CRITICA' | 'ALTA' | 'MEDIA';
export type AlertStatus =
  | 'ABIERTA'
  | 'RECONOCIDA'
  | 'EN_MANTENIMIENTO'
  | 'RESUELTA'
  | 'SILENCIADA';
export type AlertChannelType = 'WEBHOOK' | 'SLACK' | 'TEAMS' | 'SMTP' | 'TAIGA';

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
  baseline_json_paths?: string[];
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

export interface ArchiveMemberEntry {
  filename: string;
  extension?: string;
  size_bytes?: number;
  compressed_bytes?: number;
}

export interface CatalogResource {
  resource_key: string;
  url: string;
  source_id: string;
  title?: string;
  file_extension?: string;
  content_type?: string | null;
  content_length_bytes?: number | null;
  content_disposition?: string | null;
  declared_filename?: string | null;
  last_modified_header?: string | null;
  etag?: string | null;
  revalidated_not_modified?: boolean;
  discovered_from_url?: string | null;
  extracted_from_archive?: string | null;
  archive_entries?: ArchiveMemberEntry[];
  resource_category?: string;
  current_version?: number;
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

export interface ResourceVersion {
  version_id: string;
  resource_key: string;
  source_id: string;
  version_number: number;
  run_id: string;
  url: string;
  content_hash?: string | null;
  etag?: string | null;
  last_modified_header?: string | null;
  content_length_bytes?: number | null;
  declared_filename?: string | null;
  detected_at: string;
}

export interface ResourceStatusAuditEvent {
  audit_id: string;
  resource_key: string;
  source_id: string;
  previous_status: FileProcessingStatus;
  new_status: FileProcessingStatus;
  actor: StatusActor;
  override_reason?: string | null;
  download_id?: string | null;
  sha256?: string | null;
  error_detail?: string | null;
  idempotency_key?: string | null;
  occurred_at: string;
}

export interface ResourceStatusUpdatePayload {
  processing_status: FileProcessingStatus;
  processing_error?: string | null;
  actor?: StatusActor;
  override_reason?: string | null;
  download_id?: string | null;
  sha256?: string | null;
  idempotency_key?: string | null;
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
  status?: string;
  failure_code?: string | null;
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

export interface RunProgressEvent {
  event: string;
  run_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface CancelRunResponse {
  run_id: string;
  status: 'CANCELLING' | 'CANCELLED';
  message: string;
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

export interface DryRunPolicyRequest {
  entrypoint?: string;
  seeds?: string[];
  allowed_extensions?: string[];
  excluded_path_keywords?: string[];
  allowed_hosts?: string[];
  rate_limit_seconds?: number;
  ignore_robots_txt?: boolean;
  max_pages?: number;
  max_resources?: number;
}

export interface DryRunSampleResource {
  resource_key: string;
  url: string;
  title: string;
  file_extension: string;
  resource_category: string;
  discovery_method: string;
  period_label?: string | null;
  http_status?: number | null;
  content_length_bytes?: number | null;
}

export interface DryRunExtractionResponse {
  source_id: string;
  entrypoint: string;
  workflow: string;
  success: boolean;
  elapsed_ms: number;
  pages_visited: number;
  urls_discovered: number;
  total_resources_detected: number;
  stop_reason?: string | null;
  failure_code?: string | null;
  matched_methods: string[];
  sample_resources: DryRunSampleResource[];
  mutated_catalog: boolean;
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
  discovery_provider?: string;
  trust_score: number;
  relevance_score: number;
  combined_score: number;
  breakdown: TrustRelevanceBreakdown;
  tls_valid: boolean;
  tls_protocol?: string | null;
  tls_issuer?: string | null;
  tls_expires_at?: string | null;
  tls_error_code?: string | null;
  tls_error_detail?: string | null;
  http_status?: number | null;
  detected_extensions: string[];
  detected_files_count: number;
  sample_resource_urls: string[];
  matched_keywords: string[];
  status: 'PRESELECCIONADA' | 'APROBADA' | 'DESCARTADA';
  promoted_source_id?: string | null;
  discard_reason?: string | null;
  discarded_at?: string | null;
  discovered_at: string;
}

export interface OpenDiscoverySearchRequest {
  query: string;
  sector: string;
  target_extensions: string[];
  seed_urls: string[];
  trusted_domains_only: boolean;
  excluded_domains?: string[];
  include_discarded?: boolean;
  enable_external_providers?: boolean;
  enable_bfs_expansion?: boolean;
  min_combined_score: number;
  max_results?: number;
}

export interface PromoteCandidateRequest {
  source_id: string;
  name: string;
  update_category: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  workflow: 'html' | 'javascript' | 'api';
}

export type BackupOriginType =
  | 'CONFIGURADA'
  | 'REDIRECCION_PERMANENTE'
  | 'SITEMAP_ALTERNO'
  | 'ESPEJO_INSTITUCIONAL'
  | 'RUTA_ESTADISTICA_ALTERNA'
  | 'DATOS_ABIERTOS'
  | 'WAYBACK_CDX';

export interface ContingencyCandidate {
  url: string;
  origin_type: BackupOriginType;
  freshness_class?: FreshnessClass;
  snapshot_captured_at?: string | null;
  eligible_for_live_failover?: boolean;
  reachable: boolean;
  http_status?: number | null;
  latency_ms?: number | null;
  tls_valid?: boolean;
  tls_error_code?: string | null;
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
  historical_only_urls?: string[];
}

export interface SourceResilienceEntry {
  source_id: string;
  name: string;
  entrypoint: string;
  update_category: string;
  health_status: string;
  live_backup_count: number;
  historical_backup_count: number;
  active_contingency_url?: string | null;
  risk_level: 'PROTEGIDA' | 'SOLO_HISTORICO' | 'PUNTO_UNICO_DE_FALLO';
  contingency_urls: string[];
}

export interface ResilienceCoverageReport {
  total_sources: number;
  protected_sources: number;
  historical_only_sources: number;
  zero_backup_sources: number;
  coverage_pct: number;
  single_points_of_failure: SourceResilienceEntry[];
  entries: SourceResilienceEntry[];
}

export interface FailoverEvent {
  event_id: string;
  source_id: string;
  run_id: string;
  failed_url: string;
  resolved_url?: string | null;
  failure_code?: string | null;
  http_status?: number | null;
  latency_ms: number;
  succeeded: boolean;
  auto_discovered: boolean;
  freshness_class: FreshnessClass;
  detail?: string | null;
  occurred_at: string;
}

export interface StructuralDiff {
  added_selectors: string[];
  removed_selectors: string[];
  changed_fields: string[];
  evidence_snippet?: string | null;
}

export interface AlertDeliveryLog {
  channel_id: string;
  channel_type: string;
  channel_name: string;
  delivered: boolean;
  http_status?: number | null;
  detail?: string | null;
  attempted_at: string;
}

export interface AlertChannelConfig {
  channel_id?: string;
  name: string;
  channel_type: AlertChannelType;
  enabled: boolean;
  min_severity: AlertSeverity;
  endpoint_url?: string | null;
  secret_env_var?: string | null;
  smtp_host?: string | null;
  smtp_port?: number;
  smtp_use_tls?: boolean;
  smtp_from?: string | null;
  smtp_recipients?: string[];
  taiga_project_id?: number | null;
  created_at?: string;
}

export interface AlertLifecycleUpdateRequest {
  status: AlertStatus;
  assignee?: string | null;
  ticket_url?: string | null;
  muted_until?: string | null;
  resolution_note?: string | null;
}

export interface StructuralAlert {
  alert_id: string;
  source_id: string;
  source_name: string;
  entrypoint: string;
  alert_code: string;
  severity: AlertSeverity;
  status?: AlertStatus;
  previous_signature?: string | null;
  current_signature?: string | null;
  affected_selectors: string[];
  structural_diff?: StructuralDiff | null;
  diagnostic_summary: string;
  contingency_active?: string | null;
  occurrences?: number;
  dedup_key?: string | null;
  assignee?: string | null;
  ticket_url?: string | null;
  muted_until?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  delivery_logs?: AlertDeliveryLog[];
  detected_at: string;
  last_seen_at?: string;
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
  severity: AlertSeverity;
  diagnostic_summary: string;
  previous_signature?: string | null;
  current_signature?: string | null;
  affected_selectors: string[];
  structural_diff?: StructuralDiff | null;
  contingency_urls: string[];
  active_contingency_url?: string | null;
  remediation_steps: string[];
  taiga_markdown: string;
}

export interface PagedResourcesResult {
  items: CatalogResource[];
  total: number;
}
