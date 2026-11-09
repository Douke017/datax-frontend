import { inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, forkJoin, Observable, retry } from 'rxjs';
import {
  BackupSyncResult,
  CatalogResource,
  CatalogSource,
  ContingencyEvaluationResponse,
  FileProcessingStatus,
  MaintenanceTechnicalReport,
  OpenDiscoveryCandidate,
  OpenDiscoverySearchRequest,
  PromoteCandidateRequest,
  RunReport,
  SourcePolicyUpdate,
  StorageStatus,
  StructuralAlert
} from '../../core/models/catalog.model';
import { ExternoService } from '../../core/services/externo.service';

export interface ExternoState {
  sources: CatalogSource[];
  selectedSourceId: string;
  resources: CatalogResource[];
  selectedResource: CatalogResource | null;
  runs: RunReport[];
  selectedRun: RunReport | null;
  discoveryCandidates: OpenDiscoveryCandidate[];
  discoveryLoading: boolean;
  alerts: StructuralAlert[];
  alertsLoading: boolean;
  activeTechnicalReport: MaintenanceTechnicalReport | null;
  contingencyResult: ContingencyEvaluationResponse | null;
  contingencyLoading: boolean;
  runTriggerMessage: string | null;
  triggeringSourceId: string | null;
  searchQuery: string;
  extensionFilter: string;
  statusFilter: string;
  processingFilter: 'ALL' | FileProcessingStatus;
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
  discoveryCandidates: [],
  discoveryLoading: false,
  alerts: [],
  alertsLoading: false,
  activeTechnicalReport: null,
  contingencyResult: null,
  contingencyLoading: false,
  runTriggerMessage: null,
  triggeringSourceId: null,
  searchQuery: '',
  extensionFilter: 'ALL',
  statusFilter: 'ALL',
  processingFilter: 'ALL',
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
  withComputed(
    ({
      sources,
      resources,
      alerts,
      selectedSourceId,
      searchQuery,
      extensionFilter,
      statusFilter,
      processingFilter,
      currentPage,
      pageSize
    }) => {
      return {
        filteredResources: () => {
          let list = resources();

          const srcId = selectedSourceId();
          if (srcId !== 'ALL') {
            list = list.filter((r) => r.source_id.toLowerCase() === srcId.toLowerCase());
          }

          const ext = extensionFilter();
          if (ext !== 'ALL') {
            list = list.filter((r) => r.file_extension?.toLowerCase() === ext.toLowerCase());
          }

          const status = statusFilter();
          if (status !== 'ALL') {
            list = list.filter((r) => r.change_status.toUpperCase() === status.toUpperCase());
          }

          const proc = processingFilter();
          if (proc !== 'ALL') {
            list = list.filter((r) => (r.processing_status || 'PENDIENTE') === proc);
          }

          const query = searchQuery().toLowerCase().trim();
          if (query) {
            list = list.filter(
              (r) =>
                (r.title && r.title.toLowerCase().includes(query)) ||
                r.url.toLowerCase().includes(query) ||
                (r.period_label && r.period_label.toLowerCase().includes(query)) ||
                r.resource_key.toLowerCase().includes(query)
            );
          }

          return list;
        },
        totalDiscovered: () =>
          resources().length ||
          sources().reduce((acc, s) => acc + (s.baseline_resource_count || 0), 0),
        activeSourcesCount: () => sources().filter((s) => s.health_status === 'ACTIVE').length,
        warningSourcesCount: () => sources().filter((s) => s.health_status === 'WARNING').length,
        suspendedSourcesCount: () => sources().filter((s) => s.health_status === 'SUSPENDED').length,
        criticalAlertsCount: () => alerts().filter((a) => a.severity === 'CRITICA').length,
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
      };
    }
  ),
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
            health: service
              .checkHealth()
              .pipe(retry({ count: 3, delay: 1000 }), catchError(() => of({ status: 'OFFLINE', service: 'catalog-api' }))),
            sources: service.getSources().pipe(retry({ count: 3, delay: 1000 }), catchError(() => of([]))),
            resources: service.getResources().pipe(retry({ count: 3, delay: 1000 }), catchError(() => of([]))),
            runs: service.getRuns().pipe(retry({ count: 2, delay: 1000 }), catchError(() => of([]))),
            alerts: service.getStructuralAlerts().pipe(retry({ count: 2, delay: 1000 }), catchError(() => of([]))),
            candidates: service.getDiscoveryCandidates().pipe(retry({ count: 2, delay: 1000 }), catchError(() => of([])))
          }).pipe(
            tap(({ health, sources, resources, runs, alerts, candidates }) => {
              patchState(store, {
                serviceStatus: health.status,
                sources,
                resources,
                runs,
                alerts,
                discoveryCandidates: candidates,
                loading: false
              });
            }),
            catchError(() => {
              patchState(store, {
                loading: false,
                error: 'No fue posible consultar el servicio del Prospector Externo.'
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
      setProcessingFilter: (proc: 'ALL' | FileProcessingStatus) => {
        patchState(store, { processingFilter: proc, currentPage: 1 });
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
      clearTechnicalReport: () => {
        patchState(store, { activeTechnicalReport: null });
      },
      triggerExtractionRun: (sourceId?: string | null) => {
        patchState(store, {
          triggeringSourceId: sourceId || 'ALL',
          runTriggerMessage: null
        });
        service.triggerExtractionRun(sourceId, true).subscribe({
          next: (res) => {
            patchState(store, {
              triggeringSourceId: null,
              runTriggerMessage: res.message
            });
            setTimeout(() => {
              service.getRuns().subscribe((runs) => patchState(store, { runs }));
            }, 2500);
          },
          error: (err) => {
            patchState(store, {
              triggeringSourceId: null,
              runTriggerMessage:
                err.error?.detail || 'No se pudo iniciar la corrida de extracción.'
            });
          }
        });
      },
      updateResourceStatus: (
        resourceKey: string,
        status: FileProcessingStatus,
        errorText?: string | null
      ) => {
        service.updateResourceProcessingStatus(resourceKey, status, errorText).subscribe({
          next: (updated) => {
            const nextList = store
              .resources()
              .map((r) => (r.resource_key === resourceKey ? updated : r));
            const currSelected = store.selectedResource();
            patchState(store, {
              resources: nextList,
              selectedResource:
                currSelected?.resource_key === resourceKey ? updated : currSelected
            });
          }
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
          })
        );
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
        service.getStructuralAlerts().subscribe({
          next: (alerts) => patchState(store, { alerts, alertsLoading: false }),
          error: () => patchState(store, { alertsLoading: false })
        });
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
