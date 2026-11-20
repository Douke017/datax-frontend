import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AlertChannelConfig,
  AlertDeliveryLog,
  AlertLifecycleUpdateRequest,
  AlertStatus,
  BackupSyncResult,
  CancelRunResponse,
  CatalogResource,
  CatalogSource,
  ContingencyCandidate,
  ContingencyEvaluationResponse,
  DryRunExtractionResponse,
  DryRunPolicyRequest,
  FailoverEvent,
  FileProcessingStatus,
  MaintenanceTechnicalReport,
  OpenDiscoveryCandidate,
  OpenDiscoverySearchRequest,
  PagedResourcesResult,
  PromoteCandidateRequest,
  ResilienceCoverageReport,
  ResourceStatusAuditEvent,
  ResourceStatusUpdatePayload,
  ResourceVersion,
  RunReport,
  SourcePolicyUpdate,
  StorageStatus,
  StructuralAlert,
  TriggerRunResponse
} from '../models/catalog.model';

export interface ResourceQueryOptions {
  sourceId?: string;
  search?: string;
  extension?: string;
  processingStatus?: FileProcessingStatus | 'ALL';
  resourceCategory?: string;
  sortBy?:
    | 'discovered_at'
    | 'title'
    | 'source_id'
    | 'file_extension'
    | 'content_length_bytes'
    | 'current_version'
    | 'processing_status';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExternoService {
  private readonly http = inject(HttpClient);
  readonly baseUrl =
    typeof window !== 'undefined' && window.location?.hostname
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000';

  getSources(): Observable<CatalogSource[]> {
    return this.http.get<CatalogSource[]>(`${this.baseUrl}/catalog/sources`);
  }

  updateSourcePolicy(sourceId: string, update: SourcePolicyUpdate): Observable<CatalogSource> {
    return this.http.patch<CatalogSource>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}`,
      update
    );
  }

  dryRunSource(
    sourceId: string,
    payload: DryRunPolicyRequest
  ): Observable<DryRunExtractionResponse> {
    return this.http.post<DryRunExtractionResponse>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}/dry-run`,
      payload
    );
  }

  getStorageStatus(): Observable<StorageStatus> {
    return this.http.get<StorageStatus>(`${this.baseUrl}/catalog/storage/status`);
  }

  triggerStorageBackup(): Observable<BackupSyncResult> {
    return this.http.post<BackupSyncResult>(`${this.baseUrl}/catalog/storage/sync-backup`, {});
  }

  getResources(
    sourceId?: string,
    search?: string,
    limit?: number,
    extension?: string,
    processingStatus?: FileProcessingStatus | 'ALL'
  ): Observable<CatalogResource[]> {
    return this.getResourcesPaged({
      sourceId,
      search,
      limit,
      extension,
      processingStatus
    }).pipe(map((r) => r.items));
  }

  getResourcesPaged(options: ResourceQueryOptions = {}): Observable<PagedResourcesResult> {
    let params = new HttpParams();
    if (options.limit !== undefined && options.limit !== null) {
      params = params.set('limit', String(options.limit));
    }
    if (options.offset !== undefined && options.offset > 0) {
      params = params.set('offset', String(options.offset));
    }
    if (options.sourceId && options.sourceId !== 'ALL') {
      params = params.set('source_id', options.sourceId);
    }
    if (options.search && options.search.trim()) {
      params = params.set('search', options.search.trim());
    }
    if (options.extension && options.extension !== 'ALL') {
      params = params.set('extension', options.extension);
    }
    if (options.processingStatus && options.processingStatus !== 'ALL') {
      params = params.set('processing_status', options.processingStatus);
    }
    if (options.resourceCategory && options.resourceCategory !== 'ALL') {
      params = params.set('resource_category', options.resourceCategory);
    }
    if (options.sortBy) {
      params = params.set('sort_by', options.sortBy);
      params = params.set('sort_dir', options.sortDir || 'asc');
    }

    return this.http
      .get<CatalogResource[]>(`${this.baseUrl}/catalog/resources`, {
        params,
        observe: 'response'
      })
      .pipe(
        map((resp) => {
          const items = resp.body || [];
          const headerTotal = resp.headers.get('X-Total-Count');
          const total = headerTotal ? parseInt(headerTotal, 10) : items.length;
          return {
            items,
            total: Number.isNaN(total) ? items.length : total
          };
        })
      );
  }

  buildExportResourcesUrl(
    format: 'jsonl' | 'csv' | 'parquet',
    options: ResourceQueryOptions = {}
  ): string {
    const params = new URLSearchParams();
    params.set('format', format);
    if (options.sourceId && options.sourceId !== 'ALL') params.set('source_id', options.sourceId);
    if (options.search && options.search.trim()) params.set('search', options.search.trim());
    if (options.extension && options.extension !== 'ALL') params.set('extension', options.extension);
    if (options.processingStatus && options.processingStatus !== 'ALL') {
      params.set('processing_status', options.processingStatus);
    }
    if (options.resourceCategory && options.resourceCategory !== 'ALL') {
      params.set('resource_category', options.resourceCategory);
    }
    return `${this.baseUrl}/catalog/resources/export?${params.toString()}`;
  }

  getResourceVersions(resourceKey: string): Observable<ResourceVersion[]> {
    return this.http.get<ResourceVersion[]>(
      `${this.baseUrl}/catalog/resources/${encodeURIComponent(resourceKey)}/versions`
    );
  }

  getResourceAudit(resourceKey: string): Observable<ResourceStatusAuditEvent[]> {
    return this.http.get<ResourceStatusAuditEvent[]>(
      `${this.baseUrl}/catalog/resources/${encodeURIComponent(resourceKey)}/audit`
    );
  }

  updateResourceProcessingStatus(
    resourceKey: string,
    payload: ResourceStatusUpdatePayload
  ): Observable<CatalogResource> {
    return this.http.patch<CatalogResource>(
      `${this.baseUrl}/catalog/resources/${encodeURIComponent(resourceKey)}/status`,
      payload
    );
  }

  triggerExtractionRun(
    sourceId?: string | null,
    force: boolean = true
  ): Observable<TriggerRunResponse> {
    return this.http.post<TriggerRunResponse>(`${this.baseUrl}/runs`, {
      source_id: sourceId ?? null,
      force
    });
  }

  cancelRun(runId: string): Observable<CancelRunResponse> {
    return this.http.post<CancelRunResponse>(
      `${this.baseUrl}/runs/${encodeURIComponent(runId)}/cancel`,
      {}
    );
  }

  buildRunStreamUrl(runId: string): string {
    return `${this.baseUrl}/runs/${encodeURIComponent(runId)}/stream`;
  }

  getRuns(limit: number = 25): Observable<RunReport[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RunReport[]>(`${this.baseUrl}/runs`, { params });
  }

  // Exploración automatizada en web abierta
  runOpenDiscovery(
    request: OpenDiscoverySearchRequest,
    liveProbe: boolean = true
  ): Observable<OpenDiscoveryCandidate[]> {
    const params = new HttpParams().set('live_probe', liveProbe.toString());
    return this.http.post<OpenDiscoveryCandidate[]>(
      `${this.baseUrl}/discovery/open-search`,
      request,
      { params }
    );
  }

  getDiscoveryCandidates(includeDiscarded: boolean = false): Observable<OpenDiscoveryCandidate[]> {
    const params = new HttpParams().set('include_discarded', includeDiscarded.toString());
    return this.http.get<OpenDiscoveryCandidate[]>(`${this.baseUrl}/discovery/candidates`, {
      params
    });
  }

  promoteDiscoveryCandidate(
    candidateId: string,
    request: PromoteCandidateRequest
  ): Observable<CatalogSource> {
    return this.http.post<CatalogSource>(
      `${this.baseUrl}/discovery/candidates/${encodeURIComponent(candidateId)}/promote`,
      request
    );
  }

  discardDiscoveryCandidate(
    candidateId: string,
    reason: string
  ): Observable<OpenDiscoveryCandidate> {
    return this.http.post<OpenDiscoveryCandidate>(
      `${this.baseUrl}/discovery/candidates/${encodeURIComponent(candidateId)}/discard`,
      { reason }
    );
  }

  reactivateDiscoveryCandidate(candidateId: string): Observable<OpenDiscoveryCandidate> {
    return this.http.post<OpenDiscoveryCandidate>(
      `${this.baseUrl}/discovery/candidates/${encodeURIComponent(candidateId)}/reactivate`,
      {}
    );
  }

  // Resiliencia de fuentes y contingencias
  discoverSourceContingencies(
    sourceId: string,
    autoRegister: boolean = true
  ): Observable<ContingencyEvaluationResponse> {
    const params = new HttpParams().set('auto_register', autoRegister.toString());
    return this.http.post<ContingencyEvaluationResponse>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}/contingency/discover`,
      {},
      { params }
    );
  }

  probeContingencyUrl(sourceId: string, url: string): Observable<ContingencyCandidate> {
    return this.http.post<ContingencyCandidate>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}/contingency/probe`,
      { url }
    );
  }

  getResilienceCoverage(): Observable<ResilienceCoverageReport> {
    return this.http.get<ResilienceCoverageReport>(`${this.baseUrl}/catalog/resilience/coverage`);
  }

  getSourceFailovers(sourceId: string, limit: number = 50): Observable<FailoverEvent[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<FailoverEvent[]>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}/failovers`,
      { params }
    );
  }

  getAllFailovers(limit: number = 50): Observable<FailoverEvent[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<FailoverEvent[]>(`${this.baseUrl}/catalog/failovers`, { params });
  }

  // Monitoreo estructural, ciclo de vida de alertas y canales push
  getStructuralAlerts(
    sourceId?: string,
    status?: AlertStatus | 'ALL'
  ): Observable<StructuralAlert[]> {
    let params = new HttpParams();
    if (sourceId && sourceId !== 'ALL') {
      params = params.set('source_id', sourceId);
    }
    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }
    return this.http.get<StructuralAlert[]>(`${this.baseUrl}/alerts`, { params });
  }

  updateAlertLifecycle(
    alertId: string,
    payload: AlertLifecycleUpdateRequest
  ): Observable<StructuralAlert> {
    return this.http.patch<StructuralAlert>(
      `${this.baseUrl}/alerts/${encodeURIComponent(alertId)}`,
      payload
    );
  }

  getAlertChannels(): Observable<AlertChannelConfig[]> {
    return this.http.get<AlertChannelConfig[]>(`${this.baseUrl}/alerts/channels`);
  }

  saveAlertChannel(channel: AlertChannelConfig): Observable<AlertChannelConfig> {
    return this.http.post<AlertChannelConfig>(`${this.baseUrl}/alerts/channels`, channel);
  }

  deleteAlertChannel(channelId: string): Observable<{ deleted: boolean; channel_id: string }> {
    return this.http.delete<{ deleted: boolean; channel_id: string }>(
      `${this.baseUrl}/alerts/channels/${encodeURIComponent(channelId)}`
    );
  }

  testAlertChannel(channelId: string): Observable<AlertDeliveryLog> {
    return this.http.post<AlertDeliveryLog>(
      `${this.baseUrl}/alerts/channels/${encodeURIComponent(channelId)}/test`,
      {}
    );
  }

  verifySourceStructure(sourceId: string): Observable<MaintenanceTechnicalReport> {
    return this.http.post<MaintenanceTechnicalReport>(
      `${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}/verify-structure`,
      {}
    );
  }

  getMaintenanceReport(sourceId: string): Observable<MaintenanceTechnicalReport> {
    return this.http.get<MaintenanceTechnicalReport>(
      `${this.baseUrl}/alerts/${encodeURIComponent(sourceId)}/report`
    );
  }

  checkHealth(): Observable<{ status: string; service: string }> {
    return this.http.get<{ status: string; service: string }>(`${this.baseUrl}/health`);
  }
}
