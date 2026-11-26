import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InternoStore } from '../interno.store';
import { InventoryStore } from '../inventory.store';
import { InternoService } from '../../../core/services/interno.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DownloadStatusItem,
  IngestionEvaluateRequest
} from '../../../core/models/reconciliation.model';
import {
  formatBytesBo,
  formatIntegerBo,
  formatIsoDateShort,
  formatLatencyMs,
  formatSpeedBps
} from '../../../shared/utils/format.utils';

type QueueSubTab = 'queue' | 'lookup';

@Component({
  selector: 'app-interno-gatekeeper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interno-gatekeeper.component.html',
  styleUrl: './interno-gatekeeper.component.css'
})
export class InternoGatekeeperComponent implements OnInit, OnDestroy {
  readonly store = inject(InternoStore);
  readonly inventoryStore = inject(InventoryStore);
  readonly internoService = inject(InternoService);
  readonly toast = inject(ToastService);

  readonly formatSize = formatBytesBo;
  readonly formatInt = formatIntegerBo;
  readonly formatMs = formatLatencyMs;
  readonly formatSpeed = formatSpeedBps;
  readonly formatDate = formatIsoDateShort;

  // Foco directo en la Cola de Descargas + Consulta rápida de disponibilidad
  readonly subTab = signal<QueueSubTab>('queue');

  // Cola de descargas en tiempo real
  readonly sseConnected = signal<boolean>(false);
  queueSourceId = 'bcb';
  queueUrl = '';
  queueDatasetCode = '';
  queuePriority = 5;
  private eventSource: EventSource | null = null;

  // Consulta rápida de disponibilidad
  selectedSource = 'bcb';
  datasetCode = 'catalogo_series_files';
  domain = 'www.bcb.gob.bo';
  targetUrl = '';
  period = '2025-12';
  forceRefresh = false;

  readonly sources = computed(() => {
    const base = ['bcb', 'asfi', 'ine', 'bbv', 'finrural', 'aps'];
    const dynamic = this.inventoryStore.sourcesList().map((s) => s.toLowerCase());
    return Array.from(new Set([...base, ...dynamic]));
  });

  ngOnInit(): void {
    this.store.loadDownloads();
    this.store.loadTelemetry();
    this.connectDownloadsStream();
  }

  ngOnDestroy(): void {
    this.disconnectDownloadsStream();
  }

  private connectDownloadsStream(): void {
    this.disconnectDownloadsStream();
    if (typeof EventSource === 'undefined') return;
    const url = this.internoService.buildDownloadsStreamUrl();
    const es = new EventSource(url);
    this.eventSource = es;
    this.sseConnected.set(true);

    es.addEventListener('queue_snapshot', (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as {
          total_active: number;
          downloads: DownloadStatusItem[];
        };
        if (Array.isArray(data.downloads)) {
          this.store.applyDownloadsSnapshot(data.downloads, data.total_active ?? 0);
        }
      } catch {
        // ignore parse errors
      }
    });

    const refreshEvents = [
      'download_queued',
      'download_started',
      'download_progress',
      'verifying_sha256',
      'download_completed',
      'download_deduplicated',
      'download_failed',
      'download_cancelled'
    ];
    for (const evName of refreshEvents) {
      es.addEventListener(evName, () => {
        this.store.loadDownloads();
        if (evName === 'download_completed' || evName === 'download_deduplicated') {
          this.store.loadArtifacts();
          this.store.loadTelemetry();
        }
      });
    }

    es.onerror = () => {
      this.sseConnected.set(false);
    };
  }

  private disconnectDownloadsStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sseConnected.set(false);
  }

  onSourceChange(src: string): void {
    this.selectedSource = src;
    const hostMap: Record<string, string> = {
      asfi: 'www.asfi.gob.bo',
      bcb: 'www.bcb.gob.bo',
      finrural: 'www.finrural.org.bo',
      bbv: 'www.bbv.com.bo',
      ine: 'www.ine.gob.bo'
    };
    this.domain = hostMap[src.toLowerCase()] || `www.${src.toLowerCase()}.gob.bo`;
  }

  onEnqueueManualReal(): void {
    const url = this.queueUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.toast.warning('URL inválida', 'Ingrese una dirección HTTP o HTTPS válida.');
      return;
    }
    this.store
      .enqueueDownloadTask({
        source_id: this.queueSourceId.toUpperCase(),
        canonical_url: url,
        dataset_code: this.queueDatasetCode.trim() || null,
        priority: Number(this.queuePriority) || 5,
        execute_now: true
      })
      .subscribe({
        next: (rec) => {
          this.queueUrl = '';
          this.toast.success(
            rec.coalesced ? 'Solicitud agrupada a descarga en curso' : 'Descarga agregada a la cola',
            `${rec.download_id} · ${this.formatDownloadStatus(rec.status)}`
          );
        },
        error: (err) => {
          this.toast.error('No se pudo agregar a la cola', err?.error?.detail || 'Revise la solicitud.');
        }
      });
  }

  onRetryDownload(downloadId: string): void {
    this.store.retryDownloadTask(downloadId).subscribe({
      next: () => this.toast.info('Descarga reencolada', `ID: ${downloadId}`),
      error: (err) => this.toast.error('No se pudo reintentar', err?.error?.detail || '')
    });
  }

  onCancelDownload(downloadId: string): void {
    this.store.cancelDownloadTask(downloadId).subscribe({
      next: () => this.toast.warning('Descarga cancelada', `ID: ${downloadId}`),
      error: (err) => this.toast.error('No se pudo cancelar', err?.error?.detail || '')
    });
  }

  onCheckAvailability(): void {
    if (!this.datasetCode.trim() && !this.targetUrl.trim()) {
      this.toast.warning('Datos incompletos', 'Ingrese un código de serie o una URL de archivo.');
      return;
    }
    const req: IngestionEvaluateRequest = {
      source_id: this.selectedSource,
      dataset_code: this.datasetCode.trim() || `DS_${this.selectedSource.toUpperCase()}`,
      domain: this.domain.trim() || null,
      target_url: this.targetUrl.trim() || null,
      period: this.period.trim() || null,
      force_refresh: this.forceRefresh,
      mode: 'DRY_RUN'
    };
    this.store.evaluateAdmission(req).subscribe({
      next: (res) => {
        this.toast.info(
          this.formatVerdictLabel(res.verdict),
          `Consulta completada en ${this.formatMs(res.latency_ms)}`
        );
      },
      error: (err) => {
        this.toast.error('Error al consultar disponibilidad', err?.error?.detail || 'Revise la conexión.');
      }
    });
  }

  onEnqueueEvaluatedSingle(): void {
    const url = this.targetUrl.trim();
    if (!url) {
      this.toast.warning('URL requerida', 'Ingrese la URL del archivo antes de agregarlo a la cola.');
      return;
    }
    this.store
      .enqueueDownloadTask({
        source_id: this.selectedSource.toUpperCase(),
        canonical_url: url,
        dataset_code: this.datasetCode.trim() || null,
        period_label: this.period.trim() || null,
        execute_now: true
      })
      .subscribe({
        next: (rec) => {
          this.toast.success(
            rec.coalesced ? 'Solicitud agrupada a descarga en curso' : 'Descarga agregada a la cola',
            `${rec.download_id} · ${this.formatDownloadStatus(rec.status)}`
          );
          this.subTab.set('queue');
        },
        error: (err) => {
          this.toast.error('No se pudo agregar a la cola', err?.error?.detail || 'Verifique la URL.');
        }
      });
  }

  formatVerdictLabel(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_GOLD':
      case 'CACHE_HIT_BRONZE':
        return 'Disponible en custodia';
      case 'REUSE_DERIVATION':
        return 'Reutilizable desde archivos existentes';
      case 'IN_PROGRESS':
      case 'IN_FLIGHT_LOCKED':
        return 'Descarga en curso';
      case 'PROCEED_DOWNLOAD':
        return 'Disponible para descargar';
      default:
        return verdict;
    }
  }

  formatDownloadStatus(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'Completada';
      case 'DEDUPLICATED':
        return 'Duplicado evitado';
      case 'DOWNLOADING':
        return 'Descargando';
      case 'VERIFYING_SHA256':
        return 'Verificando integridad';
      case 'QUEUED':
        return 'En cola';
      case 'PENDING':
        return 'Pendiente';
      case 'CANCELLED':
        return 'Cancelada';
      case 'FAILED':
        return 'Con error';
      default:
        return status;
    }
  }

  formatCircuitStatus(status: string): string {
    if (status === 'OPEN') return 'Pausado';
    if (status === 'HALF_OPEN') return 'En prueba';
    return 'Normal';
  }

  getVerdictBadgeClass(verdict: string): string {
    switch (verdict) {
      case 'CACHE_HIT_GOLD':
      case 'CACHE_HIT_BRONZE':
      case 'REUSE_DERIVATION':
        return 'badge-success';
      case 'IN_PROGRESS':
      case 'IN_FLIGHT_LOCKED':
        return 'badge-warning';
      case 'PROCEED_DOWNLOAD':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  }

  getDownloadBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'badge-success';
      case 'DEDUPLICATED':
        return 'badge-purple';
      case 'DOWNLOADING':
      case 'VERIFYING_SHA256':
      case 'QUEUED':
      case 'PENDING':
        return 'badge-info';
      case 'CANCELLED':
        return 'badge-warning';
      case 'FAILED':
        return 'badge-danger';
      default:
        return 'badge-neutral';
    }
  }
}
