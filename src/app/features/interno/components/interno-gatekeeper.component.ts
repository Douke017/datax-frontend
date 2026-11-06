import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InternoStore } from '../interno.store';
import { IngestionEvaluateRequest } from '../../../core/models/reconciliation.model';

export interface SampleDoc {
  id: string;
  label: string;
  entity: string;
  code: string;
  domain: string;
  url: string;
  period: string;
}

@Component({
  selector: 'app-interno-gatekeeper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interno-gatekeeper.component.html',
  styleUrl: './interno-gatekeeper.component.css'
})
export class InternoGatekeeperComponent {
  readonly store = inject(InternoStore);

  readonly sampleDocuments: SampleDoc[] = [
    {
      id: 'bbv-tarifario',
      label: 'Tarifario Oficial y Registro de Emisiones',
      entity: 'Bolsa Boliviana de Valores (BBV)',
      code: 'DS_BO_BBV',
      domain: 'www.bbv.com.bo',
      url: 'https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf',
      period: '2024'
    },
    {
      id: 'bcb-boletin',
      label: 'Boletín Estadístico de Liquidez del Sistema Financiero',
      entity: 'Banco Central de Bolivia (BCB)',
      code: 'DS_BO_BCB',
      domain: 'www.bcb.gob.bo',
      url: 'https://www.bcb.gob.bo/webdocs/publicacionesbcb/2025/12/31/01_01.xlsx',
      period: '2025'
    },
    {
      id: 'finrural-cartera',
      label: 'Estados Financieros y Cartera Institucional',
      entity: 'FINRURAL',
      code: 'DS_BO_FINRURAL',
      domain: 'www.finrural.org.bo',
      url: 'https://www.finrural.org.bo/descargas/cartera_2026_01.pdf',
      period: '2026-01'
    },
    {
      id: 'asfi-nuevo',
      label: 'Boletín Mensual de Entidades Financieras',
      entity: 'Autoridad de Supervisión del Sistema Financiero (ASFI)',
      code: 'DS_BO_ASFI',
      domain: 'www.asfi.gob.bo',
      url: 'https://www.asfi.gob.bo/publicaciones/boletin_cierre_2026.pdf',
      period: '2026-12'
    }
  ];

  readonly datasetCode = signal<string>('DS_BO_BBV');
  readonly domain = signal<string>('www.bbv.com.bo');
  readonly targetUrl = signal<string>('https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf');
  readonly period = signal<string>('2024');
  readonly forceRefresh = signal<boolean>(false);
  readonly selectedSampleId = signal<string>('bbv-tarifario');

  selectSample(docId: string): void {
    this.selectedSampleId.set(docId);
    const doc = this.sampleDocuments.find((d) => d.id === docId);
    if (doc) {
      this.datasetCode.set(doc.code);
      this.domain.set(doc.domain);
      this.targetUrl.set(doc.url);
      this.period.set(doc.period);
      this.forceRefresh.set(false);
      this.onEvaluate();
    }
  }

  getVerdictTitle(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_BRONZE':
        return 'DOCUMENTO EN CUSTODIA LOCAL (DESCARGA REDUNDANTE EVITADA)';
      case 'CACHE_HIT_GOLD':
      case 'REUSE_DERIVATION':
        return 'INFORMACIÓN CONSOLIDADA EN DATAMARTS (DISPONIBLE EN CAPA GOLD)';
      case 'PROCEED_DOWNLOAD':
        return 'DOCUMENTO NO RESGUARDADO (AUTORIZADO PARA DESCARGA)';
      case 'IN_FLIGHT_LOCKED':
      case 'IN_PROGRESS':
        return 'DESCARGA EN PROCESO POR OTRO PROCESO (EN COLA)';
      default:
        return 'VALIDACIÓN DE ADMISIÓN COMPLETADA';
    }
  }

  getVerdictRecommendation(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_GOLD':
      case 'REUSE_DERIVATION':
        return 'Los datos de este periodo ya se encuentran estructurados en los Datamarts analíticos. Se recomienda consultarlos directamente desde la pestaña de Activos Analíticos sin disparar descargas de archivos.';
      case 'CACHE_HIT_BRONZE':
        return 'El archivo original ya está en el repositorio de custodia física en el servidor. Puede consultarse de inmediato sin tráfico de red.';
      case 'IN_PROGRESS':
      case 'IN_FLIGHT_LOCKED':
        return 'Actualmente otro analista o tarea automatizada está adquiriendo este documento. El sistema enlazará su solicitud al archivo en cuanto finalice.';
      case 'PROCEED_DOWNLOAD':
        return 'El documento aún no forma parte del inventario local. Puede proceder al resguardo asistido desde la pestaña de Custodia de Archivos.';
      default:
        return 'Consulte el diagnóstico detallado para verificar el estado de adquisición.';
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
