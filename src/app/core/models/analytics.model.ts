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

export interface PredefinedViewMetadata {
  view_id: string;
  title: string;
  description: string;
  category: string;
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
  records: Record<string, any>[];
}

export interface GoldDimensions {
  institutions?: string[];
  instituciones?: string[];
  gestiones?: number[];
  meses?: number[];
  [key: string]: any;
}

export interface MaterializeGoldResponse {
  status: string;
  total_bronze_artifacts: number;
  total_silver_records: number;
  total_gold_records: number;
  mart_path: string;
}
