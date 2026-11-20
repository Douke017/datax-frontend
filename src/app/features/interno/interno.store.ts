import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, forkJoin, Observable, of, pipe, switchMap, tap } from 'rxjs';
import {
  BatchGatekeeperEvaluateRequest,
  BatchGatekeeperEvaluateResponse,
  BridgeSyncResponse,
  BronzeArtifactEntry,
  DeduplicationAuditResponse,
  DerivationEvaluationRequest,
  DerivationEvaluationResult,
  DomainCircuitStatus,
  DownloadStatusItem,
  EnqueueDownloadRequest,
  EnqueueMissingPeriodsRequest,
  EnqueueMissingPeriodsResponse,
  GatekeeperMetricsResponse,
  IngestionEvaluateRequest,
  IngestionEvaluateResponse
} from '../../core/models/reconciliation.model';
import { InternoService } from '../../core/services/interno.service';
import { formatBytes, formatPercentage } from '../../shared/utils/format.utils';

export interface InternoState {
  artifacts: BronzeArtifactEntry[];
  selectedArtifact: BronzeArtifactEntry | null;
  sourceFilter: string;
  periodFilter: string;
  searchQuery: string;
  lastEvaluation: IngestionEvaluateResponse | null;
  evaluationElapsedMs: number | null;
  isEvaluating: boolean;
  batchEvaluation: BatchGatekeeperEvaluateResponse | null;
  isEvaluatingBatch: boolean;
  gatekeeperMetrics: GatekeeperMetricsResponse | null;
  dedupAudit: DeduplicationAuditResponse | null;
  derivationResult: DerivationEvaluationResult | null;
  isInspectingDerivation: boolean;
  deltaResult: EnqueueMissingPeriodsResponse | null;
  isEnqueuingDelta: boolean;
  downloadsQueue: DownloadStatusItem[];
  activeDownloadsCount: number;
  downloadsLoading: boolean;
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
  evaluationElapsedMs: null,
  isEvaluating: false,
  batchEvaluation: null,
  isEvaluatingBatch: false,
  gatekeeperMetrics: null,
  dedupAudit: null,
  derivationResult: null,
  isInspectingDerivation: false,
  deltaResult: null,
  isEnqueuingDelta: false,
  downloadsQueue: [],
  activeDownloadsCount: 0,
  downloadsLoading: false,
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
  withComputed(
    ({
      artifacts,
      sourceFilter,
      periodFilter,
      searchQuery,
      verifiedArtifacts,
      circuitBreakers
    }) => ({
      filteredArtifacts: () => {
        let list = artifacts();
        const src = sourceFilter();
        if (src !== 'ALL') {
          list = list.filter(
            (a) =>
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
          list = list.filter(
            (a) =>
              a.file_path.toLowerCase().includes(query) ||
              a.sha256_hash.toLowerCase().includes(query) ||
              a.dataset_code.toLowerCase().includes(query) ||
              a.artifact_id.toLowerCase().includes(query)
          );
        }
        return list;
      },
      totalArtifactsCount: () => artifacts().length,
      totalBytesCustodyFormatted: () => {
        const total = artifacts().reduce((acc, curr) => acc + (curr.size_bytes || 0), 0);
        return formatBytes(total);
      },
      verifiedCount: () => Object.keys(verifiedArtifacts()).length,
      integrityRate: () => {
        const total = artifacts().length;
        if (total === 0) return '100,00%';
        const verified = Object.keys(verifiedArtifacts()).length;
        return formatPercentage((verified / total) * 100);
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
    })
  ),
  withComputed(({ filteredArtifacts, currentPage, pageSize }) => ({
    totalFiltered: () => filteredArtifacts().length,
    totalPages: () => Math.max(1, Math.ceil(filteredArtifacts().length / Math.max(1, pageSize()))),
    pagedArtifacts: () => {
      const list = filteredArtifacts();
      const start = (currentPage() - 1) * pageSize();
      return list.slice(start, start + pageSize());
    }
  })),
  withMethods((store, service = inject(InternoService)) => {
    const loadArtifactsMethod = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          service.getArtifacts().pipe(
            tap((artifacts) => {
              const verifiedMap: Record<string, boolean> = {};
              artifacts.forEach((a) => {
                if (a.sha256_hash && a.sha256_hash.length === 64) {
                  verifiedMap[a.artifact_id] = true;
                }
              });
              patchState(store, {
                artifacts,
                verifiedArtifacts: verifiedMap,
                loading: false,
                error: null
              });
            }),
            catchError((err) => {
              const status = err?.status ? `HTTP ${err.status}` : 'Error de red';
              patchState(store, {
                loading: false,
                error: `${status}: No fue posible consultar la custodia documental de Prospector Interno (:8001).`
              });
              return of([]);
            })
          )
        )
      )
    );

    const loadTelemetryMethod = rxMethod<void>(
      pipe(
        switchMap(() =>
          forkJoin({
            metrics: service.getGatekeeperMetrics().pipe(catchError(() => of(null))),
            dedup: service.getDeduplicationAudit(100).pipe(catchError(() => of(null))),
            breakers: service
              .getDownloadCircuitBreakers()
              .pipe(catchError(() => of({ domains: [] })))
          }).pipe(
            tap(({ metrics, dedup, breakers }) => {
              patchState(store, {
                gatekeeperMetrics: metrics,
                dedupAudit: dedup,
                circuitBreakers: breakers.domains || []
              });
            })
          )
        )
      )
    );

    const loadDownloadsMethod = rxMethod<string | undefined>(
      pipe(
        tap(() => patchState(store, { downloadsLoading: true })),
        switchMap((sourceId) =>
          service.getDownloadsStatus(sourceId, true).pipe(
            tap((res) =>
              patchState(store, {
                downloadsQueue: res.downloads,
                activeDownloadsCount: res.total_active,
                downloadsLoading: false
              })
            ),
            catchError(() => {
              patchState(store, { downloadsLoading: false });
              return of(null);
            })
          )
        )
      )
    );

    return {
      loadAll: () => {
        loadArtifactsMethod();
        loadDownloadsMethod(undefined);
        loadTelemetryMethod();
      },
      loadArtifacts: () => loadArtifactsMethod(),
      loadDownloads: (sourceId?: string) => loadDownloadsMethod(sourceId),
      loadTelemetry: () => loadTelemetryMethod(),
      applyDownloadsSnapshot: (downloads: DownloadStatusItem[], totalActive: number) => {
        patchState(store, {
          downloadsQueue: downloads,
          activeDownloadsCount: totalActive
        });
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
        patchState(store, { currentPage: Math.max(1, Math.min(page, max)) });
      },
      setPageSize: (size: number) => {
        patchState(store, { pageSize: size, currentPage: 1 });
      },
      evaluateAdmission: (req: IngestionEvaluateRequest): Observable<IngestionEvaluateResponse> => {
        const t0 = performance.now();
        patchState(store, { isEvaluating: true });
        return service.evaluateGatekeeper({ mode: 'DRY_RUN', ...req }).pipe(
          tap((res) => {
            const elapsed = Math.round(performance.now() - t0);
            patchState(store, {
              lastEvaluation: res,
              evaluationElapsedMs: res.latency_ms ?? elapsed,
              isEvaluating: false
            });
            loadTelemetryMethod();
          }),
          catchError((err) => {
            patchState(store, { isEvaluating: false });
            throw err;
          })
        );
      },
      evaluateBatch: (
        req: BatchGatekeeperEvaluateRequest
      ): Observable<BatchGatekeeperEvaluateResponse> => {
        patchState(store, { isEvaluatingBatch: true });
        return service.evaluateGatekeeperBatch({ mode: 'DRY_RUN', ...req }).pipe(
          tap((res) => {
            patchState(store, {
              batchEvaluation: res,
              isEvaluatingBatch: false
            });
            loadTelemetryMethod();
          }),
          catchError((err) => {
            patchState(store, { isEvaluatingBatch: false });
            throw err;
          })
        );
      },
      inspectDerivation: (req: DerivationEvaluationRequest): Observable<DerivationEvaluationResult> => {
        patchState(store, { isInspectingDerivation: true, deltaResult: null });
        return service.inspectDerivation(req).pipe(
          tap((res) => {
            patchState(store, {
              derivationResult: res,
              isInspectingDerivation: false
            });
          }),
          catchError((err) => {
            patchState(store, { isInspectingDerivation: false });
            throw err;
          })
        );
      },
      enqueueMissingPeriods: (
        req: EnqueueMissingPeriodsRequest
      ): Observable<EnqueueMissingPeriodsResponse> => {
        patchState(store, { isEnqueuingDelta: true });
        return service.enqueueMissingPeriods(req).pipe(
          tap((res) => {
            patchState(store, {
              deltaResult: res,
              isEnqueuingDelta: false
            });
            loadDownloadsMethod(undefined);
          }),
          catchError((err) => {
            patchState(store, { isEnqueuingDelta: false });
            throw err;
          })
        );
      },
      enqueueDownloadTask: (req: EnqueueDownloadRequest): Observable<DownloadStatusItem> => {
        patchState(store, { downloadsLoading: true });
        return service.enqueueDownload(req).pipe(
          tap(() => {
            loadDownloadsMethod(undefined);
          }),
          catchError((err) => {
            patchState(store, { downloadsLoading: false });
            throw err;
          })
        );
      },
      retryDownloadTask: (downloadId: string): Observable<DownloadStatusItem> => {
        return service.retryDownload(downloadId).pipe(
          tap(() => loadDownloadsMethod(undefined))
        );
      },
      cancelDownloadTask: (downloadId: string): Observable<DownloadStatusItem> => {
        return service.cancelDownload(downloadId).pipe(
          tap(() => loadDownloadsMethod(undefined))
        );
      },
      resetDomainCircuit: (domain: string) => {
        service.resetCircuitBreaker(domain).subscribe({
          next: () => loadTelemetryMethod()
        });
      },
      runSyncBatch: (sourceId: string): Observable<BridgeSyncResponse> => {
        patchState(store, { syncing: true });
        return service.sync({ source_id: sourceId, batch_size: 5, execute_downloads: true }).pipe(
          tap((res) => {
            patchState(store, {
              syncing: false,
              lastSyncResult: res
            });
            loadArtifactsMethod();
            loadDownloadsMethod(undefined);
          }),
          catchError((err) => {
            patchState(store, { syncing: false });
            throw err;
          })
        );
      }
    };
  }),
  withHooks({
    onInit(store) {
      store.loadAll();
    }
  })
);
