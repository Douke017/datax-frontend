import { Component, inject, signal } from '@angular/core';
import { InternoStore } from '../interno.store';
import { IngestionEvaluateRequest } from '../../../core/models/reconciliation.model';

@Component({
  selector: 'app-interno-gatekeeper',
  standalone: true,
  templateUrl: './interno-gatekeeper.component.html',
  styleUrl: './interno-gatekeeper.component.css'
})
export class InternoGatekeeperComponent {
  readonly store = inject(InternoStore);

  readonly datasetCode = signal<string>('DS_BO_BBV');
  readonly domain = signal<string>('www.bbv.com.bo');
  readonly targetUrl = signal<string>('https://www.bbv.com.bo/estadisticas/boletin_2026_08.pdf');
  readonly period = signal<string>('LATEST');
  readonly forceRefresh = signal<boolean>(false);

  applyPreset(preset: 'bcb-cached' | 'bbv-cached' | 'finrural-cached' | 'new-report' | 'force-audit'): void {
    switch (preset) {
      case 'bcb-cached':
        this.datasetCode.set('DS_BO_BCB');
        this.domain.set('www.bcb.gob.bo');
        this.targetUrl.set('https://www.bcb.gob.bo/webdocs/publicacionesbcb/2025/12/31/01_01.xlsx');
        this.period.set('2025');
        this.forceRefresh.set(false);
        break;
      case 'bbv-cached':
        this.datasetCode.set('DS_BO_BBV');
        this.domain.set('www.bbv.com.bo');
        this.targetUrl.set('https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf');
        this.period.set('LATEST');
        this.forceRefresh.set(false);
        break;
      case 'finrural-cached':
        this.datasetCode.set('DS_BO_FINRURAL');
        this.domain.set('www.finrural.org.bo');
        this.targetUrl.set('https://www.finrural.org.bo/descargas/cartera_2026_01.pdf');
        this.period.set('2026-01');
        this.forceRefresh.set(false);
        break;
      case 'new-report':
        this.datasetCode.set('DS_BO_BCB');
        this.domain.set('www.bcb.gob.bo');
        this.targetUrl.set('https://www.bcb.gob.bo/publicaciones/boletin_nuevo_octubre_2026.pdf');
        this.period.set('2026-10');
        this.forceRefresh.set(false);
        break;
      case 'force-audit':
        this.datasetCode.set('DS_BO_BBV');
        this.domain.set('www.bbv.com.bo');
        this.targetUrl.set('https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf');
        this.period.set('LATEST');
        this.forceRefresh.set(true);
        break;
    }
    this.onEvaluate();
  }

  getVerdictTitle(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_BRONZE':
      case 'CACHE_HIT_GOLD':
        return 'DOCUMENTO YA RESGUARDADO (DESCARGA EVITADA)';
      case 'PROCEED_DOWNLOAD':
        return 'AUTORIZACIÓN DE DESCARGA CONCEDIDA';
      case 'IN_FLIGHT_LOCKED':
      case 'IN_PROGRESS':
        return 'BLOQUEO ACTIVO (DESCARGA EN TRÁNSITO)';
      case 'REUSE_DERIVATION':
        return 'REUTILIZACIÓN DIRECTA DE INFORMACIÓN CONSOLIDADA';
      default:
        return verdict;
    }
  }

  onEvaluate(): void {
    const req: IngestionEvaluateRequest = {
      dataset_code: this.datasetCode(),
      domain: this.domain(),
      target_url: this.targetUrl(),
      period: this.period(),
      force_refresh: this.forceRefresh()
    };
    this.store.evaluateAdmission(req);
  }
}
