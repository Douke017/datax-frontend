import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BridgeReconcileRequest,
  BridgeReconcileResponse,
  BridgeSyncRequest,
  BridgeSyncResponse,
  BronzeArtifactEntry,
  DerivationEvaluationRequest,
  DerivationEvaluationResult,
  DomainCircuitStatus,
  DownloadStatusItem,
  DownloadsStatusListResponse,
  EnqueueDownloadRequest,
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
  private readonly baseUrl =
    typeof window !== 'undefined' && window.location?.hostname
      ? `http://${window.location.hostname}:8001`
      : 'http://localhost:8001';

  reconcile(request: BridgeReconcileRequest): Observable<BridgeReconcileResponse> {
    return this.http.post<BridgeReconcileResponse>(`${this.baseUrl}/api/v1/bridge/reconcile`, request);
  }

  sync(request: BridgeSyncRequest): Observable<BridgeSyncResponse> {
    return this.http.post<BridgeSyncResponse>(`${this.baseUrl}/api/v1/bridge/sync`, request);
  }

  getArtifacts(sourceId?: string): Observable<BronzeArtifactEntry[]> {
    const params = sourceId ? `?source_id=${encodeURIComponent(sourceId)}` : '';
    return this.http.get<BronzeArtifactEntry[]>(`${this.baseUrl}/api/v1/bridge/artifacts${params}`);
  }

  evaluateGatekeeper(request: IngestionEvaluateRequest): Observable<IngestionEvaluateResponse> {
    return this.http.post<IngestionEvaluateResponse>(`${this.baseUrl}/api/v1/gatekeeper/evaluate`, request);
  }

  inspectDerivation(request: DerivationEvaluationRequest): Observable<DerivationEvaluationResult> {
    return this.http.post<DerivationEvaluationResult>(`${this.baseUrl}/api/v1/gatekeeper/inspect`, request);
  }

  getDownloadsStatus(sourceId?: string, includeRecent: boolean = true): Observable<DownloadsStatusListResponse> {
    let params = new HttpParams().set('include_recent', includeRecent.toString());
    if (sourceId && sourceId !== 'ALL') {
      params = params.set('source_id', sourceId);
    }
    return this.http.get<DownloadsStatusListResponse>(`${this.baseUrl}/api/v1/downloads/status`, { params });
  }

  enqueueDownload(request: EnqueueDownloadRequest): Observable<DownloadStatusItem> {
    return this.http.post<DownloadStatusItem>(`${this.baseUrl}/api/v1/downloads/queue`, request);
  }

  getCircuitBreaker(domain: string): Observable<DomainCircuitStatus> {
    return this.http.get<DomainCircuitStatus>(
      `${this.baseUrl}/api/v1/bridge/circuit-breaker/${encodeURIComponent(domain)}`
    );
  }

  resetCircuitBreaker(domain: string): Observable<{ status: string; domain: string; message: string }> {
    return this.http.post<{ status: string; domain: string; message: string }>(
      `${this.baseUrl}/api/v1/bridge/circuit-breaker/${encodeURIComponent(domain)}/reset`,
      {}
    );
  }

  getInventoryStats(): Observable<InventoryStatsResponse> {
    return this.http.get<InventoryStatsResponse>(`${this.baseUrl}/api/v1/inventory/stats`);
  }

  getInventoryUrls(filters: {
    source_id?: string;
    status_filter?: string;
    is_downloaded?: boolean | null;
    is_processed?: boolean | null;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<UrlInventoryResponse> {
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
    return this.http.get<{ status: string; service: string; version: string }>(`${this.baseUrl}/health`);
  }
}
