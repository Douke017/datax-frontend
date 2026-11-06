export interface UrlInventoryItem {
  id: number;
  source_id: string;
  file_code?: string | null;
  file_name?: string | null;
  canonical_url: string;
  normalized_url_sha256: string;
  is_discovered_web: boolean;
  is_downloaded: boolean;
  is_processed: boolean;
  sha256_hash?: string | null;
  storage_path?: string | null;
  gold_target?: string | null;
  status: string;
  updated_at?: string | null;
}

export interface UrlInventoryResponse {
  total: number;
  page: number;
  limit: number;
  items: UrlInventoryItem[];
}

export interface UpdateUrlInventoryRequest {
  is_processed?: boolean;
  is_downloaded?: boolean;
}

export interface SourceStatsItem {
  source_id: string;
  total: number;
  downloaded: number;
  processed: number;
}

export interface InventoryStatsResponse {
  total_urls: number;
  total_downloaded: number;
  total_processed: number;
  download_rate_pct: number;
  processing_rate_pct: number;
  by_source: SourceStatsItem[];
}
