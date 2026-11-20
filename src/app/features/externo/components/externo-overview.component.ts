import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { ExternoStore } from '../externo.store';
import { ExternoService } from '../../../core/services/externo.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogSource, FailoverEvent } from '../../../core/models/catalog.model';
import {
  DrawerTab,
  SlideOverDrawerComponent
} from '../../../shared/components/slide-over-drawer/slide-over-drawer.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import {
  formatIntegerBo,
  formatIsoDateShort,
  formatLatencyMs,
  formatPercentage
} from '../../../shared/utils/format.utils';

export type PortalAuditFilter = 'ALL' | 'WHITELIST' | 'BLACKLIST' | 'RESILIENCE_SPOF';

@Component({
  selector: 'app-externo-overview',
  standalone: true,
  imports: [SlideOverDrawerComponent, SkeletonLoaderComponent],
  templateUrl: './externo-overview.component.html',
  styleUrls: ['./externo-overview.component.css']
})
export class ExternoOverviewComponent {
  readonly store = inject(ExternoStore);
  private readonly externoService = inject(ExternoService);
  readonly toast = inject(ToastService);

  readonly formatInt = formatIntegerBo;
  readonly formatPct = formatPercentage;
  readonly formatMs = formatLatencyMs;
  readonly formatDate = formatIsoDateShort;

  @Output() exploreSource = new EventEmitter<string>();
  @Output() configureSource = new EventEmitter<string>();
  @Output() inspectAlerts = new EventEmitter<string>();

  readonly searchPortal = signal<string>('');
  readonly portalFilter = signal<PortalAuditFilter>('ALL');

  // Slide-over drawer for deep source & failover inspection
  readonly inspectingSource = signal<CatalogSource | null>(null);
  readonly drawerTab = signal<string>('summary');
  readonly sourceFailovers = signal<FailoverEvent[]>([]);
  readonly loadingFailovers = signal<boolean>(false);

  readonly drawerTabs = computed<DrawerTab[]>(() => [
    { id: 'summary', label: 'Política y Estado' },
    { id: 'failovers', label: 'Historial de Failover', badge: this.sourceFailovers().length }
  ]);

  readonly incidentSourcesCount = computed(() =>
    this.store.sources().filter((s) => s.health_status !== 'ACTIVE').length
  );

  readonly resilienceSummary = computed(() => this.store.resilienceCoverage());

  readonly filteredSources = computed(() => {
    const query = this.searchPortal().toLowerCase().trim();
    const filter = this.portalFilter();

    return this.store.sources().filter((s) => {
      if (query) {
        const matchCode = s.source_id.toLowerCase().includes(query);
        const matchName = s.name.toLowerCase().includes(query);
        const matchAudit =
          (s.audit_code || '').toLowerCase().includes(query) ||
          (s.audit_note || '').toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchAudit) return false;
      }

      if (filter === 'WHITELIST' && s.health_status !== 'ACTIVE') return false;
      if (filter === 'BLACKLIST' && s.health_status === 'ACTIVE') return false;
      return true;
    });
  });

  readonly filteredResilienceEntries = computed(() => {
    const cov = this.resilienceSummary();
    if (!cov) return [];
    const query = this.searchPortal().toLowerCase().trim();
    const list = cov.entries || [];
    return list
      .filter((e) => {
        if (!query) return true;
        return (
          e.source_id.toLowerCase().includes(query) ||
          e.name.toLowerCase().includes(query) ||
          e.risk_level.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const rank = { PUNTO_UNICO_DE_FALLO: 0, SOLO_HISTORICO: 1, PROTEGIDA: 2 };
        return rank[a.risk_level] - rank[b.risk_level];
      });
  });

  getSourceResourceCount(source: CatalogSource): number {
    return source.baseline_resource_count || 0;
  }

  getBackupCount(source: CatalogSource): number {
    if (source.contingency_urls && source.contingency_urls.length > 0) {
      return source.contingency_urls.length;
    }
    return source.contingency_url ? 1 : 0;
  }

  openSourceDrawer(source: CatalogSource): void {
    this.inspectingSource.set(source);
    this.drawerTab.set('summary');
    this.loadingFailovers.set(true);
    this.externoService.getSourceFailovers(source.source_id, 50).subscribe({
      next: (events) => {
        this.sourceFailovers.set(events);
        this.loadingFailovers.set(false);
      },
      error: () => {
        this.sourceFailovers.set([]);
        this.loadingFailovers.set(false);
      }
    });
  }

  closeSourceDrawer(): void {
    this.inspectingSource.set(null);
  }

  filterBySource(sourceId: string): void {
    this.exploreSource.emit(sourceId);
  }

  onConfigureSource(sourceId: string): void {
    this.configureSource.emit(sourceId);
  }

  onInspectReport(sourceId: string): void {
    this.inspectAlerts.emit(sourceId);
  }

  onTriggerRun(sourceId: string): void {
    this.store.triggerExtractionRun(sourceId).subscribe({
      next: (res) => {
        this.toast.success(
          `Corrida lanzada para ${sourceId.toUpperCase()}`,
          res.run_id ? `ID de corrida: ${res.run_id}` : res.message
        );
      },
      error: (err) => {
        this.toast.error(
          'No se pudo iniciar la corrida',
          err?.error?.detail || 'Verifique la conectividad del servicio.'
        );
      }
    });
  }

  onSearchInput(event: Event): void {
    this.searchPortal.set((event.target as HTMLInputElement).value);
  }

  setPortalFilter(filter: PortalAuditFilter): void {
    this.portalFilter.set(filter);
  }

  resetFilters(): void {
    this.searchPortal.set('');
    this.portalFilter.set('ALL');
  }

  formatWorkflowLabel(wf: string): string {
    if (wf === 'javascript') return 'Portal Dinámico (JS)';
    if (wf === 'api') return 'API / Datos Abiertos';
    if (wf === 'commented_html') return 'HTML Estructurado';
    return 'HTML Estándar';
  }

  formatRiskLabel(risk: string): string {
    if (risk === 'PUNTO_UNICO_DE_FALLO') return 'PUNTO ÚNICO DE FALLO (0 RESPALDOS)';
    if (risk === 'SOLO_HISTORICO') return 'SOLO ARCHIVO HISTÓRICO';
    return 'PROTEGIDA (ESPEJO VIVO)';
  }
}
