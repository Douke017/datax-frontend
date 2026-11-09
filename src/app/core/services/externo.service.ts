import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BackupSyncResult,
  CatalogResource,
  CatalogSource,
  ContingencyEvaluationResponse,
  FileProcessingStatus,
  MaintenanceTechnicalReport,
  OpenDiscoveryCandidate,
  OpenDiscoverySearchRequest,
  PromoteCandidateRequest,
  RunReport,
  SourcePolicyUpdate,
  StorageStatus,
  StructuralAlert,
  TriggerRunResponse
} from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class ExternoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    typeof window !== 'undefined' && window.location?.hostname
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000';

  getSources(): Observable<CatalogSource[]> {
    return this.http.get<CatalogSource[]>(`${this.baseUrl}/catalog/sources`);
  }

  updateSourcePolicy(sourceId: string, update: SourcePolicyUpdate): Observable<CatalogSource> {
    return this.http.patch<CatalogSource>(`${this.baseUrl}/catalog/sources/${encodeURIComponent(sourceId)}`, update);
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
    let params = new HttpParams();
    if (limit !== undefined && limit !== null) {
      params = params.set('limit', limit.toString());
    }
    if (sourceId && sourceId !== 'ALL') {
      params = params.set('source_id', sourceId);
    }
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (extension && extension !== 'ALL') {
      params = params.set('extension', extension);
    }
    if (processingStatus && processingStatus !== 'ALL') {
      params = params.set('processing_status', processingStatus);
    }

    return this.http.get<CatalogResource[]>(`${this.baseUrl}/catalog/resources`, { params });
  }

  updateResourceProcessingStatus(
    resourceKey: string,
    processingStatus: FileProcessingStatus,
    processingError?: string | null
  ): Observable<CatalogResource> {
    return this.http.patch<CatalogResource>(
      `${this.baseUrl}/catalog/resources/${encodeURIComponent(resourceKey)}/status`,
      {
        processing_status: processingStatus,
        processing_error: processingError ?? null
      }
    );
  }

  triggerExtractionRun(sourceId?: string | null, force: boolean = true): Observable<TriggerRunResponse> {
    return this.http.post<TriggerRunResponse>(`${this.baseUrl}/runs`, {
      source_id: sourceId ?? null,
      force
    });
  }

  getRuns(limit: number = 20): Observable<RunReport[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RunReport[]>(`${this.baseUrl}/runs`, { params });
  }

  // Exploración automatizada en web abierta (Objetivo 1)
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

  getDiscoveryCandidates(): Observable<OpenDiscoveryCandidate[]> {
    return this.http.get<OpenDiscoveryCandidate[]>(`${this.baseUrl}/discovery/candidates`);
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

  // Resiliencia de fuentes y descubrimiento de espejos (Objetivo 3)
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

  // Monitoreo estructural y alertas de mantenimiento (Objetivo 5)
  getStructuralAlerts(sourceId?: string): Observable<StructuralAlert[]> {
    let params = new HttpParams();
    if (sourceId && sourceId !== 'ALL') {
      params = params.set('source_id', sourceId);
    }
    return this.http.get<StructuralAlert[]>(`${this.baseUrl}/alerts`, { params });
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
