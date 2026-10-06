import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BridgeReconcileRequest,
  BridgeReconcileResponse,
  BridgeSyncRequest,
  BridgeSyncResponse,
  BronzeArtifactEntry
} from '../models/reconciliation.model';

@Injectable({
  providedIn: 'root'
})
export class InternoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8001';

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

  checkHealth(): Observable<{ status: string; service: string; version: string }> {
    return this.http.get<{ status: string; service: string; version: string }>(`${this.baseUrl}/health`);
  }
}
