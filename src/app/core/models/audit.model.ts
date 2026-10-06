export type GapStatus =
  | 'CONFIRMED_ONLINE'
  | 'PENDING_INGESTION'
  | 'LOST_OFFLINE'
  | 'RESCUED_ARCHIVE'
  | 'CRITICAL_GAP'
  | 'UNPUBLISHED';

export interface ExpectedFiling {
  expected_id: string;
  source_id: string;
  period_label: string;
  year: number;
  month?: number;
  document_type: string;
  target_filename: string;
  legal_deadline_date?: string;
  expected_urls?: string[];
  expected_extension?: string;
}

export interface RescuedAsset {
  rescue_id: string;
  original_url: string;
  archive_url: string;
  capture_timestamp: string;
  digest: string;
  mimetype: string;
  content_length: number;
  rescued_at: string;
  agent_reasoning?: string;
  search_citations?: string[];
  source_confidence?: number;
}

export interface DetectedGap {
  gap_id: string;
  source_id: string;
  period_label: string;
  document_type: string;
  status: GapStatus;
  expected_filing: ExpectedFiling;
  web_resource_url?: string;
  bronze_confirmed: boolean;
  rescued_asset?: RescuedAsset;
  notes?: string;
  detected_at: string;
}

export interface AuditMetrics {
  source_id: string;
  total_expected: number;
  confirmed_online: number;
  pending_ingestion: number;
  lost_offline: number;
  rescued_archive: number;
  critical_gaps: number;
  unpublished: number;
  icr: number;
  trd: number;
  tsw: number;
}

export interface SourceAuditSummary {
  source_id: string;
  source_name: string;
  regulatory_entity: string;
  audit_run_id: string;
  audited_at: string;
  metrics: AuditMetrics;
  gaps: DetectedGap[];
}

export interface ReconcileThreeWayRequest {
  source_id: string;
  auto_rescue?: boolean;
  external_api_url?: string;
}

export interface RescueGapRequest {
  source_id: string;
  period_label: string;
  auto_inject?: boolean;
  external_api_url?: string;
}
