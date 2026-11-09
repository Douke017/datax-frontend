import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { ExternoStore } from '../externo.store';
import { InstitutionStateService } from '../../../core/services/institution-state.service';
import { formatIntegerBo } from '../../../shared/utils/format.utils';

export type PortalAuditFilter = 'ALL' | 'WHITELIST' | 'BLACKLIST';

@Component({
  selector: 'app-externo-overview',
  standalone: true,
  imports: [],
  templateUrl: './externo-overview.component.html',
  styleUrls: ['./externo-overview.component.css']
})
export class ExternoOverviewComponent {
  readonly store = inject(ExternoStore);
  private readonly institutionState = inject(InstitutionStateService);
  readonly formatInt = formatIntegerBo;

  @Output() exploreSource = new EventEmitter<string>();
  @Output() configureSource = new EventEmitter<string>();
  @Output() inspectAlerts = new EventEmitter<string>();

  readonly searchPortal = signal<string>('');
  readonly portalFilter = signal<PortalAuditFilter>('ALL');

  readonly sourceCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const r of this.store.resources()) {
      const key = r.source_id.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  });

  readonly incidentSourcesCount = computed(() => {
    return this.store.sources().filter((s) => s.health_status !== 'ACTIVE').length;
  });

  readonly filteredSources = computed(() => {
    const query = this.searchPortal().toLowerCase().trim();
    const filter = this.portalFilter();

    return this.store.sources().filter((s) => {
      if (query) {
        const matchCode = s.source_id.toLowerCase().includes(query);
        const matchName = s.name.toLowerCase().includes(query);
        const matchAudit =
          s.audit_code?.toLowerCase().includes(query) ||
          s.audit_note?.toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchAudit) return false;
      }

      if (filter === 'WHITELIST' && s.health_status !== 'ACTIVE') return false;
      if (filter === 'BLACKLIST' && s.health_status === 'ACTIVE') return false;

      return true;
    });
  });

  getSourceResourceCount(sourceId: string): number {
    return this.sourceCounts().get(sourceId.toLowerCase()) || 0;
  }

  filterBySource(sourceId: string): void {
    this.syncInstitutionIfCore(sourceId);
    this.exploreSource.emit(sourceId);
  }

  onConfigureSource(sourceId: string): void {
    this.syncInstitutionIfCore(sourceId);
    this.configureSource.emit(sourceId);
  }

  onInspectReport(sourceId: string): void {
    this.inspectAlerts.emit(sourceId);
  }

  onTriggerRun(sourceId: string): void {
    this.store.triggerExtractionRun(sourceId);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchPortal.set(value);
  }

  clearSearch(): void {
    this.searchPortal.set('');
  }

  setPortalFilter(filter: PortalAuditFilter): void {
    this.portalFilter.set(filter);
  }

  resetFilters(): void {
    this.searchPortal.set('');
    this.portalFilter.set('ALL');
  }

  formatWorkflowLabel(wf: string): string {
    if (wf === 'javascript') return 'Portal Dinámico';
    if (wf === 'api') return 'Servicio Datos';
    if (wf === 'commented_html') return 'HTML Estructurado';
    return 'Portal Estándar';
  }

  private syncInstitutionIfCore(sourceId: string): void {
    const clean = sourceId.toLowerCase();
    if (clean.startsWith('asfi')) {
      this.institutionState.setInstitution('asfi');
    } else if (['bcb', 'bbv', 'finrural'].includes(clean)) {
      this.institutionState.setInstitution(clean);
    }
  }
}
