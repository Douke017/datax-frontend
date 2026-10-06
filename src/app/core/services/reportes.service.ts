import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AuditMetrics,
  DetectedGap,
  ReconcileThreeWayRequest,
  RescueGapRequest,
  SourceAuditSummary
} from '../models/audit.model';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8002';

  getSources(): Observable<SourceAuditSummary[]> {
    return this.http.get<SourceAuditSummary[]>(`${this.baseUrl}/api/v1/audit/sources`);
  }

  getSourceAudit(sourceId: string): Observable<SourceAuditSummary> {
    return this.http.get<SourceAuditSummary>(`${this.baseUrl}/api/v1/audit/sources/${sourceId}`);
  }

  getKpiMetrics(): Observable<AuditMetrics[]> {
    return this.http.get<AuditMetrics[]>(`${this.baseUrl}/api/v1/audit/metrics/kpi`);
  }

  reconcileThreeWay(request: ReconcileThreeWayRequest): Observable<SourceAuditSummary> {
    return this.http.post<SourceAuditSummary>(`${this.baseUrl}/api/v1/audit/reconcile-three-way`, request);
  }

  rescueGap(request: RescueGapRequest): Observable<DetectedGap> {
    return this.http.post<DetectedGap>(`${this.baseUrl}/api/v1/audit/rescue`, request);
  }

  checkHealth(): Observable<{ status: string; service: string; version: string }> {
    return this.http.get<{ status: string; service: string; version: string }>(`${this.baseUrl}/health`);
  }
}
