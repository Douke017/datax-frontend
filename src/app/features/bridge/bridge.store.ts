import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, retry } from 'rxjs';
import {
  BridgeReconcileResponse,
  BridgeSyncResponse
} from '../../core/models/reconciliation.model';
import { CatalogSource } from '../../core/models/catalog.model';
import { InternoService } from '../../core/services/interno.service';
import { ExternoService } from '../../core/services/externo.service';

export interface BridgeState {
  sources: CatalogSource[];
  selectedSourceId: string;
  reconcileResult: BridgeReconcileResponse | null;
  reconciling: boolean;
  syncing: boolean;
  lastSyncResult: BridgeSyncResponse | null;
  categoryFilter: 'ALL' | 'CONFIRMED' | 'NEW' | 'MODIFIED';
  searchQuery: string;
  batchSize: number;
  currentPage: number;
  pageSize: number;
  error: string | null;
}

const initialState: BridgeState = {
  sources: [],
  selectedSourceId: 'ALL',
  reconcileResult: null,
  reconciling: false,
  syncing: false,
  lastSyncResult: null,
  categoryFilter: 'ALL',
  searchQuery: '',
  batchSize: 10,
  currentPage: 1,
  pageSize: 20,
  error: null
};

export const BridgeStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ reconcileResult, categoryFilter, searchQuery, currentPage, pageSize }) => {
    return {
      filteredItems: () => {
        const res = reconcileResult();
        if (!res || !res.items) return [];

        let list = res.items;

        const cat = categoryFilter();
        if (cat !== 'ALL') {
          list = list.filter((i) => i.category === cat);
        }

        const query = searchQuery().toLowerCase().trim();
        if (query) {
          list = list.filter((i) =>
            i.url.toLowerCase().includes(query) ||
            i.resource_key.toLowerCase().includes(query) ||
            i.source_id.toLowerCase().includes(query) ||
            (i.period_label && i.period_label.toLowerCase().includes(query)) ||
            i.file_extension.toLowerCase().includes(query) ||
            (i.detail && i.detail.toLowerCase().includes(query))
          );
        }

        return list;
      },
      totalDiscovered: () => reconcileResult()?.total_external_resources ?? 0,
      totalConfirmed: () => reconcileResult()?.total_confirmed ?? 0,
      totalNew: () => reconcileResult()?.total_new ?? 0,
      totalModified: () => reconcileResult()?.total_modified ?? 0,
      distinctSourcesInDiff: () => {
        const items = reconcileResult()?.items ?? [];
        return new Set(items.map((i) => (i.source_id || '').toUpperCase())).size;
      }
    };
  }),
  withComputed(({ filteredItems, currentPage, pageSize }) => {
    return {
      totalFiltered: () => filteredItems().length,
      totalPages: () => Math.max(1, Math.ceil(filteredItems().length / pageSize())),
      pagedItems: () => {
        const list = filteredItems();
        const start = (currentPage() - 1) * pageSize();
        return list.slice(start, start + pageSize());
      },
      paginationStart: () => {
        if (filteredItems().length === 0) return 0;
        return (currentPage() - 1) * pageSize() + 1;
      },
      paginationEnd: () => {
        return Math.min(currentPage() * pageSize(), filteredItems().length);
      }
    };
  }),
  withMethods((store, internoService = inject(InternoService), externoService = inject(ExternoService)) => {
    const loadSources = rxMethod<void>(
      pipe(
        switchMap(() =>
          externoService.getSources().pipe(
            retry({ count: 3, delay: 1000 }),
            tap((srcs) => {
              const sorted = [...(srcs || [])].sort((a, b) => a.source_id.localeCompare(b.source_id));
              patchState(store, { sources: sorted });
            }),
            catchError(() => of([]))
          )
        )
      )
    );

    const reconcileSource = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { reconciling: true, error: null })),
        switchMap((sourceId) =>
          internoService.reconcile({ source_id: sourceId }).pipe(
            retry({ count: 2, delay: 800 }),
            tap((res) => {
              patchState(store, {
                reconcileResult: res,
                reconciling: false,
                currentPage: 1
              });
            }),
            catchError((err) => {
              patchState(store, {
                reconciling: false,
                error: err.error?.detail || 'Error al ejecutar conciliación entre el Prospector Externo y el Interno.'
              });
              return of(null);
            })
          )
        )
      )
    );

    const executeSyncPlan = rxMethod<{ executeDownloads: boolean }>(
      pipe(
        tap(() => patchState(store, { syncing: true, error: null })),
        switchMap(({ executeDownloads }) => {
          const sourceId = store.selectedSourceId();
          const batchSize = store.batchSize();

          return internoService.sync({
            source_id: sourceId,
            batch_size: batchSize,
            max_downloads: batchSize,
            execute_downloads: executeDownloads
          }).pipe(
            tap((res) => {
              patchState(store, {
                lastSyncResult: res,
                syncing: false
              });
              if (executeDownloads) {
                reconcileSource(sourceId);
                loadSources();
              }
            }),
            catchError((err) => {
              patchState(store, {
                syncing: false,
                error: err.error?.detail || 'Error al ejecutar el plan de sincronización.'
              });
              return of(null);
            })
          );
        })
      )
    );

    return {
      setSource(sourceId: string): void {
        patchState(store, { selectedSourceId: sourceId, currentPage: 1 });
        reconcileSource(sourceId);
      },
      setCategoryFilter(category: 'ALL' | 'CONFIRMED' | 'NEW' | 'MODIFIED'): void {
        patchState(store, { categoryFilter: category, currentPage: 1 });
      },
      setSearchQuery(query: string): void {
        patchState(store, { searchQuery: query, currentPage: 1 });
      },
      setBatchSize(size: number): void {
        patchState(store, { batchSize: size });
      },
      setPage(page: number): void {
        patchState(store, { currentPage: page });
      },
      loadSources,
      reconcileSource,
      executeSyncPlan
    };
  }),
  withHooks({
    onInit(store) {
      store.loadSources();
      store.reconcileSource(store.selectedSourceId());
    }
  })
);
