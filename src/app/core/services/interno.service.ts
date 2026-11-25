import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getInternoApiBase } from '../config/api-endpoints';
import {
  AssetTechnicalProfile,
  BatchGatekeeperEvaluateRequest,
  BatchGatekeeperEvaluateResponse,
  BridgeReconcileRequest,
  BridgeReconcileResponse,
  BridgeSyncRequest,
  BridgeSyncResponse,
  BronzeArtifactEntry,
  DeduplicationAuditResponse,
  DerivationEvaluationRequest,
  DerivationEvaluationResult,
  DomainCircuitStatus,
  DownloadStatusItem,
  DownloadsStatusListResponse,
  EnqueueDownloadRequest,
  EnqueueMissingPeriodsRequest,
  EnqueueMissingPeriodsResponse,
  GatekeeperMetricsResponse,
  GlobalCatalogSearchResponse,
  IngestionEvaluateRequest,
  IngestionEvaluateResponse
} from '../models/reconciliation.model';
import {
  InventoryStatsResponse,
  UpdateUrlInventoryRequest,
  UrlInventoryItem,
  UrlInventoryResponse
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InternoService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = getInternoApiBase();

  reconcile(request: BridgeReconcileRequest): Observable<BridgeReconcileResponse> {
    return this.http.post<BridgeReconcileResponse>(
      `${this.baseUrl}/api/v1/bridge/reconcile`,
      request
    );
  }

  sync(request: BridgeSyncRequest): Observable<BridgeSyncResponse> {
    return this.http.post<BridgeSyncResponse>(`${this.baseUrl}/api/v1/bridge/sync`, request);
  }

  getArtifacts(sourceId?: string): Observable<BronzeArtifactEntry[]> {
    const params = sourceId ? `?source_id=${encodeURIComponent(sourceId)}` : '';
    return this.http.get<BronzeArtifactEntry[]>(`${this.baseUrl}/api/v1/bridge/artifacts${params}`);
  }

  // Gatekeeper seguro (DRY_RUN por defecto) + batch + telemetría + deduplicación + delta
  evaluateGatekeeper(request: IngestionEvaluateRequest): Observable<IngestionEvaluateResponse> {
    return this.http.post<IngestionEvaluateResponse>(
      `${this.baseUrl}/api/v1/gatekeeper/evaluate`,
      { mode: 'DRY_RUN', ...request }
    );
  }

  evaluateGatekeeperBatch(
    request: BatchGatekeeperEvaluateRequest
  ): Observable<BatchGatekeeperEvaluateResponse> {
    return this.http.post<BatchGatekeeperEvaluateResponse>(
      `${this.baseUrl}/api/v1/gatekeeper/evaluate-batch`,
      { mode: 'DRY_RUN', ...request }
    );
  }

  getGatekeeperMetrics(): Observable<GatekeeperMetricsResponse> {
    return this.http.get<GatekeeperMetricsResponse>(`${this.baseUrl}/api/v1/gatekeeper/metrics`);
  }

  getDeduplicationAudit(
    limit: number = 100,
    criterion?: string,
    sourceId?: string
  ): Observable<DeduplicationAuditResponse> {
    let params = new HttpParams().set('limit', String(limit));
    if (criterion && criterion !== 'ALL') params = params.set('criterion', criterion);
    if (sourceId && sourceId !== 'ALL') params = params.set('source_id', sourceId);
    return this.http.get<DeduplicationAuditResponse>(
      `${this.baseUrl}/api/v1/gatekeeper/deduplication-audit`,
      { params }
    );
  }

  inspectDerivation(request: DerivationEvaluationRequest): Observable<DerivationEvaluationResult> {
    return this.http.post<DerivationEvaluationResult>(
      `${this.baseUrl}/api/v1/gatekeeper/inspect`,
      request
    );
  }

  enqueueMissingPeriods(
    request: EnqueueMissingPeriodsRequest
  ): Observable<EnqueueMissingPeriodsResponse> {
    return this.http.post<EnqueueMissingPeriodsResponse>(
      `${this.baseUrl}/api/v1/gatekeeper/enqueue-missing`,
      request
    );
  }

  // Cola real de descargas, reintento, cancelación, disyuntores y SSE
  getDownloadsStatus(
    sourceId?: string,
    includeRecent: boolean = true
  ): Observable<DownloadsStatusListResponse> {
    let params = new HttpParams().set('include_recent', includeRecent.toString());
    if (sourceId && sourceId !== 'ALL') {
      params = params.set('source_id', sourceId);
    }
    return this.http.get<DownloadsStatusListResponse>(`${this.baseUrl}/api/v1/downloads/status`, {
      params
    });
  }

  enqueueDownload(request: EnqueueDownloadRequest): Observable<DownloadStatusItem> {
    return this.http.post<DownloadStatusItem>(`${this.baseUrl}/api/v1/downloads/queue`, {
      status: 'QUEUED',
      execute_now: true,
      ...request
    });
  }

  retryDownload(downloadId: string): Observable<DownloadStatusItem> {
    return this.http.post<DownloadStatusItem>(
      `${this.baseUrl}/api/v1/downloads/${encodeURIComponent(downloadId)}/retry`,
      {}
    );
  }

  cancelDownload(downloadId: string): Observable<DownloadStatusItem> {
    return this.http.post<DownloadStatusItem>(
      `${this.baseUrl}/api/v1/downloads/${encodeURIComponent(downloadId)}/cancel`,
      {}
    );
  }

  getDownloadCircuitBreakers(): Observable<{ domains: DomainCircuitStatus[] }> {
    return this.http.get<{ domains: DomainCircuitStatus[] }>(
      `${this.baseUrl}/api/v1/downloads/circuit-breakers`
    );
  }

  buildDownloadsStreamUrl(): string {
    return `${this.baseUrl}/api/v1/downloads/stream`;
  }

  getCircuitBreaker(domain: string): Observable<DomainCircuitStatus> {
    return this.http.get<DomainCircuitStatus>(
      `${this.baseUrl}/api/v1/bridge/circuit-breaker/${encodeURIComponent(domain)}`
    );
  }

  resetCircuitBreaker(
    domain: string
  ): Observable<{ status: string; domain: string; message: string }> {
    return this.http.post<{ status: string; domain: string; message: string }>(
      `${this.baseUrl}/api/v1/bridge/circuit-breaker/${encodeURIComponent(domain)}/reset`,
      {}
    );
  }

  // Custodia directa, perfilado técnico automático y búsqueda global por columna
  buildAssetDownloadUrl(assetId: string): string {
    return `${this.baseUrl}/api/v1/catalog/assets/${encodeURIComponent(assetId)}/download`;
  }

  getAssetProfile(assetId: string, refresh: boolean = false): Observable<AssetTechnicalProfile> {
    const params = new HttpParams().set('refresh', refresh.toString());
    return this.http.get<AssetTechnicalProfile>(
      `${this.baseUrl}/api/v1/catalog/assets/${encodeURIComponent(assetId)}/profile`,
      { params }
    );
  }

  searchGlobalCatalog(filters: {
    column?: string;
    q?: string;
    source_id?: string;
    extension?: string;
    sha256?: string;
    limit?: number;
  }): Observable<GlobalCatalogSearchResponse> {
    let params = new HttpParams();
    if (filters.column && filters.column.trim()) params = params.set('column', filters.column.trim());
    if (filters.q && filters.q.trim()) params = params.set('q', filters.q.trim());
    if (filters.source_id && filters.source_id !== 'ALL') {
      params = params.set('source_id', filters.source_id);
    }
    if (filters.extension && filters.extension !== 'ALL') {
      params = params.set('extension', filters.extension);
    }
    if (filters.sha256 && filters.sha256.trim()) params = params.set('sha256', filters.sha256.trim());
    if (filters.limit) params = params.set('limit', String(filters.limit));
    return this.http.get<GlobalCatalogSearchResponse>(`${this.baseUrl}/api/v1/catalog/search`, {
      params
    });
  }

  // Inventario centralizado de enlaces
  getInventoryStats(): Observable<InventoryStatsResponse> {
    return this.http.get<InventoryStatsResponse>(`${this.baseUrl}/api/v1/inventory/stats`);
  }

  getInventoryUrls(
    filters: {
      source_id?: string;
      status_filter?: string;
      is_downloaded?: boolean | null;
      is_processed?: boolean | null;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Observable<UrlInventoryResponse> {
    let params = new HttpParams();
    if (filters.source_id && filters.source_id !== 'ALL') {
      params = params.set('source_id', filters.source_id);
    }
    if (filters.status_filter && filters.status_filter !== 'ALL') {
      params = params.set('status_filter', filters.status_filter);
    }
    if (filters.is_downloaded !== undefined && filters.is_downloaded !== null) {
      params = params.set('is_downloaded', filters.is_downloaded.toString());
    }
    if (filters.is_processed !== undefined && filters.is_processed !== null) {
      params = params.set('is_processed', filters.is_processed.toString());
    }
    if (filters.search && filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<UrlInventoryResponse>(`${this.baseUrl}/api/v1/inventory/urls`, { params });
  }

  updateInventoryUrl(
    idOrHash: string | number,
    request: UpdateUrlInventoryRequest
  ): Observable<UrlInventoryItem> {
    return this.http.patch<UrlInventoryItem>(
      `${this.baseUrl}/api/v1/inventory/urls/${encodeURIComponent(idOrHash.toString())}`,
      request
    );
  }

  checkHealth(): Observable<{ status: string; service: string; version: string }> {
    return this.http.get<{ status: string; service: string; version: string }>(
      `${this.baseUrl}/health`
    );
  }
}
