import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InternoStore } from '../interno.store';
import { InventoryStore } from '../inventory.store';
import { IngestionEvaluateRequest } from '../../../core/models/reconciliation.model';

@Component({
  selector: 'app-interno-gatekeeper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interno-gatekeeper.component.html',
  styleUrl: './interno-gatekeeper.component.css'
})
export class InternoGatekeeperComponent {
  readonly store = inject(InternoStore);
  readonly inventoryStore = inject(InventoryStore);

  readonly selectedSource = signal<string>('bbv');
  readonly searchQuery = signal<string>('');
  readonly forceRefresh = signal<boolean>(false);

  readonly datasetCode = signal<string>('DS_BO_BBV');
  readonly domain = signal<string>('www.bbv.com.bo');
  readonly targetUrl = signal<string>('https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf');
  readonly period = signal<string>('2024');

  readonly sources = computed(() => {
    const list = this.inventoryStore.sourcesList();
    if (list.length > 0) return list;
    return ['bbv', 'bcb', 'finrural', 'asfi', 'bmsc', 'bnb', 'bisa', 'ganadero'];
  });

  onSourceSelect(event: Event): void {
    const src = (event.target as HTMLSelectElement).value;
    this.selectedSource.set(src);
    this.datasetCode.set(`DS_BO_${src.toUpperCase()}`);
    this.domain.set(`www.${src.toLowerCase()}.com.bo`);
    this.targetUrl.set(`https://www.${src.toLowerCase()}.com.bo/data/reporte_${this.period()}.pdf`);
    this.onEvaluate();
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
        return 'Actualmente otro proceso o analista está adquiriendo este documento. El sistema enlazará su solicitud al archivo en cuanto finalice.';
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
