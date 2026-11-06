import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, forkJoin, Observable } from 'rxjs';
import { CatalogResource, CatalogSource, RunReport, SourcePolicyUpdate, StorageStatus, BackupSyncResult } from '../../core/models/catalog.model';
import { ExternoService } from '../../core/services/externo.service';

export interface ExternoState {
  sources: CatalogSource[];
  selectedSourceId: string;
  resources: CatalogResource[];
  selectedResource: CatalogResource | null;
  runs: RunReport[];
  selectedRun: RunReport | null;
  searchQuery: string;
  extensionFilter: string;
  statusFilter: string;
  currentPage: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  serviceStatus: string;
  storageStatus: StorageStatus | null;
  storageLoading: boolean;
  storageMessage: string | null;
}

const initialState: ExternoState = {
  sources: [],
  selectedSourceId: 'ALL',
  resources: [],
  selectedResource: null,
  runs: [],
  selectedRun: null,
  searchQuery: '',
  extensionFilter: 'ALL',
  statusFilter: 'ALL',
  currentPage: 1,
  pageSize: 20,
  loading: false,
  error: null,
  serviceStatus: 'VERIFICANDO',
  storageStatus: null,
  storageLoading: false,
  storageMessage: null
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
      warningSourcesCount: () => sources().filter((s) => s.health_status === 'WARNING').length,
      suspendedSourcesCount: () => sources().filter((s) => s.health_status === 'SUSPENDED').length,
      kpiSummary: () => {
        const all = resources();
        const pdfCount = all.filter((r) => r.file_extension?.toLowerCase() === '.pdf').length;
        const excelCount = all.filter((r) => {
          const e = r.file_extension?.toLowerCase();
          return e === '.xlsx' || e === '.xls' || e === '.csv' || e === '.ods' || e === '.zip';
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
          return forkJoin({
            health: service.checkHealth().pipe(catchError(() => of({ status: 'OFFLINE', service: 'catalog-api' }))),
            sources: service.getSources().pipe(catchError(() => of([]))),
            resources: service.getResources().pipe(catchError(() => of([]))),
            runs: service.getRuns().pipe(catchError(() => of([])))
          }).pipe(
            tap(({ health, sources, resources, runs }) => {
              patchState(store, {
                serviceStatus: health.status,
                sources,
                resources,
                runs,
                loading: false
              });
            }),
            catchError(() => {
              patchState(store, { loading: false, error: 'Error al consultar catálogo externo.' });
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
      },
      selectRun: (run: RunReport | null) => {
        patchState(store, { selectedRun: run });
      },
      loadStorageStatus: () => {
        patchState(store, { storageLoading: true });
        service.getStorageStatus().pipe(
          tap((status) => {
            patchState(store, { storageStatus: status, storageLoading: false });
          }),
          catchError(() => {
            patchState(store, { storageLoading: false, storageMessage: 'No se pudo obtener estado del almacenamiento.' });
            return of(null);
          })
        ).subscribe();
      },
      triggerBackup: (): Observable<BackupSyncResult> => {
        patchState(store, { storageLoading: true, storageMessage: 'Generando respaldo del catálogo...' });
        return service.triggerStorageBackup().pipe(
          tap((res) => {
            patchState(store, {
              storageLoading: false,
              storageMessage: `Respaldo exitoso: ${res.backup_id} (${res.sources_backed_up} fuentes, ${res.resources_backed_up} recursos)`
            });
            service.getStorageStatus().subscribe((status) => {
              patchState(store, { storageStatus: status });
            });
          }),
          catchError((err) => {
            patchState(store, { storageLoading: false, storageMessage: 'Fallo al generar respaldo.' });
            throw err;
          })
        );
      },
      saveSourcePolicy: (sourceId: string, update: SourcePolicyUpdate): Observable<CatalogSource> => {
        patchState(store, { loading: true, error: null });
        return service.updateSourcePolicy(sourceId, update).pipe(
          tap((updatedSource) => {
            const currentSources = store.sources();
            const idx = currentSources.findIndex((s) => s.source_id === sourceId);
            let newSources = [...currentSources];
            if (idx >= 0) {
              newSources[idx] = updatedSource;
            } else {
              newSources.push(updatedSource);
            }
            patchState(store, { sources: newSources, loading: false });
          }),
          catchError((err) => {
            patchState(store, { loading: false, error: 'Error al actualizar política de la fuente.' });
            throw err;
          })
        );
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadAll();
      store.loadStorageStatus();
    }
  })
);
