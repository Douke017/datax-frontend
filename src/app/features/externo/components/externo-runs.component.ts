import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ExternoStore } from '../externo.store';
import { RunReport } from '../../../core/models/catalog.model';
import { formatInteger } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-externo-runs',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './externo-runs.component.html',
  styleUrl: './externo-runs.component.css'
})
export class ExternoRunsComponent {
  readonly store = inject(ExternoStore);
  readonly formatInt = formatInteger;

  readonly selectedRunId = signal<string>('');

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

  selectRun(run: RunReport): void {
    this.selectedRunId.set(run.run_id);
    this.store.selectRun(run);
  }

  onTriggerBackup(): void {
    this.store.triggerBackup().subscribe();
  }

  calculateDuration(startStr: string, endStr: string): string {
    if (!startStr || !endStr) return '-';
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return '-';
    const totalSecs = Math.round((e - s) / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  aggregateCoverage(run: RunReport): {
    pages_visited: number;
    urls_discovered: number;
    resources_found: number;
    urls_rejected: number;
    urls_failed: number;
    requests_total: number;
  } {
    let pages = 0;
    let disc = 0;
    let found = 0;
    let rej = 0;
    let failed = 0;
    let reqs = 0;

    for (const sr of run.source_results) {
      const cov = sr.coverage;
      if (cov) {
        pages += cov.pages_visited || 0;
        disc += cov.urls_discovered || 0;
        found += cov.resources_found || 0;
        rej += cov.urls_rejected || 0;
        failed += cov.urls_failed || 0;
        reqs += cov.requests_total || cov.pages_visited || 0;
      }
    }

    return {
      pages_visited: pages,
      urls_discovered: disc,
      resources_found: found,
      urls_rejected: rej,
      urls_failed: failed,
      requests_total: reqs
    };
  }

  formatStopReason(reason?: string): string {
    if (!reason) return 'Ciclo completado';
    switch (reason) {
      case 'QUEUE_EXHAUSTED':
        return 'Exploración exhaustiva completada';
      case 'MAX_URLS_REACHED':
        return 'Presupuesto máximo de páginas alcanzado';
      case 'MAX_RESOURCES_REACHED':
        return 'Límite máximo de recursos alcanzado';
      case 'CIRCUIT_BREAKER_TRIGGERED':
        return 'Disyuntor activado por fallas consecutivas';
      default:
        return reason;
    }
  }
}
