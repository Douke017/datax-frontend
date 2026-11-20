import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InternoStore } from '../interno.store';
import { InventoryStore } from '../inventory.store';
import { InternoService } from '../../../core/services/interno.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
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
  formatPercentage,
  formatSpeedBps
} from '../../../shared/utils/format.utils';

type GatekeeperSubTab = 'evaluate' | 'queue' | 'reuse' | 'dedup';

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
  private readonly analyticsService = inject(AnalyticsService);
  readonly toast = inject(ToastService);

  readonly formatSize = formatBytesBo;
  readonly formatInt = formatIntegerBo;
  readonly formatPct = formatPercentage;
  readonly formatMs = formatLatencyMs;
  readonly formatSpeed = formatSpeedBps;
  readonly formatDate = formatIsoDateShort;

  readonly subTab = signal<GatekeeperSubTab>('evaluate');

  // Evaluación individual (DRY_RUN por defecto, sin locks fantasma)
  selectedSource = 'bcb';
  datasetCode = 'catalogo_series_files';
  domain = 'www.bcb.gob.bo';
  targetUrl = '';
  period = '2025-12';
  etag = '';
  forceRefresh = false;

  // Evaluación por lotes (hasta 500 ítems)
  batchInputText = '';
  readonly enqueuingBatchProceed = signal<boolean>(false);

  // Cola real de descargas (SSE en vivo)
  readonly sseConnected = signal<boolean>(false);
  queueSourceId = 'bcb';
  queueUrl = '';
  queueDatasetCode = '';
  queuePriority = 5;
  private eventSource: EventSource | null = null;

  // Motor de Reutilización y Solicitud Delta
  derivationDataset = 'catalogo_series_files';
  derivationPeriod = '2025-Q1';
  derivationSourceId = 'bcb';
  derivationUrlTemplate = '';

  readonly sources = computed(() => {
    const base = ['bcb', 'asfi', 'ine', 'bbv', 'finrural', 'aps'];
    const dynamic = this.inventoryStore.sourcesList().map((s) => s.toLowerCase());
    return Array.from(new Set([...base, ...dynamic]));
  });

  readonly batchProceedCount = computed(() => {
    const batch = this.store.batchEvaluation();
    if (!batch) return 0;
    return batch.results.filter((r) => r.verdict === 'PROCEED_DOWNLOAD').length;
  });

  readonly verdictKeys = computed(() => {
    const batch = this.store.batchEvaluation();
    return batch ? Object.entries(batch.summary || {}) : [];
  });

  ngOnInit(): void {
    this.store.loadDownloads();
    this.store.loadTelemetry();
    this.connectDownloadsSse();
  }

  ngOnDestroy(): void {
    this.disconnectDownloadsSse();
  }

  private connectDownloadsSse(): void {
    this.disconnectDownloadsSse();
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

  private disconnectDownloadsSse(): void {
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

  onEvaluateSingle(): void {
    if (!this.datasetCode.trim() && !this.targetUrl.trim()) {
      this.toast.warning('Datos incompletos', 'Ingrese un código de dataset o una URL objetivo.');
      return;
    }
    const req: IngestionEvaluateRequest = {
      source_id: this.selectedSource,
      dataset_code: this.datasetCode.trim() || `DS_${this.selectedSource.toUpperCase()}`,
      domain: this.domain.trim() || null,
      target_url: this.targetUrl.trim() || null,
      period: this.period.trim() || null,
      etag: this.etag.trim() || null,
      force_refresh: this.forceRefresh,
      mode: 'DRY_RUN'
    };
    this.store.evaluateAdmission(req).subscribe({
      next: (res) => {
        this.toast.info(
          `Dictamen: ${res.verdict} (${this.formatMs(res.latency_ms)})`,
          res.lock_acquired ? 'Bloqueo adquirido' : 'Inspección segura (DRY_RUN sin locks)'
        );
      },
      error: (err) => {
        this.toast.error('Error al evaluar solicitud', err?.error?.detail || 'Revise la conexión.');
      }
    });
  }

  onEnqueueEvaluatedSingle(): void {
    const url = this.targetUrl.trim();
    if (!url) {
      this.toast.warning('URL requerida', 'Ingrese la URL objetivo antes de encolar la descarga real.');
      return;
    }
    this.store
      .enqueueDownloadTask({
        source_id: this.selectedSource.toUpperCase(),
        canonical_url: url,
        dataset_code: this.datasetCode.trim() || null,
        period_label: this.period.trim() || null,
        etag: this.etag.trim() || null,
        execute_now: true
      })
      .subscribe({
        next: (rec) => {
          this.toast.success(
            rec.coalesced ? 'Solicitud suscrita a descarga activa' : 'Descarga física encolada',
            `ID: ${rec.download_id} · Estado: ${rec.status}`
          );
          this.subTab.set('queue');
        },
        error: (err) => {
          this.toast.error('No se pudo encolar', err?.error?.detail || 'Verifique la URL.');
        }
      });
  }

  onEvaluateBatch(): void {
    const lines = this.batchInputText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      this.toast.warning('Lote vacío', 'Pegue al menos una URL o línea source_id|url|periodo.');
      return;
    }
    if (lines.length > 500) {
      this.toast.warning('Límite excedido', 'El lote admite hasta 500 solicitudes por evaluación.');
      return;
    }

    const items: IngestionEvaluateRequest[] = lines.map((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length >= 2 && parts[1].startsWith('http')) {
        return {
          source_id: parts[0] || this.selectedSource,
          dataset_code: `DS_${(parts[0] || this.selectedSource).toUpperCase()}`,
          target_url: parts[1],
          period: parts[2] || null,
          request_id: `batch-${idx + 1}`
        };
      }
      return {
        source_id: this.selectedSource,
        dataset_code: this.datasetCode.trim() || `DS_${this.selectedSource.toUpperCase()}`,
        target_url: line.startsWith('http') ? line : null,
        period: line.startsWith('http') ? null : line,
        request_id: `batch-${idx + 1}`
      };
    });

    this.store.evaluateBatch({ items, mode: 'DRY_RUN' }).subscribe({
      next: (res) => {
        this.toast.success(
          `Lote de ${res.total} ítems evaluado en ${this.formatMs(res.elapsed_ms)}`,
          `${res.saved_downloads} descargas redundantes evitadas.`
        );
      },
      error: (err) => {
        this.toast.error('Error en evaluación batch', err?.error?.detail || 'Revise el formato.');
      }
    });
  }

  onEnqueueBatchProceeds(): void {
    const batch = this.store.batchEvaluation();
    if (!batch) return;
    const lines = this.batchInputText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const targets: Array<{ source_id: string; url: string; period: string | null }> = [];
    batch.results.forEach((r, idx) => {
      if (r.verdict !== 'PROCEED_DOWNLOAD') return;
      const line = lines[idx] || '';
      const parts = line.split('|').map((p) => p.trim());
      const url = parts.length >= 2 && parts[1].startsWith('http') ? parts[1] : line;
      if (url.startsWith('http')) {
        targets.push({
          source_id: (parts.length >= 2 ? parts[0] : this.selectedSource).toUpperCase(),
          url,
          period: parts[2] || null
        });
      }
    });

    if (targets.length === 0) {
      this.toast.info('Sin URLs nuevas para encolar');
      return;
    }

    this.enqueuingBatchProceed.set(true);
    const calls = targets.map((t) =>
      this.internoService
        .enqueueDownload({
          source_id: t.source_id,
          canonical_url: t.url,
          period_label: t.period,
          execute_now: true
        })
        .pipe(catchError(() => of(null)))
    );

    forkJoin(calls).subscribe({
      next: (res) => {
        const ok = res.filter(Boolean).length;
        this.enqueuingBatchProceed.set(false);
        this.store.loadDownloads();
        this.toast.success(`${ok} descargas físicas encoladas`, 'Monitoree el avance en la cola SSE.');
        this.subTab.set('queue');
      },
      error: () => {
        this.enqueuingBatchProceed.set(false);
        this.toast.error('Error al encolar lote');
      }
    });
  }

  onEnqueueManualReal(): void {
    const url = this.queueUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.toast.warning('URL inválida', 'Ingrese una dirección HTTP/HTTPS real para el worker.');
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
            rec.coalesced ? 'Suscrito a descarga en curso' : 'Encolado en worker pool real',
            `${rec.download_id} (${rec.status})`
          );
        },
        error: (err) => {
          this.toast.error('No se pudo encolar', err?.error?.detail || 'Revise la solicitud.');
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

  onInspectDerivation(): void {
    if (!this.derivationPeriod.trim()) return;
    this.store
      .inspectDerivation({
        dataset_code: this.derivationDataset,
        period: this.derivationPeriod.trim()
      })
      .subscribe({
        error: (err) =>
          this.toast.error('Error al inspeccionar reutilización', err?.error?.detail || '')
      });
  }

  onEnqueueMissingDelta(): void {
    if (!this.derivationPeriod.trim()) return;
    this.store
      .enqueueMissingPeriods({
        dataset_code: this.derivationDataset,
        period: this.derivationPeriod.trim(),
        source_id: this.derivationSourceId || null,
        url_template: this.derivationUrlTemplate.trim() || null,
        execute_now: true
      })
      .subscribe({
        next: (res) => {
          if (res.action === 'DIRECT_EXPORT_READY') {
            this.toast.success('Cobertura del 100%', res.message);
          } else {
            this.toast.success(
              `Solicitud delta generada (${res.enqueued_count} periodos)`,
              res.message
            );
          }
        },
        error: (err) => {
          this.toast.error('Error generando solicitud delta', err?.error?.detail || '');
        }
      });
  }

  getDirectParquetExportUrl(datamart: string): string {
    return this.analyticsService.buildExportUrl('parquet', { datamart });
  }

  resolveActionLink(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${this.internoService.baseUrl}${path}`;
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
