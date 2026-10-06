import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CatalogResource, CatalogSource } from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class ExternoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8000';

  getSources(): Observable<CatalogSource[]> {
    return this.http.get<CatalogSource[]>(`${this.baseUrl}/catalog/sources`);
  }

  getResources(sourceId?: string, search?: string, limit: number = 200): Observable<CatalogResource[]> {
    let params = new HttpParams().set('limit', limit.toString());
    if (sourceId) {
      params = params.set('source_id', sourceId);
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<CatalogResource[]>(`${this.baseUrl}/catalog/resources`, { params });
  }

  checkHealth(): Observable<{ status: string; service: string }> {
    return this.http.get<{ status: string; service: string }>(`${this.baseUrl}/health`);
  }
}
