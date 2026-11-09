export type MetricDataType = 'DECIMAL' | 'PERCENTAGE' | 'INTEGER' | 'STRING';

export interface FinancialMetricDefinition {
  metric_code: string;
  canonical_name: string;
  category: string;
  data_type: MetricDataType;
  unit: string;
  formula_latex: string;
  description: string;
  required_fields: string[];
}

export interface SemanticDictionaryResponse {
  total_metrics: number;
  categories: string[];
  metrics: FinancialMetricDefinition[];
}

export interface DatamartSummaryItem {
  datamart: string;
  title: string;
  source_code: string;
  description: string;
  is_materialized: boolean;
  total_rows: number;
  institutions_count: number;
  min_period?: string | null;
  max_period?: string | null;
  columns: string[];
}

export interface AnalyticsQueryRequest {
  datamart: string;
  institutions?: string[] | null;
  gestiones?: number[] | null;
  meses?: number[] | null;
  metrics?: string[] | null;
}

export interface AnalyticsQueryResponse {
  datamart: string;
  total_records: number;
  execution_time_ms: number;
  columns: string[];
  records: Record<string, unknown>[];
}

export interface PredefinedViewMetadata {
  view_id: string;
  title: string;
  description: string;
  category: string;
  datamart?: string;
  supported_filters: string[];
  output_columns: string[];
}

export interface PredefinedViewQueryRequest {
  gestion?: number | null;
  mes?: number | null;
  institutions?: string[] | null;
  limit?: number;
}

export interface PredefinedViewResult {
  view_id: string;
  title: string;
  execution_time_ms: number;
  total_records: number;
  columns: string[];
  records: Record<string, unknown>[];
}

export interface GoldDimensions {
  institutions?: string[];
  instituciones?: string[];
  gestiones?: number[];
  meses?: number[];
  [key: string]: unknown;
}

export interface MaterializeGoldResponse {
  status: string;
  total_bronze_artifacts: number;
  total_silver_records?: number;
  total_gold_records: number;
  datamarts?: Record<string, { rows: number; assets_registered?: number; status?: string }>;
  mart_path?: string;
}

export interface DatamartColumnDefinition {
  datamart_name: string;
  column_name: string;
  business_label: string;
  data_type: string;
  unit?: string | null;
  formula?: string | null;
  description: string;
  is_nullable?: boolean;
}

export interface DatamartRelationshipItem {
  relationship_id?: number;
  from_datamart: string;
  from_column: string;
  to_datamart: string;
  to_column: string;
  relationship_type: string;
  business_meaning: string;
}

export interface DatamartDictionaryDetail {
  datamart: string;
  title: string;
  source_code: string;
  description: string;
  total_columns: number;
  columns: DatamartColumnDefinition[];
  relationships: DatamartRelationshipItem[];
}

export interface DatamartLineageEntry {
  asset_id: string;
  datamart_name: string;
  source_id: string;
  period_start: string;
  row_count: number;
  gold_sha256: string;
  lineage_id: string;
  bronze_source_file: string;
  bronze_file_sha256: string;
  external_run_id: string;
  pipeline_version: string;
  transformed_at: string;
  canonical_url?: string | null;
}

export interface LineageIntegrityCheckResult {
  asset_id: string;
  is_valid: boolean;
  recorded_sha256: string;
  current_disk_sha256?: string | null;
  all_upstream_intact: boolean;
  upstream_details: Record<string, unknown>[];
  verification_message: string;
  verified_at: string;
}

export interface SelfServiceApiKey {
  key_id: string;
  label: string;
  key_prefix: string;
  raw_api_key?: string;
  api_key?: string;
  allowed_datamarts: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  last_used_at?: string | null;
}

export interface CreateApiKeyRequest {
  label: string;
  allowed_datamarts: string;
}

export interface SelfServiceAccessLog {
  log_id: number;
  key_id?: string | null;
  key_label?: string | null;
  datamart_name: string;
  export_format: string;
  rows_returned: number;
  client_agent?: string | null;
  accessed_at: string;
}
