import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import { ExternoService } from '../../../core/services/externo.service';
import { ToastService } from '../../../core/services/toast.service';
import { RunProgressEvent, RunReport } from '../../../core/models/catalog.model';
import { formatIntegerBo, formatIsoDateShort } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-externo-runs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './externo-runs.component.html',
  styleUrl: './externo-runs.component.css'
})
export class ExternoRunsComponent implements OnDestroy {
  readonly store = inject(ExternoStore);
  private readonly externoService = inject(ExternoService);
  private readonly toast = inject(ToastService);

  readonly formatInt = formatIntegerBo;
  readonly formatDate = formatIsoDateShort;

  selectedTargetSource = 'ALL';
  readonly selectedRunId = signal<string>('');
  readonly liveEvents = signal<RunProgressEvent[]>([]);
  readonly sseConnected = signal<boolean>(false);
  readonly cancelling = signal<boolean>(false);

  private eventSource: EventSource | null = null;

  readonly activeRun = computed<RunReport | undefined>(() => {
    const list = this.store.runs();
    if (!list.length) return undefined;
    const currentId = this.selectedRunId();
    if (currentId) {
      const found = list.find((r) => r.run_id === currentId);
      if (found) return found;
    }
    return list[0];
  });

  ngOnDestroy(): void {
    this.disconnectStream();
  }

  onTriggerRun(): void {
    const target = this.selectedTargetSource === 'ALL' ? null : this.selectedTargetSource;
    this.store.triggerExtractionRun(target).subscribe({
      next: (res) => {
        this.toast.success('Corrida de extracción iniciada', res.message);
        if (res.run_id) {
          this.connectRunStream(res.run_id);
        }
      },
      error: (err) => {
        this.toast.error(
          'No se pudo iniciar la corrida',
          err?.error?.detail || 'Puede existir otra corrida activa en este momento.'
        );
      }
    });
  }

  connectRunStream(runId: string): void {
    this.disconnectStream();
    this.liveEvents.set([]);
    this.store.setActiveRunId(runId);

    if (typeof EventSource === 'undefined') return;
    const url = this.externoService.buildRunStreamUrl(runId);
    const es = new EventSource(url);
    this.eventSource = es;
    this.sseConnected.set(true);

    const handleEvent = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as RunProgressEvent;
        this.liveEvents.update((list) => [...list.slice(-49), parsed]);
        if (['run_completed', 'run_failed', 'run_cancelled'].includes(parsed.event)) {
          this.disconnectStream();
          this.store.refreshRuns();
          this.store.loadResourcesPage();
        }
      } catch {
        // ignore keep-alive frames
      }
    };

    const eventNames = [
      'run_started',
      'source_started',
      'source_completed',
      'source_failed',
      'run_completed',
      'run_failed',
      'run_cancelled',
      'message'
    ];
    for (const name of eventNames) {
      es.addEventListener(name, handleEvent as EventListener);
    }

    es.onerror = () => {
      this.disconnectStream();
      this.store.refreshRuns();
    };
  }

  disconnectStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.sseConnected.set(false);
  }

  onCancelRun(runId: string): void {
    this.cancelling.set(true);
    this.store.cancelRun(runId).subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.toast.warning(`Cancelación solicitada (${res.status})`, res.message);
      },
      error: (err) => {
        this.cancelling.set(false);
        this.toast.error(
          'No se pudo cancelar la corrida',
          err?.error?.detail || 'La corrida puede haber concluido ya.'
        );
      }
    });
  }

  selectRun(run: RunReport): void {
    this.selectedRunId.set(run.run_id);
    this.store.selectRun(run);
  }

  onTriggerBackup(): void {
    this.store.triggerBackup().subscribe({
      next: (res) => {
        this.toast.success('Respaldo atómico completado', `ID: ${res.backup_id}`);
      },
      error: () => {
        this.toast.error('No se pudo generar el respaldo');
      }
    });
  }

  calculateDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '—';
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return '—';
    const totalSecs = Math.round((e - s) / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  aggregateCoverage(run: RunReport): {
    pages_visited: number;
    urls_discovered: number;
    resources_found: number;
    urls_failed: number;
  } {
    let pages = 0;
    let disc = 0;
    let found = 0;
    let failed = 0;
    for (const sr of run.source_results || []) {
      const cov = sr.coverage;
      if (cov) {
        pages += cov.pages_visited || 0;
        disc += cov.urls_discovered || 0;
        found += cov.resources_found || 0;
        failed += cov.urls_failed || 0;
      }
    }
    return {
      pages_visited: pages,
      urls_discovered: disc,
      resources_found: found,
      urls_failed: failed
    };
  }

  formatRunStatus(status?: string): string {
    switch (status || 'COMPLETED') {
      case 'COMPLETED':
        return 'Completada';
      case 'RUNNING':
        return 'En curso';
      case 'FAILED':
        return 'Con error';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status || 'Completada';
    }
  }

  formatStorageStatus(status?: string): string {
    switch (status) {
      case 'HEALTHY':
        return 'Operativo';
      case 'DEGRADED':
        return 'Degradado';
      case 'OFFLINE':
        return 'Sin conexión';
      default:
        return status || 'Operativo';
    }
  }

  formatEventName(eventName: string): string {
    const labels: Record<string, string> = {
      run_started: 'Corrida iniciada',
      source_started: 'Portal iniciado',
      source_completed: 'Portal completado',
      source_failed: 'Error en portal',
      run_completed: 'Corrida completada',
      run_failed: 'Corrida con error',
      run_cancelled: 'Corrida cancelada'
    };
    return labels[eventName] || eventName;
  }

  formatEventData(data: Record<string, unknown>): string {
    return Object.entries(data || {})
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' · ');
  }
}
