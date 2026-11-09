import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InternoStore } from '../interno.store';
import { InventoryStore } from '../inventory.store';
import { IngestionEvaluateRequest } from '../../../core/models/reconciliation.model';
import { formatBytes, formatPercentage } from '../../../shared/utils/format.utils';

interface PresetScenario {
  id: string;
  label: string;
  entity: string;
  datasetCode: string;
  domain: string;
  period: string;
  targetUrl: string;
}

@Component({
  selector: 'app-interno-gatekeeper',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe],
  templateUrl: './interno-gatekeeper.component.html',
  styleUrl: './interno-gatekeeper.component.css'
})
export class InternoGatekeeperComponent implements OnInit {
  readonly store = inject(InternoStore);
  readonly inventoryStore = inject(InventoryStore);

  readonly formatSize = formatBytes;
  readonly formatPct = formatPercentage;

  readonly presets: PresetScenario[] = [
    {
      id: 'consolidated',
      label: 'Serie Ya Consolidada en Repositorio',
      entity: 'bcb',
      datasetCode: 'catalogo_series_files',
      domain: 'www.bcb.gob.bo',
      period: '2025-12',
      targetUrl: 'https://www.bcb.gob.bo/webdocs/estadisticas/boletin_mensual_2025_12.xlsx'
    },
    {
      id: 'derivable',
      label: 'Trimestre Construible desde Cortes Mensuales',
      entity: 'ine',
      datasetCode: 'catalogo_series_files',
      domain: 'www.ine.gob.bo',
      period: '2025-Q1',
      targetUrl: 'https://www.ine.gob.bo/estadisticas/serie_trimestral_2025_q1.xlsx'
    },
    {
      id: 'custody',
      label: 'Archivo en Bruto Resguardado con SHA-256',
      entity: 'bbv',
      datasetCode: 'DS_BO_BBV',
      domain: 'www.bbv.com.bo',
      period: '2024',
      targetUrl:
        'https://www.bbv.com.bo/wp-content/uploads/2024/10/137-tarifario-oficial-bbv.pdf'
    },
    {
      id: 'new_acq',
      label: 'Nuevo Archivo Fuente No Procesado',
      entity: 'asfi',
      datasetCode: 'D_BO_000000999',
      domain: 'www.asfi.gob.bo',
      period: '2026-12',
      targetUrl: 'https://www.asfi.gob.bo/boletines/estados_financieros_2026_12.xlsx'
    }
  ];

  readonly activePresetId = signal<string>('consolidated');

  selectedSource = 'bcb';
  datasetCode = 'catalogo_series_files';
  domain = 'www.bcb.gob.bo';
  targetUrl = 'https://www.bcb.gob.bo/webdocs/estadisticas/boletin_mensual_2025_12.xlsx';
  period = '2025-12';
  forceRefresh = false;

  // Formulario de Reutilización de Insumos
  derivationDataset = 'catalogo_series_files';
  derivationPeriod = '2025-Q1';
  derivationInstitution = '';

  // Formulario de Registro en Cola de Descarga
  queueSourceId = 'asfi';
  queueUrl = 'https://www.asfi.gob.bo/boletines/serie_mensual_en_transito.xlsx';
  queueStatus: 'PENDING' | 'DOWNLOADING' = 'DOWNLOADING';

  readonly sources = computed(() => {
    const base = ['asfi', 'bcb', 'finrural', 'bbv'];
    const dynamic = this.inventoryStore.sourcesList();
    return Array.from(new Set([...base, ...dynamic]));
  });

  ngOnInit(): void {
    this.store.loadDownloads();
    this.onEvaluate();
    this.onInspectDerivation();
  }

  applyPreset(preset: PresetScenario): void {
    this.activePresetId.set(preset.id);
    this.selectedSource = preset.entity;
    this.datasetCode = preset.datasetCode;
    this.domain = preset.domain;
    this.period = preset.period;
    this.targetUrl = preset.targetUrl;
    this.forceRefresh = false;
    this.onEvaluate();
  }

  onSourceChange(src: string): void {
    this.selectedSource = src;
    const hostMap: Record<string, string> = {
      asfi: 'www.asfi.gob.bo',
      bcb: 'www.bcb.gob.bo',
      finrural: 'www.finrural.org.bo',
      bbv: 'www.bbv.com.bo'
    };
    this.domain = hostMap[src.toLowerCase()] || `www.${src.toLowerCase()}.gob.bo`;
  }

  onEvaluate(): void {
    const req: IngestionEvaluateRequest = {
      source_id: this.selectedSource,
      dataset_code: this.datasetCode.trim(),
      domain: this.domain.trim(),
      target_url: this.targetUrl.trim() || null,
      period: this.period.trim() || null,
      force_refresh: this.forceRefresh
    };
    this.store.evaluateAdmission(req);
  }

  onInspectDerivation(): void {
    if (!this.derivationPeriod.trim()) return;
    this.store.inspectDerivation({
      dataset_code: this.derivationDataset,
      period: this.derivationPeriod.trim(),
      institution_id: this.derivationInstitution.trim() || null
    });
  }

  onEnqueueDownload(): void {
    const cleanUrl = this.queueUrl.trim();
    if (!cleanUrl) return;
    this.store.enqueueDownloadTask({
      source_id: this.queueSourceId,
      canonical_url: cleanUrl,
      status: this.queueStatus
    });
    this.selectedSource = this.queueSourceId;
    this.targetUrl = cleanUrl;
  }

  testQueuedUrlInControl(sourceId: string, url: string): void {
    this.selectedSource = sourceId.toLowerCase();
    this.targetUrl = url;
    this.datasetCode = `DS_BO_${sourceId.toUpperCase()}`;
    this.forceRefresh = false;
    this.onEvaluate();
  }

  getVerdictTitle(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_GOLD':
        return 'INFORMACIÓN DISPONIBLE EN REPOSITORIO CONSOLIDADO';
      case 'REUSE_DERIVATION':
        return 'REUTILIZABLE A PARTIR DE INSUMOS CONSOLIDADOS';
      case 'CACHE_HIT_BRONZE':
        return 'ARCHIVO FUENTE DISPONIBLE EN CUSTODIA DOCUMENTAL';
      case 'IN_FLIGHT_LOCKED':
      case 'IN_PROGRESS':
        return 'DESCARGA EN CURSO — SOLICITUD VINCULADA SIN DUPLICIDAD';
      case 'PROCEED_DOWNLOAD':
        return 'INSUMO NUEVO — AUTORIZADO PARA ADQUISICIÓN';
      default:
        return 'VALIDACIÓN COMPLETADA';
    }
  }

  getVerdictRecommendation(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_GOLD':
        return 'Los datos solicitados ya fueron procesados anteriormente. Acceda directamente a "Repositorios Consolidados y Autoservicio" para consultarlos o exportarlos a Excel sin reprocesar archivos.';
      case 'REUSE_DERIVATION':
        return 'El período agregado solicitado puede construirse directamente combinando los cortes mensuales ya consolidados, evitando nuevas descargas.';
      case 'CACHE_HIT_BRONZE':
        return 'El documento original ya se encuentra resguardado y verificado con firma SHA-256 en el servidor. No se requiere una nueva descarga desde el portal externo.';
      case 'IN_PROGRESS':
      case 'IN_FLIGHT_LOCKED':
        return 'El archivo fuente ya se encuentra en cola o en proceso de descarga activa. Su solicitud quedó suscrita a la misma tarea para evitar tráfico duplicado.';
      case 'PROCEED_DOWNLOAD':
        return 'No existe registro previo ni descarga activa para este recurso. El sistema autoriza su adquisición desde la fuente institucional.';
      default:
        return 'Revise el detalle de trazabilidad para continuar con la operación.';
    }
  }

  formatGranularity(granularity: string): string {
    switch (granularity) {
      case 'ANNUAL':
        return 'Anual (12 cortes mensuales)';
      case 'SEMESTER':
        return 'Semestral (6 cortes mensuales)';
      case 'QUARTER':
        return 'Trimestral (3 cortes mensuales)';
      case 'MONTHLY':
        return 'Mensual';
      default:
        return 'Rango Personalizado';
    }
  }

  formatDownloadStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'EN COLA';
      case 'DOWNLOADING':
        return 'DESCARGANDO';
      case 'COMPLETED':
        return 'COMPLETADO';
      case 'FAILED':
        return 'CON INCIDENCIA';
      default:
        return status;
    }
  }
}
