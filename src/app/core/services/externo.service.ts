import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogResource, CatalogSource, RunReport } from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class ExternoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8000'; // Puerto oficial de Prospector Externo Catalog API Facade

  getSources(): Observable<CatalogSource[]> {
    return this.http.get<CatalogSource[]>(`${this.baseUrl}/catalog/sources`);
  }

  getResources(sourceId?: string, search?: string, limit?: number): Observable<CatalogResource[]> {
    let params = new HttpParams();
    if (limit !== undefined && limit !== null) {
      params = params.set('limit', limit.toString());
    }
    if (sourceId && sourceId !== 'ALL') {
      params = params.set('source_id', sourceId);
    }
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<CatalogResource[]>(`${this.baseUrl}/catalog/resources`, { params });
  }

  getRuns(limit: number = 20): Observable<RunReport[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<RunReport[]>(`${this.baseUrl}/runs`, { params });
  }

  checkHealth(): Observable<{ status: string; service: string }> {
    return this.http.get<{ status: string; service: string }>(`${this.baseUrl}/health`);
  }
}
