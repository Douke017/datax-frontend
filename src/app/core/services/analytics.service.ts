import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FinancialMetricDefinition,
  SemanticDictionaryResponse,
  PredefinedViewMetadata,
  PredefinedViewQueryRequest,
  PredefinedViewResult,
  GoldDimensions,
  MaterializeGoldResponse
} from '../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8001';

  getSemanticMetrics(): Observable<SemanticDictionaryResponse> {
    return this.http.get<SemanticDictionaryResponse>(`${this.baseUrl}/api/v1/dictionary/metrics`);
  }

  getMetricDetail(metricCode: string): Observable<FinancialMetricDefinition> {
    return this.http.get<FinancialMetricDefinition>(
      `${this.baseUrl}/api/v1/dictionary/metrics/${encodeURIComponent(metricCode)}`
    );
  }

  getDimensions(datamart: string = 'mart_cartera'): Observable<GoldDimensions> {
    return this.http.get<GoldDimensions>(
      `${this.baseUrl}/api/v1/analytics/dimensions?datamart=${encodeURIComponent(datamart)}`
    );
  }

  getPredefinedViews(): Observable<PredefinedViewMetadata[]> {
    return this.http.get<PredefinedViewMetadata[]>(`${this.baseUrl}/api/v1/analytics/views`);
  }

  getPredefinedView(viewId: string): Observable<PredefinedViewMetadata> {
    return this.http.get<PredefinedViewMetadata>(
      `${this.baseUrl}/api/v1/analytics/views/${encodeURIComponent(viewId)}`
    );
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

  materializeGold(): Observable<MaterializeGoldResponse> {
    return this.http.post<MaterializeGoldResponse>(`${this.baseUrl}/api/v1/analytics/materialize`, {});
  }
}
