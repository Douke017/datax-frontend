import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { InternoService } from '../../../core/services/interno.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DatamartDictionaryDetail,
  DatamartLineageEntry,
  DatamartSummaryItem,
  LineageIntegrityCheckResult,
  ReadOnlySqlResponse,
  SelfServiceAccessLog,
  SelfServiceApiKey
} from '../../../core/models/analytics.model';
import { GlobalCatalogSearchResponse } from '../../../core/models/reconciliation.model';
import { CodeSnippetsPanelComponent } from '../../../shared/components/code-snippets-panel/code-snippets-panel.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import {
  formatIntegerBo,
  formatIsoDateShort,
  formatLatencyMs,
  formatMetricCell,
  isNumericMetricColumn
} from '../../../shared/utils/format.utils';

type DatasetViewTab = 'preview' | 'schema' | 'code' | 'sql';

@Component({
  selector: 'app-interno-activos',
  standalone: true,
  imports: [CommonModule, FormsModule, CodeSnippetsPanelComponent, SkeletonLoaderComponent],
  templateUrl: './interno-activos.component.html',
  styleUrl: './interno-activos.component.css'
})
export class InternoActivosComponent implements OnInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  readonly internoService = inject(InternoService);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatInt = formatIntegerBo;
  readonly formatMs = formatLatencyMs;
  readonly formatDate = formatIsoDateShort;

  readonly activeViewTab = signal<DatasetViewTab>('preview');

  // Catálogo de conjuntos de datos disponibles
  readonly datamarts = signal<DatamartSummaryItem[]>([]);
  readonly datamartsLoading = signal<boolean>(false);
  readonly selectedDatamart = signal<string>('catalogo_series_files');
  readonly materializing = signal<boolean>(false);

  // Vista previa automática de datos (sin necesidad de escribir SQL)
  readonly previewColumns = signal<string[]>([]);
  readonly previewRows = signal<Record<string, unknown>[]>([]);
  readonly previewTotalRows = signal<number>(0);
  readonly previewElapsedMs = signal<number | null>(null);
  readonly previewLoading = signal<boolean>(false);
  readonly previewError = signal<string | null>(null);
  previewLimit = 50;
  readonly previewFilterText = signal<string>('');

  // Buscador global por nombre de columna o archivo
  columnSearchQuery = '';
  readonly columnSearchLoading = signal<boolean>(false);
  readonly columnSearchResult = signal<GlobalCatalogSearchResponse | null>(null);

  // Diccionario de columnas y origen documental SHA-256
  readonly dictionary = signal<DatamartDictionaryDetail | null>(null);
  readonly lineageEntries = signal<DatamartLineageEntry[]>([]);
  readonly verificationResults = signal<Record<string, LineageIntegrityCheckResult>>({});
  readonly verifyingAssetId = signal<string | null>(null);

  // Filtro SQL opcional (solo lectura)
  readonly sqlTables = signal<string[]>([]);
  sqlQueryText = 'SELECT * FROM catalogo_series_files LIMIT 50';
  sqlLimit = 200;
  readonly sqlRunning = signal<boolean>(false);
  readonly sqlError = signal<string | null>(null);
  readonly sqlResult = signal<ReadOnlySqlResponse | null>(null);
  readonly sqlExporting = signal<boolean>(false);

  // Llaves API opcionales (dentro de bloque plegable secundario)
  readonly apiKeys = signal<SelfServiceApiKey[]>([]);
  readonly accessLogs = signal<SelfServiceAccessLog[]>([]);
  readonly newlyIssuedKey = signal<SelfServiceApiKey | null>(null);
  readonly creatingKey = signal<boolean>(false);
  newKeyLabel = 'Script Ciencia de Datos (Python / R)';
  newKeyExpiryDays: number | null = 90;

  private qpSub?: Subscription;

  readonly activeSummary = computed<DatamartSummaryItem | undefined>(() =>
    this.datamarts().find((d) => d.datamart === this.selectedDatamart())
  );

  readonly filteredPreviewRows = computed<Record<string, unknown>[]>(() => {
    const term = this.previewFilterText().trim().toLowerCase();
    const rows = this.previewRows();
    if (!term) return rows;
    return rows.filter((row) =>
      Object.values(row).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(term))
    );
  });

  readonly activeRawApiKey = computed<string>(
    () => this.newlyIssuedKey()?.raw_api_key || this.newlyIssuedKey()?.api_key || ''
  );

  ngOnInit(): void {
    this.loadDatamartsOverview();
    this.loadSqlTables();
    this.loadDatasetContext(this.selectedDatamart());
    this.loadApiKeysAndLogs();

    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const dm = params.get('datamart');
      if (dm && dm !== this.selectedDatamart()) {
        this.selectDatamart(dm);
      }
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

  loadDatamartsOverview(): void {
    this.datamartsLoading.set(true);
    this.analyticsService.getDatamartsSummary().subscribe({
      next: (list) => {
        this.datamarts.set(list);
        this.datamartsLoading.set(false);
        if (list.length > 0 && !list.some((d) => d.datamart === this.selectedDatamart())) {
          this.selectDatamart(list[0].datamart);
        }
      },
      error: () => {
        this.datamartsLoading.set(false);
      }
    });
  }

  loadSqlTables(): void {
    this.analyticsService.getSqlTables().subscribe({
      next: (res) => this.sqlTables.set(res.tables || []),
      error: () => this.sqlTables.set([])
    });
  }

  selectDatamart(datamart: string): void {
    this.selectedDatamart.set(datamart);
    this.previewFilterText.set('');
    this.sqlQueryText = `SELECT * FROM ${datamart} LIMIT 50`;
    this.sqlResult.set(null);
    this.sqlError.set(null);
    this.loadDatasetContext(datamart);
  }

  loadDatasetContext(datamart: string): void {
    this.loadPreview(datamart);
    this.analyticsService.getDatamartDictionary(datamart).subscribe({
      next: (dict) => this.dictionary.set(dict),
      error: () => this.dictionary.set(null)
    });
    this.analyticsService.getDatamartLineage(datamart, 40).subscribe({
      next: (entries) => this.lineageEntries.set(entries),
      error: () => this.lineageEntries.set([])
    });
  }

  loadPreview(datamart: string = this.selectedDatamart()): void {
    this.previewLoading.set(true);
    this.previewError.set(null);
    this.analyticsService.queryDatamart({ datamart }).subscribe({
      next: (res) => {
        this.previewColumns.set(res.columns || []);
        this.previewRows.set((res.records || []).slice(0, Number(this.previewLimit) || 50));
        this.previewTotalRows.set(res.total_records || 0);
        this.previewElapsedMs.set(res.execution_time_ms ?? null);
        this.previewLoading.set(false);
      },
      error: (err) => {
        this.previewRows.set([]);
        this.previewColumns.set([]);
        this.previewTotalRows.set(0);
        this.previewLoading.set(false);
        this.previewError.set(
          err?.error?.detail ||
            'No se pudo cargar la vista previa. Verifique si el conjunto ya fue consolidado en Parquet.'
        );
      }
    });
  }

  onSearchColumnsGlobal(): void {
    const term = this.columnSearchQuery.trim();
    if (!term) {
      this.columnSearchResult.set(null);
      return;
    }
    this.columnSearchLoading.set(true);
    this.internoService.searchGlobalCatalog({ column: term, q: term, limit: 25 }).subscribe({
      next: (res) => {
        this.columnSearchResult.set(res);
        this.columnSearchLoading.set(false);
      },
      error: () => {
        this.columnSearchLoading.set(false);
        this.toast.error('No se pudo ejecutar la búsqueda por columna');
      }
    });
  }

  clearColumnSearch(): void {
    this.columnSearchQuery = '';
    this.columnSearchResult.set(null);
  }

  jumpToRawAsset(assetId: string): void {
    this.router.navigate(['/interno'], {
      queryParams: { tab: 'custodia', inspect: assetId }
    });
  }

  openDatasetFromSearch(datamart: string): void {
    this.selectDatamart(datamart);
    this.activeViewTab.set('preview');
    this.columnSearchResult.set(null);
  }

  getExportHref(format: 'parquet' | 'csv' | 'jsonl' | 'xlsx'): string {
    return this.analyticsService.buildExportUrl(format, {
      datamart: this.selectedDatamart()
    });
  }

  onRegenerateParquet(): void {
    this.materializing.set(true);
    this.analyticsService.materializeGold().subscribe({
      next: (res) => {
        this.materializing.set(false);
        this.toast.success(
          'Archivos Parquet actualizados',
          `${formatIntegerBo(res.total_gold_records)} registros disponibles para descarga.`
        );
        this.loadDatamartsOverview();
        this.loadSqlTables();
        this.loadDatasetContext(this.selectedDatamart());
      },
      error: (err) => {
        this.materializing.set(false);
        this.toast.error('No se pudieron regenerar los archivos Parquet', err?.error?.detail || '');
      }
    });
  }

  onVerifyAsset(assetId: string): void {
    this.verifyingAssetId.set(assetId);
    this.analyticsService.verifyAssetIntegrity(assetId).subscribe({
      next: (res) => {
        this.verificationResults.set({
          ...this.verificationResults(),
          [assetId]: res
        });
        this.verifyingAssetId.set(null);
        if (res.is_valid) {
          this.toast.success('Integridad SHA-256 confirmada en disco', res.asset_id);
        } else {
          this.toast.error('Inconsistencia SHA-256 detectada', res.verification_message);
        }
      },
      error: () => {
        this.verifyingAssetId.set(null);
        this.toast.error('Error al verificar integridad del archivo');
      }
    });
  }

  insertTableSnippet(tableName: string): void {
    this.sqlQueryText = `SELECT * FROM ${tableName} LIMIT 50`;
  }

  onExecuteSql(): void {
    const sql = this.sqlQueryText.trim();
    if (!sql) return;
    this.sqlRunning.set(true);
    this.sqlError.set(null);
    this.analyticsService
      .executeReadOnlySql({ sql, limit: Number(this.sqlLimit) || 200 })
      .subscribe({
        next: (res) => {
          this.sqlResult.set(res);
          this.sqlRunning.set(false);
        },
        error: (err) => {
          this.sqlRunning.set(false);
          const msg = err?.error?.detail || 'Consulta rechazada. Solo se permiten sentencias SELECT.';
          this.sqlError.set(msg);
          this.toast.error('Consulta SQL rechazada', msg);
        }
      });
  }

  onExportSql(format: 'parquet' | 'csv' | 'jsonl'): void {
    const sql = this.sqlQueryText.trim();
    if (!sql) return;
    this.sqlExporting.set(true);
    this.analyticsService.exportReadOnlySql(sql, format, 10000).subscribe({
      next: (blob) => {
        this.sqlExporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.selectedDatamart()}_filtrado.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success(`Resultado exportado en ${format.toUpperCase()}`);
      },
      error: (err) => {
        this.sqlExporting.set(false);
        this.toast.error('No se pudo exportar la consulta', err?.error?.detail || '');
      }
    });
  }

  loadApiKeysAndLogs(): void {
    this.analyticsService.getApiKeys().subscribe({
      next: (keys) => this.apiKeys.set(keys),
      error: () => {}
    });
    this.analyticsService.getAccessLogs(20).subscribe({
      next: (logs) => this.accessLogs.set(logs),
      error: () => {}
    });
  }

  onCreateApiKey(): void {
    const label = this.newKeyLabel.trim();
    if (!label) return;
    this.creatingKey.set(true);
    this.analyticsService
      .createApiKey({
        label,
        allowed_datamarts: '*',
        allowed_layers: ['RAW', 'GOLD', 'SQL'],
        expires_in_days: this.newKeyExpiryDays ? Number(this.newKeyExpiryDays) : null
      })
      .subscribe({
        next: (created) => {
          this.newlyIssuedKey.set(created);
          this.creatingKey.set(false);
          this.loadApiKeysAndLogs();
          this.toast.success('Llave de acceso creada', 'Cópiela ahora; se integra automáticamente en los fragmentos Python/R.');
        },
        error: (err) => {
          this.creatingKey.set(false);
          this.toast.error('No se pudo generar la llave', err?.error?.detail || '');
        }
      });
  }

  onRevokeApiKey(keyId: string): void {
    this.analyticsService.revokeApiKey(keyId).subscribe({
      next: () => {
        if (this.newlyIssuedKey()?.key_id === keyId) {
          this.newlyIssuedKey.set(null);
        }
        this.loadApiKeysAndLogs();
        this.toast.warning('Llave revocada', keyId);
      },
      error: () => this.toast.error('No se pudo revocar la llave')
    });
  }

  formatDatasetTitle(dm: DatamartSummaryItem): string {
    if (dm.title && dm.title.trim()) return dm.title;
    return dm.datamart.replace(/_/g, ' ');
  }

  isNumericCol(col: string): boolean {
    return isNumericMetricColumn(col);
  }

  formatCell(col: string, val: unknown): string {
    return formatMetricCell(col, val);
  }
}
