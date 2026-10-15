import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import {
  BronzeArtifactEntry,
  IngestionEvaluateRequest,
  IngestionEvaluateResponse,
  DomainCircuitStatus,
  BridgeSyncResponse
} from '../../core/models/reconciliation.model';
import { InternoService } from '../../core/services/interno.service';

export interface InternoState {
  artifacts: BronzeArtifactEntry[];
  selectedArtifact: BronzeArtifactEntry | null;
  sourceFilter: string;
  periodFilter: string;
  searchQuery: string;
  lastEvaluation: IngestionEvaluateResponse | null;
  isEvaluating: boolean;
  verifiedArtifacts: Record<string, boolean>;
  circuitBreakers: DomainCircuitStatus[];
  loading: boolean;
  syncing: boolean;
  lastSyncResult: BridgeSyncResponse | null;
  error: string | null;
  currentPage: number;
  pageSize: number;
}

const initialState: InternoState = {
  artifacts: [],
  selectedArtifact: null,
  sourceFilter: 'ALL',
  periodFilter: 'ALL',
  searchQuery: '',
  lastEvaluation: null,
  isEvaluating: false,
  verifiedArtifacts: {},
  circuitBreakers: [],
  loading: false,
  syncing: false,
  lastSyncResult: null,
  error: null,
  currentPage: 1,
  pageSize: 20
};

export const InternoStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ artifacts, sourceFilter, periodFilter, searchQuery, verifiedArtifacts, circuitBreakers }) => {
    return {
      filteredArtifacts: () => {
        let list = artifacts();

        const src = sourceFilter();
        if (src !== 'ALL') {
          list = list.filter((a) =>
            a.dataset_code.toLowerCase().includes(src.toLowerCase()) ||
            a.domain.toLowerCase().includes(src.toLowerCase())
          );
        }

        const period = periodFilter();
        if (period !== 'ALL') {
          list = list.filter((a) => a.period === period);
        }

        const query = searchQuery().toLowerCase().trim();
        if (query) {
          list = list.filter((a) =>
            a.file_path.toLowerCase().includes(query) ||
            a.sha256_hash.toLowerCase().includes(query) ||
            a.dataset_code.toLowerCase().includes(query)
          );
        }

        return list;
      },
      totalArtifactsCount: () => artifacts().length,
      totalBytesCustodyFormatted: () => {
        const total = artifacts().reduce((acc, curr) => acc + (curr.size_bytes || 0), 0);
        if (total === 0) return '0 MB';
        return `${(total / (1024 * 1024)).toFixed(2)} MB`;
      },
      verifiedCount: () => Object.keys(verifiedArtifacts()).length,
      integrityRate: () => {
        const total = artifacts().length;
        if (total === 0) return '100,0%';
        const verified = Object.keys(verifiedArtifacts()).length;
        return `${((verified / total) * 100).toFixed(1)}%`;
      },
      allCircuitsOperational: () => {
        const cbs = circuitBreakers();
        if (cbs.length === 0) return true;
        return cbs.every((cb) => cb.status === 'CLOSED');
      },
      uniqueSources: () => {
        const set = new Set<string>();
        artifacts().forEach((a) => set.add(a.dataset_code));
        return Array.from(set).sort();
      },
      uniquePeriods: () => {
        const set = new Set<string>();
        artifacts().forEach((a) => {
          if (a.period) set.add(a.period);
        });
        return Array.from(set).sort().reverse();
      }
    };
  }),
  withComputed(({ filteredArtifacts, currentPage, pageSize }) => {
    return {
      totalFiltered: () => filteredArtifacts().length,
      totalPages: () => Math.max(1, Math.ceil(filteredArtifacts().length / pageSize())),
      pagedArtifacts: () => {
        const list = filteredArtifacts();
        const start = (currentPage() - 1) * pageSize();
        return list.slice(start, start + pageSize());
      },
      paginationRange: () => {
        const total = filteredArtifacts().length;
        if (total === 0) return { start: 0, end: 0 };
        const start = (currentPage() - 1) * pageSize() + 1;
        const end = Math.min(currentPage() * pageSize(), total);
        return { start, end };
      }
    };
  }),
  withMethods((store, service = inject(InternoService)) => {
    const loadArtifactsMethod = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() => {
          return service.getArtifacts().pipe(
            tap((artifacts) => {
              // Pre-verificar automáticamente hashes ya resguardados
              const verifiedMap: Record<string, boolean> = {};
              artifacts.forEach((a) => {
                if (a.sha256_hash && a.sha256_hash.length === 64) {
                  verifiedMap[a.artifact_id] = true;
                }
              });
              patchState(store, {
                artifacts,
                verifiedArtifacts: verifiedMap,
                loading: false
              });
            }),
            catchError((err) => {
              patchState(store, {
                loading: false,
                error: 'Error al consultar repositorio de custodia.'
              });
              return of([]);
            })
          );
        })
      )
    );

    const loadCircuitBreakersMethod = rxMethod<void>(
      pipe(
        switchMap(() => {
          return service.getCircuitBreaker('www.bbv.com.bo').pipe(
            switchMap((bbv) => {
              return service.getCircuitBreaker('www.finrural.org.bo').pipe(
                tap((finrural) => {
                  patchState(store, { circuitBreakers: [bbv, finrural] });
                })
              );
            }),
            catchError(() => of(null))
          );
        })
      )
    );

    return {
      loadAll: () => {
        loadArtifactsMethod();
        loadCircuitBreakersMethod();
      },
      setSourceFilter: (source: string) => {
        patchState(store, { sourceFilter: source, currentPage: 1 });
      },
      setPeriodFilter: (period: string) => {
        patchState(store, { periodFilter: period, currentPage: 1 });
      },
      setSearchQuery: (query: string) => {
        patchState(store, { searchQuery: query, currentPage: 1 });
      },
      selectArtifact: (artifact: BronzeArtifactEntry | null) => {
        patchState(store, { selectedArtifact: artifact });
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
      evaluateAdmission: (req: IngestionEvaluateRequest) => {
        patchState(store, { isEvaluating: true });
        service.evaluateGatekeeper(req).subscribe({
          next: (res) => {
            patchState(store, {
              lastEvaluation: res,
              isEvaluating: false
            });
          },
          error: () => {
            patchState(store, { isEvaluating: false });
          }
        });
      },
      verifyArtifactIntegrity: (artifactId: string) => {
        const current = store.verifiedArtifacts();
        patchState(store, {
          verifiedArtifacts: { ...current, [artifactId]: true }
        });
      },
      runSyncBatch: (sourceId: string) => {
        patchState(store, { syncing: true });
        service.sync({ source_id: sourceId, batch_size: 5, execute_downloads: true }).subscribe({
          next: (res) => {
            patchState(store, {
              syncing: false,
              lastSyncResult: res
            });
            loadArtifactsMethod();
          },
          error: () => {
            patchState(store, { syncing: false });
          }
        });
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadAll();
    }
  })
);
