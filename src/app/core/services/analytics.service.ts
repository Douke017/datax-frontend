import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnalyticsQueryRequest,
  AnalyticsQueryResponse,
  CreateApiKeyRequest,
  DatamartDictionaryDetail,
  DatamartLineageEntry,
  DatamartRelationshipItem,
  DatamartSummaryItem,
  FinancialMetricDefinition,
  GoldDimensions,
  LineageIntegrityCheckResult,
  MaterializeGoldResponse,
  PredefinedViewMetadata,
  PredefinedViewQueryRequest,
  PredefinedViewResult,
  SelfServiceAccessLog,
  SelfServiceApiKey,
  SemanticDictionaryResponse
} from '../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = 'http://localhost:8001';

  getDatamartsSummary(): Observable<DatamartSummaryItem[]> {
    return this.http.get<DatamartSummaryItem[]>(`${this.baseUrl}/api/v1/analytics/datamarts`);
  }

  queryDatamart(request: AnalyticsQueryRequest): Observable<AnalyticsQueryResponse> {
    return this.http.post<AnalyticsQueryResponse>(`${this.baseUrl}/api/v1/analytics/query`, request);
  }

  getDimensions(datamart: string = 'mart_cartera'): Observable<GoldDimensions> {
    return this.http.get<GoldDimensions>(
      `${this.baseUrl}/api/v1/analytics/dimensions?datamart=${encodeURIComponent(datamart)}`
    );
  }

  getPredefinedViews(datamart: string = 'all'): Observable<PredefinedViewMetadata[]> {
    const params = new HttpParams().set('datamart', datamart);
    return this.http.get<PredefinedViewMetadata[]>(`${this.baseUrl}/api/v1/analytics/views`, { params });
  }

  executePredefinedView(
    viewId: string,
    request?: PredefinedViewQueryRequest
  ): Observable<PredefinedViewResult> {
    return this.http.post<PredefinedViewResult>(
      `${this.baseUrl}/api/v1/analytics/views/${encodeURIComponent(viewId)}/execute`,
      request || {}
    );
  }

  materializeGold(datamart?: string): Observable<MaterializeGoldResponse> {
    let params = new HttpParams();
    if (datamart) {
      params = params.set('datamart', datamart);
    }
    return this.http.post<MaterializeGoldResponse>(
      `${this.baseUrl}/api/v1/analytics/materialize`,
      {},
      { params }
    );
  }

  // Diccionario técnico dinámico, relaciones y métricas financieras (Objetivo 3)
  getDatamartDictionary(datamart: string): Observable<DatamartDictionaryDetail> {
    return this.http.get<DatamartDictionaryDetail>(
      `${this.baseUrl}/api/v1/dictionary/datamarts/${encodeURIComponent(datamart)}`
    );
  }

  getRelationships(datamart?: string): Observable<DatamartRelationshipItem[]> {
    let params = new HttpParams();
    if (datamart) {
      params = params.set('datamart', datamart);
    }
    return this.http.get<DatamartRelationshipItem[]>(`${this.baseUrl}/api/v1/dictionary/relationships`, {
      params
    });
  }

  getSemanticMetrics(): Observable<SemanticDictionaryResponse> {
    return this.http.get<SemanticDictionaryResponse>(`${this.baseUrl}/api/v1/dictionary/metrics`);
  }

  getMetricDetail(metricCode: string): Observable<FinancialMetricDefinition> {
    return this.http.get<FinancialMetricDefinition>(
      `${this.baseUrl}/api/v1/dictionary/metrics/${encodeURIComponent(metricCode)}`
    );
  }

  // Linaje y verificación criptográfica de integridad SHA-256 (Objetivo 3)
  getDatamartLineage(datamart: string, limit: number = 100): Observable<DatamartLineageEntry[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<DatamartLineageEntry[]>(
      `${this.baseUrl}/api/v1/catalog/lineage/datamart/${encodeURIComponent(datamart)}`,
      { params }
    );
  }

  verifyAssetIntegrity(assetId: string): Observable<LineageIntegrityCheckResult> {
    return this.http.get<LineageIntegrityCheckResult>(
      `${this.baseUrl}/api/v1/catalog/assets/${encodeURIComponent(assetId)}/verify`
    );
  }

  // Exportaciones autónomas (.xlsx de 3 hojas y CSV) y llaves API Power Query / Power BI (Objetivo 4)
  buildExportUrl(
    format: 'xlsx' | 'csv',
    options: {
      datamart: string;
      gestion?: number | null;
      mes?: number | null;
      institutionId?: string | null;
    }
  ): string {
    const params = new URLSearchParams();
    params.set('datamart', options.datamart);
    if (options.gestion !== null && options.gestion !== undefined) {
      params.set('gestion', String(options.gestion));
    }
    if (options.mes !== null && options.mes !== undefined) {
      params.set('mes', String(options.mes));
    }
    if (options.institutionId && options.institutionId !== 'ALL') {
      params.set('institution_id', options.institutionId);
    }
    return `${this.baseUrl}/api/v1/analytics/export/${format}?${params.toString()}`;
  }

  buildLiveFeedUrl(
    datamart: string,
    rawApiKey: string,
    format: 'csv' | 'json' = 'csv'
  ): string {
    return `${this.baseUrl}/api/v1/analytics/live-feed/${encodeURIComponent(datamart)}?format=${format}&api_key=${encodeURIComponent(rawApiKey)}`;
  }

  getApiKeys(): Observable<SelfServiceApiKey[]> {
    return this.http.get<SelfServiceApiKey[]>(`${this.baseUrl}/api/v1/analytics/keys`);
  }

  createApiKey(request: CreateApiKeyRequest): Observable<SelfServiceApiKey> {
    return this.http.post<SelfServiceApiKey>(`${this.baseUrl}/api/v1/analytics/keys`, request);
  }

  revokeApiKey(keyId: string): Observable<{ status: string; key_id: string }> {
    return this.http.delete<{ status: string; key_id: string }>(
      `${this.baseUrl}/api/v1/analytics/keys/${encodeURIComponent(keyId)}`
    );
  }

  getAccessLogs(limit: number = 25): Observable<SelfServiceAccessLog[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<SelfServiceAccessLog[]>(`${this.baseUrl}/api/v1/analytics/access-logs`, {
      params
    });
  }
}
