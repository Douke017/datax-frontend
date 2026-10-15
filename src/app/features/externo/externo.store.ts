import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { CatalogResource, CatalogSource, RunReport } from '../../core/models/catalog.model';
import { ExternoService } from '../../core/services/externo.service';

export interface ExternoState {
  sources: CatalogSource[];
  selectedSourceId: string;
  resources: CatalogResource[];
  selectedResource: CatalogResource | null;
  runs: RunReport[];
  searchQuery: string;
  extensionFilter: string;
  statusFilter: string;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  serviceStatus: string;
}

const initialState: ExternoState = {
  sources: [],
  selectedSourceId: 'ALL',
  resources: [],
  selectedResource: null,
  runs: [],
  searchQuery: '',
  extensionFilter: 'ALL',
  statusFilter: 'ALL',
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  serviceStatus: 'VERIFICANDO'
};

export const ExternoStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ sources, resources, selectedSourceId, searchQuery, extensionFilter, statusFilter, currentPage, pageSize }) => {
    return {
      filteredResources: () => {
        let list = resources();

        // 1. Filtro por portal/fuente
        const srcId = selectedSourceId();
        if (srcId !== 'ALL') {
          list = list.filter((r) => r.source_id.toLowerCase() === srcId.toLowerCase());
        }

        // 2. Filtro por extensión
        const ext = extensionFilter();
        if (ext !== 'ALL') {
          list = list.filter((r) => r.file_extension?.toLowerCase() === ext.toLowerCase());
        }

        // 3. Filtro por estado de cambio
        const status = statusFilter();
        if (status !== 'ALL') {
          list = list.filter((r) => r.change_status.toUpperCase() === status.toUpperCase());
        }

        // 4. Búsqueda por texto (título, url, period_label)
        const query = searchQuery().toLowerCase().trim();
        if (query) {
          list = list.filter((r) =>
            (r.title && r.title.toLowerCase().includes(query)) ||
            r.url.toLowerCase().includes(query) ||
            (r.period_label && r.period_label.toLowerCase().includes(query))
          );
        }

        return list;
      },
      totalDiscovered: () => resources().length,
      activeSourcesCount: () => sources().filter((s) => s.health_status === 'ACTIVE').length,
      kpiSummary: () => {
        const all = resources();
        const pdfCount = all.filter((r) => r.file_extension?.toLowerCase() === '.pdf').length;
        const excelCount = all.filter((r) => {
          const e = r.file_extension?.toLowerCase();
          return e === '.xlsx' || e === '.xls' || e === '.csv';
        }).length;
        const otherCount = all.length - pdfCount - excelCount;
        const totalBytes = all.reduce((acc, curr) => acc + (curr.content_length_bytes || 0), 0);

        return {
          pdfCount,
          excelCount,
          otherCount,
          totalBytesFormatted: totalBytes > 0
            ? `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
            : 'Preservado en Origen'
        };
      }
    };
  }),
  withComputed(({ filteredResources, currentPage, pageSize }) => {
    return {
      totalFiltered: () => filteredResources().length,
      totalPages: () => Math.max(1, Math.ceil(filteredResources().length / pageSize())),
      pagedResources: () => {
        const list = filteredResources();
        const start = (currentPage() - 1) * pageSize();
        return list.slice(start, start + pageSize());
      },
      paginationRange: () => {
        const total = filteredResources().length;
        if (total === 0) return { start: 0, end: 0 };
        const start = (currentPage() - 1) * pageSize() + 1;
        const end = Math.min(currentPage() * pageSize(), total);
        return { start, end };
      }
    };
  }),
  withMethods((store, service = inject(ExternoService)) => {
    const loadData = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => {
          return service.checkHealth().pipe(
            tap((health) => patchState(store, { serviceStatus: health.status })),
            switchMap(() => service.getSources()),
            tap((sources) => patchState(store, { sources })),
            switchMap(() => service.getResources()),
            tap((resources) => patchState(store, { resources, loading: false })),
            switchMap(() => service.getRuns()),
            tap((runs) => patchState(store, { runs })),
            catchError((err) => {
              patchState(store, {
                loading: false,
                error: 'Error al sincronizar con el catálogo de exploración.'
              });
              return of(null);
            })
          );
        })
      )
    );

    return {
      loadAll: () => loadData(),
      setSourceFilter: (sourceId: string) => {
        patchState(store, { selectedSourceId: sourceId, currentPage: 1 });
      },
      setSearchQuery: (query: string) => {
        patchState(store, { searchQuery: query, currentPage: 1 });
      },
      setExtensionFilter: (ext: string) => {
        patchState(store, { extensionFilter: ext, currentPage: 1 });
      },
      setStatusFilter: (status: string) => {
        patchState(store, { statusFilter: status, currentPage: 1 });
      },
      setPage: (page: number) => {
        const max = store.totalPages();
        if (page >= 1 && page <= max) {
          patchState(store, { currentPage: page });
        }
      },
      setPageSize: (size: number) => {
        patchState(store, { pageSize: size, currentPage: 1 });
      },
      selectResource: (resource: CatalogResource | null) => {
        patchState(store, { selectedResource: resource });
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadAll();
    }
  })
);
