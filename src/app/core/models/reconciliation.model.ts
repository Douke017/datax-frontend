export interface BridgeReconcileRequest {
  source_id: string;
  external_api_url?: string | null;
  external_map_path?: string | null;
}

export interface BridgeReconcileResponse {
  source_id: string;
  run_id: string;
  total_external_resources: number;
  total_confirmed: number;
  total_new: number;
  total_modified: number;
  summary_message: string;
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
