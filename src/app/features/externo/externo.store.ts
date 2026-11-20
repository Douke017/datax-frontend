import { inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  withHooks,
  patchState
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, forkJoin, Observable, retry } from 'rxjs';
import {
  AlertChannelConfig,
  AlertDeliveryLog,
  AlertLifecycleUpdateRequest,
  BackupSyncResult,
  CancelRunResponse,
  CatalogResource,
  CatalogSource,
  ContingencyCandidate,
  ContingencyEvaluationResponse,
  DryRunExtractionResponse,
  DryRunPolicyRequest,
  FailoverEvent,
  FileProcessingStatus,
  MaintenanceTechnicalReport,
  OpenDiscoveryCandidate,
  OpenDiscoverySearchRequest,
  PromoteCandidateRequest,
  ResilienceCoverageReport,
  RunReport,
  SourcePolicyUpdate,
  StorageStatus,
  StructuralAlert,
  TriggerRunResponse
} from '../../core/models/catalog.model';
import { ExternoService } from '../../core/services/externo.service';

export type ResourceSortField =
  | 'discovered_at'
  | 'title'
  | 'source_id'
  | 'file_extension'
  | 'content_length_bytes'
  | 'current_version'
  | 'processing_status';

export interface ExternoState {
  sources: CatalogSource[];
  selectedSourceId: string;
  resources: CatalogResource[];
  totalResources: number;
  resourcesLoading: boolean;
  resourcesError: string | null;
  selectedResource: CatalogResource | null;
  runs: RunReport[];
  selectedRun: RunReport | null;
  activeRunId: string | null;
  discoveryCandidates: OpenDiscoveryCandidate[];
  includeDiscardedCandidates: boolean;
  discoveryLoading: boolean;
  alerts: StructuralAlert[];
  alertsLoading: boolean;
  alertChannels: AlertChannelConfig[];
  activeTechnicalReport: MaintenanceTechnicalReport | null;
  contingencyResult: ContingencyEvaluationResponse | null;
  contingencyLoading: boolean;
  resilienceCoverage: ResilienceCoverageReport | null;
  failoverEvents: FailoverEvent[];
  runTriggerMessage: string | null;
  triggeringSourceId: string | null;
  searchQuery: string;
  extensionFilter: string;
  statusFilter: string;
  processingFilter: 'ALL' | FileProcessingStatus;
  categoryFilter: string;
  sortBy: ResourceSortField;
  sortDir: 'asc' | 'desc';
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
  totalResources: 0,
  resourcesLoading: false,
  resourcesError: null,
  selectedResource: null,
  runs: [],
  selectedRun: null,
  activeRunId: null,
  discoveryCandidates: [],
  includeDiscardedCandidates: false,
  discoveryLoading: false,
  alerts: [],
  alertsLoading: false,
  alertChannels: [],
  activeTechnicalReport: null,
  contingencyResult: null,
  contingencyLoading: false,
  resilienceCoverage: null,
  failoverEvents: [],
  runTriggerMessage: null,
  triggeringSourceId: null,
  searchQuery: '',
  extensionFilter: 'ALL',
  statusFilter: 'ALL',
  processingFilter: 'ALL',
  categoryFilter: 'ALL',
  sortBy: 'discovered_at',
  sortDir: 'desc',
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
  withComputed(({ sources, resources, totalResources, alerts, currentPage, pageSize }) => ({
    totalDiscovered: () =>
      totalResources() ||
      resources().length ||
      sources().reduce((acc, s) => acc + (s.baseline_resource_count || 0), 0),
    activeSourcesCount: () => sources().filter((s) => s.health_status === 'ACTIVE').length,
    warningSourcesCount: () => sources().filter((s) => s.health_status === 'WARNING').length,
    suspendedSourcesCount: () => sources().filter((s) => s.health_status === 'SUSPENDED').length,
    openAlertsCount: () =>
      alerts().filter((a) => (a.status || 'ABIERTA') !== 'RESUELTA' && !a.resolved).length,
    criticalAlertsCount: () => alerts().filter((a) => a.severity === 'CRITICA').length,
    totalPages: () => Math.max(1, Math.ceil(totalResources() / Math.max(1, pageSize()))),
    paginationRange: () => {
      const total = totalResources();
      if (total === 0) return { start: 0, end: 0 };
      const start = (currentPage() - 1) * pageSize() + 1;
      const end = Math.min(currentPage() * pageSize(), total);
      return { start, end };
    },
    processingSummary: () => {
      const all = resources();
      let pending = 0;
      let inProcess = 0;
      let completed = 0;
      let errorCount = 0;
      for (const r of all) {
        const st = r.processing_status || 'PENDIENTE';
        if (st === 'PROCESADO_EXITOSAMENTE') completed++;
        else if (st === 'EN_PROCESO') inProcess++;
        else if (st === 'ERROR') errorCount++;
        else pending++;
      }
      return { pending, inProcess, completed, errorCount };
    }
  })),
  withMethods((store, service = inject(ExternoService)) => {
    const fetchResourcesPage = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { resourcesLoading: true, resourcesError: null })),
        switchMap(() => {
          const offset = (store.currentPage() - 1) * store.pageSize();
          return service
            .getResourcesPaged({
              sourceId: store.selectedSourceId(),
              search: store.searchQuery(),
              extension: store.extensionFilter(),
              processingStatus: store.processingFilter(),
              resourceCategory: store.categoryFilter(),
              sortBy: store.sortBy(),
              sortDir: store.sortDir(),
              limit: store.pageSize(),
              offset
            })
            .pipe(
              tap((res) => {
                patchState(store, {
                  resources: res.items,
                  totalResources: res.total,
                  resourcesLoading: false,
                  resourcesError: null
                });
              }),
              catchError((err) => {
                const status = err?.status ? `HTTP ${err.status}` : 'Error de red';
                patchState(store, {
                  resourcesLoading: false,
                  resourcesError: `${status}: No fue posible consultar el catálogo de archivos en Prospector Externo.`
                });
                return of(null);
              })
            );
        })
      )
    );

    const loadData = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          forkJoin({
            health: service.checkHealth().pipe(
              retry({ count: 2, delay: 800 }),
              catchError(() => of({ status: 'OFFLINE', service: 'catalog-api' }))
            ),
            sources: service.getSources().pipe(
              retry({ count: 2, delay: 800 }),
              catchError(() => of([]))
            ),
            runs: service.getRuns(25).pipe(catchError(() => of([]))),
            alerts: service.getStructuralAlerts().pipe(catchError(() => of([]))),
            channels: service.getAlertChannels().pipe(catchError(() => of([]))),
            candidates: service
              .getDiscoveryCandidates(store.includeDiscardedCandidates())
              .pipe(catchError(() => of([]))),
            coverage: service.getResilienceCoverage().pipe(catchError(() => of(null))),
            failovers: service.getAllFailovers(50).pipe(catchError(() => of([])))
          }).pipe(
            tap(({ health, sources, runs, alerts, channels, candidates, coverage, failovers }) => {
              patchState(store, {
                serviceStatus: health.status,
                sources,
                runs,
                alerts,
                alertChannels: channels,
                discoveryCandidates: candidates,
                resilienceCoverage: coverage,
                failoverEvents: failovers,
                loading: false
              });
              fetchResourcesPage();
            }),
            catchError(() => {
              patchState(store, {
                loading: false,
                error: 'No fue posible consultar el servicio del Prospector Externo (:8000).'
              });
              return of(null);
            })
          )
        )
      )
    );

    return {
      loadAll: () => loadData(),
      loadResourcesPage: () => fetchResourcesPage(),
      applyResourceFilters: (filters: {
        sourceId?: string;
        search?: string;
        extension?: string;
        processingStatus?: 'ALL' | FileProcessingStatus;
        category?: string;
        sortBy?: ResourceSortField;
        sortDir?: 'asc' | 'desc';
        page?: number;
        pageSize?: number;
      }) => {
        patchState(store, {
          selectedSourceId: filters.sourceId ?? store.selectedSourceId(),
          searchQuery: filters.search ?? store.searchQuery(),
          extensionFilter: filters.extension ?? store.extensionFilter(),
          processingFilter: filters.processingStatus ?? store.processingFilter(),
          categoryFilter: filters.category ?? store.categoryFilter(),
          sortBy: filters.sortBy ?? store.sortBy(),
          sortDir: filters.sortDir ?? store.sortDir(),
          currentPage: filters.page ?? 1,
          pageSize: filters.pageSize ?? store.pageSize()
        });
        fetchResourcesPage();
      },
      setSourceFilter: (sourceId: string) => {
        patchState(store, { selectedSourceId: sourceId, currentPage: 1 });
        fetchResourcesPage();
      },
      setSearchQuery: (query: string) => {
        patchState(store, { searchQuery: query, currentPage: 1 });
        fetchResourcesPage();
      },
      setExtensionFilter: (ext: string) => {
        patchState(store, { extensionFilter: ext, currentPage: 1 });
        fetchResourcesPage();
      },
      setCategoryFilter: (cat: string) => {
        patchState(store, { categoryFilter: cat, currentPage: 1 });
        fetchResourcesPage();
      },
      setProcessingFilter: (proc: 'ALL' | FileProcessingStatus) => {
        patchState(store, { processingFilter: proc, currentPage: 1 });
        fetchResourcesPage();
      },
      setSort: (sortBy: ResourceSortField, sortDir: 'asc' | 'desc') => {
        patchState(store, { sortBy, sortDir, currentPage: 1 });
        fetchResourcesPage();
      },
      setPage: (page: number) => {
        const max = store.totalPages();
        const clamped = Math.max(1, Math.min(page, max));
        patchState(store, { currentPage: clamped });
        fetchResourcesPage();
      },
      setPageSize: (size: number) => {
        patchState(store, { pageSize: size, currentPage: 1 });
        fetchResourcesPage();
      },
      selectResource: (resource: CatalogResource | null) => {
        patchState(store, { selectedResource: resource });
      },
      selectRun: (run: RunReport | null) => {
        patchState(store, { selectedRun: run });
      },
      setActiveRunId: (runId: string | null) => {
        patchState(store, { activeRunId: runId });
      },
      clearTechnicalReport: () => {
        patchState(store, { activeTechnicalReport: null });
      },
      refreshRuns: () => {
        service.getRuns(25).subscribe({
          next: (runs) => patchState(store, { runs }),
          error: () => {}
        });
      },
      triggerExtractionRun: (sourceId?: string | null): Observable<TriggerRunResponse> => {
        patchState(store, {
          triggeringSourceId: sourceId || 'ALL',
          runTriggerMessage: null
        });
        return service.triggerExtractionRun(sourceId, true).pipe(
          tap((res) => {
            patchState(store, {
              triggeringSourceId: null,
              activeRunId: res.run_id || null,
              runTriggerMessage: res.message
            });
            setTimeout(() => {
              service.getRuns(25).subscribe((runs) => patchState(store, { runs }));
            }, 1500);
          }),
          catchError((err) => {
            patchState(store, {
              triggeringSourceId: null,
              runTriggerMessage:
                err.error?.detail || 'No se pudo iniciar la corrida de extracción.'
            });
            throw err;
          })
        );
      },
      cancelRun: (runId: string): Observable<CancelRunResponse> => {
        return service.cancelRun(runId).pipe(
          tap((res) => {
            patchState(store, { runTriggerMessage: res.message });
            setTimeout(() => {
              service.getRuns(25).subscribe((runs) => patchState(store, { runs }));
            }, 800);
          })
        );
      },
      updateResourceStatus: (
        resourceKey: string,
        status: FileProcessingStatus,
        overrideReason: string,
        errorText?: string | null
      ): Observable<CatalogResource> => {
        return service
          .updateResourceProcessingStatus(resourceKey, {
            processing_status: status,
            processing_error: errorText ?? null,
            actor: 'MANUAL_OPERATOR',
            override_reason: overrideReason
          })
          .pipe(
            tap((updated) => {
              const nextList = store
                .resources()
                .map((r) => (r.resource_key === resourceKey ? updated : r));
              const currSelected = store.selectedResource();
              patchState(store, {
                resources: nextList,
                selectedResource:
                  currSelected?.resource_key === resourceKey ? updated : currSelected
              });
            })
          );
      },
      loadDiscoveryCandidates: (includeDiscarded?: boolean) => {
        const inc = includeDiscarded ?? store.includeDiscardedCandidates();
        patchState(store, { includeDiscardedCandidates: inc, discoveryLoading: true });
        service.getDiscoveryCandidates(inc).subscribe({
          next: (candidates) =>
            patchState(store, { discoveryCandidates: candidates, discoveryLoading: false }),
          error: () => patchState(store, { discoveryLoading: false })
        });
      },
      runOpenDiscovery: (request: OpenDiscoverySearchRequest, liveProbe: boolean = true) => {
        patchState(store, { discoveryLoading: true, error: null });
        service.runOpenDiscovery(request, liveProbe).subscribe({
          next: (candidates) => {
            patchState(store, {
              discoveryCandidates: candidates,
              discoveryLoading: false
            });
          },
          error: (err) => {
            patchState(store, {
              discoveryLoading: false,
              error: err.error?.detail || 'Error durante la exploración de fuentes públicas.'
            });
          }
        });
      },
      promoteCandidate: (
        candidateId: string,
        request: PromoteCandidateRequest
      ): Observable<CatalogSource> => {
        return service.promoteDiscoveryCandidate(candidateId, request).pipe(
          tap((newSource) => {
            const existing = store.sources();
            const idx = existing.findIndex((s) => s.source_id === newSource.source_id);
            const nextSources =
              idx >= 0
                ? existing.map((s, i) => (i === idx ? newSource : s))
                : [...existing, newSource];
            const nextCandidates = store.discoveryCandidates().map((c) =>
              c.candidate_id === candidateId
                ? { ...c, status: 'APROBADA' as const, promoted_source_id: newSource.source_id }
                : c
            );
            patchState(store, {
              sources: nextSources,
              discoveryCandidates: nextCandidates
            });
            service
              .getResilienceCoverage()
              .subscribe((coverage) => patchState(store, { resilienceCoverage: coverage }));
          })
        );
      },
      discardCandidate: (
        candidateId: string,
        reason: string
      ): Observable<OpenDiscoveryCandidate> => {
        return service.discardDiscoveryCandidate(candidateId, reason).pipe(
          tap((updated) => {
            const list = store.includeDiscardedCandidates()
              ? store.discoveryCandidates().map((c) => (c.candidate_id === candidateId ? updated : c))
              : store.discoveryCandidates().filter((c) => c.candidate_id !== candidateId);
            patchState(store, { discoveryCandidates: list });
          })
        );
      },
      reactivateCandidate: (candidateId: string): Observable<OpenDiscoveryCandidate> => {
        return service.reactivateDiscoveryCandidate(candidateId).pipe(
          tap((updated) => {
            const list = store
              .discoveryCandidates()
              .map((c) => (c.candidate_id === candidateId ? updated : c));
            patchState(store, { discoveryCandidates: list });
          })
        );
      },
      dryRunSource: (
        sourceId: string,
        payload: DryRunPolicyRequest
      ): Observable<DryRunExtractionResponse> => {
        return service.dryRunSource(sourceId, payload);
      },
      probeContingencyUrl: (sourceId: string, url: string): Observable<ContingencyCandidate> => {
        return service.probeContingencyUrl(sourceId, url);
      },
      discoverContingencies: (sourceId: string, autoRegister: boolean = true) => {
        patchState(store, { contingencyLoading: true, contingencyResult: null });
        return service.discoverSourceContingencies(sourceId, autoRegister).pipe(
          tap((res) => {
            const nextSources = store.sources().map((s) =>
              s.source_id === sourceId
                ? {
                    ...s,
                    contingency_urls: res.updated_contingency_urls,
                    contingency_url: res.updated_contingency_urls[0] || s.contingency_url
                  }
                : s
            );
            patchState(store, {
              contingencyLoading: false,
              contingencyResult: res,
              sources: nextSources
            });
            service
              .getResilienceCoverage()
              .subscribe((coverage) => patchState(store, { resilienceCoverage: coverage }));
          }),
          catchError((err) => {
            patchState(store, { contingencyLoading: false });
            throw err;
          })
        );
      },
      clearContingencyResult: () => {
        patchState(store, { contingencyResult: null });
      },
      refreshAlerts: () => {
        patchState(store, { alertsLoading: true });
        forkJoin({
          alerts: service.getStructuralAlerts().pipe(catchError(() => of([]))),
          channels: service.getAlertChannels().pipe(catchError(() => of([])))
        }).subscribe({
          next: ({ alerts, channels }) =>
            patchState(store, { alerts, alertChannels: channels, alertsLoading: false }),
          error: () => patchState(store, { alertsLoading: false })
        });
      },
      updateAlertLifecycle: (
        alertId: string,
        payload: AlertLifecycleUpdateRequest
      ): Observable<StructuralAlert> => {
        return service.updateAlertLifecycle(alertId, payload).pipe(
          tap((updated) => {
            const next = store
              .alerts()
              .map((a) => (a.alert_id === alertId ? updated : a));
            patchState(store, { alerts: next });
          })
        );
      },
      saveAlertChannel: (channel: AlertChannelConfig): Observable<AlertChannelConfig> => {
        return service.saveAlertChannel(channel).pipe(
          tap((saved) => {
            const exists = store.alertChannels().some((c) => c.channel_id === saved.channel_id);
            const next = exists
              ? store.alertChannels().map((c) => (c.channel_id === saved.channel_id ? saved : c))
              : [...store.alertChannels(), saved];
            patchState(store, { alertChannels: next });
          })
        );
      },
      deleteAlertChannel: (channelId: string): Observable<{ deleted: boolean; channel_id: string }> => {
        return service.deleteAlertChannel(channelId).pipe(
          tap(() => {
            patchState(store, {
              alertChannels: store.alertChannels().filter((c) => c.channel_id !== channelId)
            });
          })
        );
      },
      testAlertChannel: (channelId: string): Observable<AlertDeliveryLog> => {
        return service.testAlertChannel(channelId);
      },
      verifyStructureLive: (sourceId: string) => {
        patchState(store, { alertsLoading: true });
        service.verifySourceStructure(sourceId).subscribe({
          next: (report) => {
            patchState(store, {
              activeTechnicalReport: report,
              alertsLoading: false
            });
            service.getStructuralAlerts().subscribe((alerts) => patchState(store, { alerts }));
            service.getSources().subscribe((sources) => patchState(store, { sources }));
          },
          error: () => patchState(store, { alertsLoading: false })
        });
      },
      openMaintenanceReport: (sourceId: string) => {
        patchState(store, { alertsLoading: true });
        service.getMaintenanceReport(sourceId).subscribe({
          next: (report) => {
            patchState(store, {
              activeTechnicalReport: report,
              alertsLoading: false
            });
          },
          error: () => patchState(store, { alertsLoading: false })
        });
      },
      loadStorageStatus: () => {
        patchState(store, { storageLoading: true });
        service
          .getStorageStatus()
          .pipe(
            tap((status) => {
              patchState(store, { storageStatus: status, storageLoading: false });
            }),
            catchError(() => {
              patchState(store, {
                storageLoading: false,
                storageMessage: 'No se pudo obtener estado del almacenamiento.'
              });
              return of(null);
            })
          )
          .subscribe();
      },
      triggerBackup: (): Observable<BackupSyncResult> => {
        patchState(store, {
          storageLoading: true,
          storageMessage: 'Generando instantánea de respaldo del catálogo...'
        });
        return service.triggerStorageBackup().pipe(
          tap((res) => {
            patchState(store, {
              storageLoading: false,
              storageMessage: `Respaldo registrado: ${res.backup_id} (${res.sources_backed_up} portales, ${res.resources_backed_up} archivos)`
            });
            service.getStorageStatus().subscribe((status) => {
              patchState(store, { storageStatus: status });
            });
          }),
          catchError((err) => {
            patchState(store, {
              storageLoading: false,
              storageMessage: 'No fue posible completar el respaldo.'
            });
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
            const newSources = [...currentSources];
            if (idx >= 0) {
              newSources[idx] = updatedSource;
            } else {
              newSources.push(updatedSource);
            }
            patchState(store, { sources: newSources, loading: false });
            service
              .getResilienceCoverage()
              .subscribe((coverage) => patchState(store, { resilienceCoverage: coverage }));
          }),
          catchError((err) => {
            patchState(store, {
              loading: false,
              error: 'Error al actualizar los parámetros de la fuente.'
            });
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
