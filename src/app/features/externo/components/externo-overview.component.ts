import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { ExternoStore } from '../externo.store';
import { CatalogSource } from '../../../core/models/catalog.model';

export type PortalAuditFilter = 'ALL' | 'WHITELIST' | 'BLACKLIST';

@Component({
  selector: 'app-externo-overview',
  standalone: true,
  imports: [],
  templateUrl: './externo-overview.component.html',
  styleUrl: './externo-overview.component.css'
})
export class ExternoOverviewComponent {
  readonly store = inject(ExternoStore);

  @Output() exploreSource = new EventEmitter<string>();
  @Output() configureSource = new EventEmitter<string>();

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
      // 1. Filtro por texto
      if (query) {
        const matchCode = s.source_id.toLowerCase().includes(query);
        const matchName = s.name.toLowerCase().includes(query);
        const matchAudit = s.audit_code?.toLowerCase().includes(query) || s.audit_note?.toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchAudit) return false;
      }

      // 2. Filtro por Lista Blanca (operativas) / Lista Negra (incidentes)
      if (filter === 'WHITELIST' && s.health_status !== 'ACTIVE') return false;
      if (filter === 'BLACKLIST' && s.health_status === 'ACTIVE') return false;

      return true;
    });
  });

  getSourceResourceCount(sourceId: string): number {
    return this.sourceCounts().get(sourceId.toLowerCase()) || 0;
  }

  filterBySource(sourceId: string): void {
    this.exploreSource.emit(sourceId);
  }

  onConfigureSource(sourceId: string): void {
    this.configureSource.emit(sourceId);
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
}
