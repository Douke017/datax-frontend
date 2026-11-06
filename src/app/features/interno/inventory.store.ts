import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import {
  InventoryStatsResponse,
  UpdateUrlInventoryRequest,
  UrlInventoryItem
} from '../../core/models/inventory.model';
import { InternoService } from '../../core/services/interno.service';

export interface InventoryState {
  items: UrlInventoryItem[];
  stats: InventoryStatsResponse | null;
  selectedSource: string;
  selectedStatus: string;
  downloadFilter: boolean | null;
  processedFilter: boolean | null;
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  loading: boolean;
  updatingId: number | null;
  error: string | null;
}

const initialState: InventoryState = {
  items: [],
  stats: null,
  selectedSource: 'ALL',
  selectedStatus: 'ALL',
  downloadFilter: null,
  processedFilter: null,
  searchQuery: '',
  currentPage: 1,
  pageSize: 25,
  totalItems: 0,
  loading: false,
  updatingId: null,
  error: null
};

export const InventoryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ stats, totalItems, currentPage, pageSize, items }) => {
    return {
      totalPages: () => Math.max(1, Math.ceil(totalItems() / pageSize())),
      totalDownloaded: () => stats()?.total_downloaded ?? 0,
      totalProcessed: () => stats()?.total_processed ?? 0,
      totalUrls: () => stats()?.total_urls ?? totalItems(),
      downloadRate: () => stats()?.download_rate_pct ?? 0,
      processingRate: () => stats()?.processing_rate_pct ?? 0,
      sourcesList: () => stats()?.by_source.map((s) => s.source_id) ?? []
    };
  }),
  withMethods((store, service = inject(InternoService)) => {
    const loadStatsMethod = rxMethod<void>(
      pipe(
        switchMap(() => {
          return service.getInventoryStats().pipe(
            tap((stats) => patchState(store, { stats })),
            catchError(() => of(null))
          );
        })
      )
    );

    const loadUrlsMethod = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => {
          return service
            .getInventoryUrls({
              source_id: store.selectedSource(),
              status_filter: store.selectedStatus(),
              is_downloaded: store.downloadFilter(),
              is_processed: store.processedFilter(),
              search: store.searchQuery(),
              page: store.currentPage(),
              limit: store.pageSize()
            })
            .pipe(
              tap((res) => {
                patchState(store, {
                  items: res.items,
                  totalItems: res.total,
                  loading: false
                });
              }),
              catchError((err) => {
                patchState(store, {
                  loading: false,
                  error: 'Error al consultar inventario de URLs.'
                });
                return of({ total: 0, page: 1, limit: 25, items: [] });
              })
            );
        })
      )
    );

    return {
      loadStats: () => loadStatsMethod(),
      loadUrls: () => loadUrlsMethod(),
      setSourceFilter: (source: string) => {
        patchState(store, { selectedSource: source, currentPage: 1 });
        loadUrlsMethod();
      },
      setStatusFilter: (status: string) => {
        patchState(store, { selectedStatus: status, currentPage: 1 });
        loadUrlsMethod();
      },
      setDownloadFilter: (val: boolean | null) => {
        patchState(store, { downloadFilter: val, currentPage: 1 });
        loadUrlsMethod();
      },
      setProcessedFilter: (val: boolean | null) => {
        patchState(store, { processedFilter: val, currentPage: 1 });
        loadUrlsMethod();
      },
      setSearchQuery: (query: string) => {
        patchState(store, { searchQuery: query, currentPage: 1 });
        loadUrlsMethod();
      },
      setPage: (page: number) => {
        patchState(store, { currentPage: page });
        loadUrlsMethod();
      },
      toggleProcessed: (item: UrlInventoryItem) => {
        const nextVal = !item.is_processed;
        patchState(store, { updatingId: item.id });

        // Optimistic update
        const currentItems = store.items();
        patchState(store, {
          items: currentItems.map((i) => (i.id === item.id ? { ...i, is_processed: nextVal } : i))
        });

        service.updateInventoryUrl(item.id, { is_processed: nextVal }).subscribe({
          next: (updated) => {
            patchState(store, {
              updatingId: null,
              items: store.items().map((i) => (i.id === item.id ? updated : i))
            });
            loadStatsMethod();
          },
          error: () => {
            // Rollback on error
            patchState(store, {
              updatingId: null,
              items: currentItems
            });
          }
        });
      },
      toggleDownloaded: (item: UrlInventoryItem) => {
        const nextVal = !item.is_downloaded;
        patchState(store, { updatingId: item.id });

        // Optimistic update
        const currentItems = store.items();
        patchState(store, {
          items: currentItems.map((i) => (i.id === item.id ? { ...i, is_downloaded: nextVal } : i))
        });

        service.updateInventoryUrl(item.id, { is_downloaded: nextVal }).subscribe({
          next: (updated) => {
            patchState(store, {
              updatingId: null,
              items: store.items().map((i) => (i.id === item.id ? updated : i))
            });
            loadStatsMethod();
          },
          error: () => {
            // Rollback on error
            patchState(store, {
              updatingId: null,
              items: currentItems
            });
          }
        });
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadStats();
      store.loadUrls();
    }
  })
);
