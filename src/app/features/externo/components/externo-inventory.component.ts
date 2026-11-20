import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExternoStore, ResourceSortField } from '../externo.store';
import { ExternoService } from '../../../core/services/externo.service';
import { InternoService } from '../../../core/services/interno.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CatalogResource,
  FileProcessingStatus,
  ResourceStatusAuditEvent,
  ResourceVersion
} from '../../../core/models/catalog.model';
import {
  DataGridColumn,
  DataGridComponent,
  DataGridFilterChip,
  DataGridSortEvent
} from '../../../shared/components/data-grid/data-grid.component';
import {
  DrawerTab,
  SlideOverDrawerComponent
} from '../../../shared/components/slide-over-drawer/slide-over-drawer.component';
import { ConfirmReasonModalComponent } from '../../../shared/components/confirm-reason-modal/confirm-reason-modal.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import {
  formatBytesBo,
  formatIntegerBo,
  formatIsoDateShort
} from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-externo-inventory',
  standalone: true,
  imports: [
    FormsModule,
    DataGridComponent,
    SlideOverDrawerComponent,
    ConfirmReasonModalComponent,
    SkeletonLoaderComponent
  ],
  templateUrl: './externo-inventory.component.html',
  styleUrls: ['./externo-inventory.component.css']
})
export class ExternoInventoryComponent implements OnInit, OnDestroy {
  readonly store = inject(ExternoStore);
  private readonly externoService = inject(ExternoService);
  private readonly internoService = inject(InternoService);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatBytes = formatBytesBo;
  readonly formatInt = formatIntegerBo;
  readonly formatDate = formatIsoDateShort;

  readonly columns: DataGridColumn[] = [
    { key: 'source_id', label: 'Fuente', sortable: true, mono: true, width: '110px' },
    { key: 'title', label: 'Archivo / Enlace', sortable: true },
    { key: 'file_extension', label: 'Formato', sortable: true, mono: true, width: '96px' },
    { key: 'current_version', label: 'Versión', sortable: true, align: 'center', mono: true, width: '82px' },
    {
      key: 'content_length_bytes',
      label: 'Tamaño',
      sortable: true,
      align: 'right',
      mono: true,
      tabular: true,
      width: '108px'
    },
    { key: 'processing_status', label: 'Estado', sortable: true, width: '165px' },
    { key: 'discovered_at', label: 'Indexado', sortable: true, mono: true, width: '155px' },
    { key: 'actions', label: 'Acciones', width: '130px' }
  ];

  readonly selectedKeys = signal<Set<string>>(new Set<string>());
  readonly bulkDispatching = signal<boolean>(false);
  readonly bulkSummaryMsg = signal<string>('');

  // Slide-over Drawer state
  readonly inspectingResource = signal<CatalogResource | null>(null);
  readonly drawerTab = signal<string>('meta');
  readonly resourceVersions = signal<ResourceVersion[]>([]);
  readonly resourceAudit = signal<ResourceStatusAuditEvent[]>([]);
  readonly loadingDrawerData = signal<boolean>(false);

  // Audited status override modal
  readonly pendingStatusTarget = signal<{
    resource: CatalogResource;
    nextStatus: FileProcessingStatus;
  } | null>(null);
  readonly updatingStatus = signal<boolean>(false);
  overrideNextStatus: FileProcessingStatus = 'PENDIENTE';

  private qpSub?: Subscription;
  private searchDebounce?: ReturnType<typeof setTimeout>;
  private pendingInspectKey: string | null = null;

  readonly drawerTabs = computed<DrawerTab[]>(() => [
    { id: 'meta', label: 'Metadatos HTTP' },
    { id: 'versions', label: 'Versiones SHA-256', badge: this.resourceVersions().length },
    { id: 'audit', label: 'Bitácora Auditoría', badge: this.resourceAudit().length }
  ]);

  readonly filterChips = computed<DataGridFilterChip[]>(() => {
    const chips: DataGridFilterChip[] = [];
    if (this.store.selectedSourceId() !== 'ALL') {
      chips.push({ key: 'source_id', label: 'Fuente', value: this.store.selectedSourceId().toUpperCase() });
    }
    if (this.store.extensionFilter() !== 'ALL') {
      chips.push({ key: 'extension', label: 'Extensión', value: this.store.extensionFilter() });
    }
    if (this.store.categoryFilter() !== 'ALL') {
      chips.push({ key: 'category', label: 'Categoría', value: this.store.categoryFilter() });
    }
    if (this.store.processingFilter() !== 'ALL') {
      chips.push({ key: 'processing', label: 'Estado', value: this.store.processingFilter() });
    }
    if (this.store.searchQuery().trim()) {
      chips.push({ key: 'search', label: 'Búsqueda', value: this.store.searchQuery().trim() });
    }
    return chips;
  });

  readonly rowKeyFn = (row: CatalogResource): string => row.resource_key;

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const sourceId = params.get('source_id') || 'ALL';
      const search = params.get('search') || '';
      const extension = params.get('extension') || 'ALL';
      const category = params.get('category') || 'ALL';
      const processing = (params.get('processing') as 'ALL' | FileProcessingStatus) || 'ALL';
      const sortBy = (params.get('sort_by') as ResourceSortField) || 'discovered_at';
      const sortDir = (params.get('sort_dir') as 'asc' | 'desc') || 'desc';
      const page = Math.max(1, Number(params.get('page')) || 1);
      const pageSize = Math.max(10, Number(params.get('limit')) || 20);
      this.pendingInspectKey = params.get('inspect');

      this.store.applyResourceFilters({
        sourceId,
        search,
        extension,
        category,
        processingStatus: processing,
        sortBy,
        sortDir,
        page,
        pageSize
      });

      if (this.pendingInspectKey) {
        const match = this.store
          .resources()
          .find((r) => r.resource_key === this.pendingInspectKey);
        if (match) {
          this.openDrawer(match);
          this.pendingInspectKey = null;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  private syncQueryParams(patch: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'inventory', ...patch },
      queryParamsHandling: 'merge'
    });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.syncQueryParams({ search: val.trim() || null, page: 1 });
    }, 250);
  }

  onSourceChange(val: string): void {
    this.syncQueryParams({ source_id: val === 'ALL' ? null : val, page: 1 });
  }

  onExtensionChange(val: string): void {
    this.syncQueryParams({ extension: val === 'ALL' ? null : val, page: 1 });
  }

  onCategoryChange(val: string): void {
    this.syncQueryParams({ category: val === 'ALL' ? null : val, page: 1 });
  }

  onProcessingChange(val: string): void {
    this.syncQueryParams({ processing: val === 'ALL' ? null : val, page: 1 });
  }

  onSortChange(ev: DataGridSortEvent): void {
    this.syncQueryParams({ sort_by: ev.sortBy, sort_dir: ev.sortDir, page: 1 });
  }

  onPageChange(page: number): void {
    this.syncQueryParams({ page });
  }

  onPageSizeChange(limit: number): void {
    this.syncQueryParams({ limit, page: 1 });
  }

  onRemoveChip(key: string): void {
    this.syncQueryParams({ [key]: null, page: 1 });
  }

  onClearAllChips(): void {
    this.syncQueryParams({
      source_id: null,
      extension: null,
      category: null,
      processing: null,
      search: null,
      page: 1
    });
  }

  onSelectionChange(keys: string[]): void {
    this.selectedKeys.set(new Set(keys));
  }

  getExportHref(format: 'jsonl' | 'csv' | 'parquet'): string {
    return this.externoService.buildExportResourcesUrl(format, {
      sourceId: this.store.selectedSourceId(),
      search: this.store.searchQuery(),
      extension: this.store.extensionFilter(),
      processingStatus: this.store.processingFilter(),
      resourceCategory: this.store.categoryFilter()
    });
  }

  sendSelectedToInterno(): void {
    const keys = this.selectedKeys();
    const selectedRows = this.store.resources().filter((r) => keys.has(r.resource_key));
    if (selectedRows.length === 0) return;

    this.bulkDispatching.set(true);
    this.bulkSummaryMsg.set('');

    const batchItems = selectedRows.map((r) => ({
      source_id: r.source_id,
      dataset_code: `DS_${r.source_id.toUpperCase()}`,
      target_url: r.url,
      period: r.period_label || null,
      checksum_sha256: r.content_hash || null,
      etag: r.etag || null
    }));

    this.internoService
      .evaluateGatekeeperBatch({ items: batchItems, mode: 'DRY_RUN' })
      .subscribe({
        next: (batchRes) => {
          const toEnqueue = selectedRows.filter(
            (_, idx) => batchRes.results[idx]?.verdict === 'PROCEED_DOWNLOAD'
          );
          if (toEnqueue.length === 0) {
            this.bulkDispatching.set(false);
            const msg = `Gatekeeper interceptó ${batchRes.saved_downloads}/${batchRes.total} archivos (${batchRes.elapsed_ms} ms): ya disponibles en custodia o en curso.`;
            this.bulkSummaryMsg.set(msg);
            this.toast.info('Sin descargas redundantes', msg);
            this.selectedKeys.set(new Set());
            return;
          }

          const enqueueCalls = toEnqueue.map((r) =>
            this.internoService
              .enqueueDownload({
                source_id: r.source_id.toUpperCase(),
                canonical_url: r.url,
                resource_key: r.resource_key,
                dataset_code: `DS_${r.source_id.toUpperCase()}`,
                period_label: r.period_label || null,
                etag: r.etag || null,
                execute_now: true
              })
              .pipe(catchError(() => of(null)))
          );

          forkJoin(enqueueCalls).subscribe({
            next: (queued) => {
              const okCount = queued.filter((q) => q !== null).length;
              this.bulkDispatching.set(false);
              const msg = `Evaluación batch (${batchRes.elapsed_ms} ms): ${batchRes.saved_downloads} evitados por caché/dedup, ${okCount} enviados a cola real de Prospector Interno.`;
              this.bulkSummaryMsg.set(msg);
              this.toast.success('Envío en lote completado', msg);
              this.selectedKeys.set(new Set());
            },
            error: () => {
              this.bulkDispatching.set(false);
              this.toast.error('Error al encolar descargas en Prospector Interno');
            }
          });
        },
        error: (err) => {
          this.bulkDispatching.set(false);
          this.toast.error(
            'Error en evaluación Gatekeeper',
            err?.error?.detail || 'Verifique que Prospector Interno (:8001) esté en línea.'
          );
        }
      });
  }

  openDrawer(resource: CatalogResource): void {
    this.inspectingResource.set(resource);
    this.drawerTab.set('meta');
    this.overrideNextStatus = resource.processing_status || 'PENDIENTE';
    this.loadingDrawerData.set(true);

    forkJoin({
      versions: this.externoService
        .getResourceVersions(resource.resource_key)
        .pipe(catchError(() => of([]))),
      audit: this.externoService
        .getResourceAudit(resource.resource_key)
        .pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ versions, audit }) => {
        this.resourceVersions.set(versions);
        this.resourceAudit.set(audit);
        this.loadingDrawerData.set(false);
      },
      error: () => {
        this.loadingDrawerData.set(false);
      }
    });
  }

  closeDrawer(): void {
    this.inspectingResource.set(null);
  }

  requestAuditedStatusOverride(resource: CatalogResource, nextStatus: FileProcessingStatus): void {
    this.pendingStatusTarget.set({ resource, nextStatus });
  }

  confirmAuditedStatusOverride(reason: string): void {
    const target = this.pendingStatusTarget();
    if (!target) return;
    this.updatingStatus.set(true);
    this.store
      .updateResourceStatus(target.resource.resource_key, target.nextStatus, reason)
      .subscribe({
        next: (updated) => {
          this.updatingStatus.set(false);
          this.pendingStatusTarget.set(null);
          if (this.inspectingResource()?.resource_key === updated.resource_key) {
            this.openDrawer(updated);
          }
          this.toast.success(
            `Estado actualizado a ${updated.processing_status}`,
            'Justificación registrada en la bitácora auditable.'
          );
        },
        error: (err) => {
          this.updatingStatus.set(false);
          this.toast.error(
            'Error al actualizar estado',
            err?.error?.detail || 'El servidor rechazó la transición.'
          );
        }
      });
  }

  getProcessingBadgeClass(status?: FileProcessingStatus): string {
    switch (status || 'PENDIENTE') {
      case 'PROCESADO_EXITOSAMENTE':
        return 'badge-success';
      case 'EN_PROCESO':
        return 'badge-info';
      case 'ERROR':
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  }

  getProcessingLabel(status?: FileProcessingStatus): string {
    switch (status || 'PENDIENTE') {
      case 'PROCESADO_EXITOSAMENTE':
        return 'PROCESADO';
      case 'EN_PROCESO':
        return 'EN PROCESO';
      case 'ERROR':
        return 'ERROR';
      default:
        return 'PENDIENTE';
    }
  }
}
