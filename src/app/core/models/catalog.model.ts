export interface CatalogSource {
  source_id: string;
  name: string;
  entrypoint: string;
  workflow: string;
  health_status: 'ACTIVE' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';
  update_category: string;
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
  resource_type: string;
  api?: string | null;
}
