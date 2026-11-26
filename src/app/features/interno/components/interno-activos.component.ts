import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DatamartDictionaryDetail,
  DatamartSummaryItem
} from '../../../core/models/analytics.model';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import {
  formatIntegerBo,
  formatLatencyMs,
  formatMetricCell,
  isNumericMetricColumn
} from '../../../shared/utils/format.utils';

interface CatalogDatasetOption {
  id: 'catalogo_series_files' | 'historial_descargas_bruto';
  label: string;
  subtitle: string;
}

const COLUMN_LABELS: Record<string, string> = {
  codigo_serie: 'Código de Robot',
  institucion_id: 'Código Institución',
  institucion_nombre: 'Institución',
  nombre_serie: 'Nombre del Archivo / Serie',
  tipo_serie: 'Tipo',
  formato_archivo: 'Formato',
  frecuencia_publicacion: 'Frecuencia',
  estado_serie: 'Estado',
  actualizado_hasta: 'Actualizado Hasta',
  total_descargas_bruto: 'Descargas',
  total_reportes_derivados: 'Reportes',
  url_principal: 'URL de Origen',
  id_descarga: 'ID Ejecución',
  fecha_datos: 'Fecha de Datos',
  fecha_descarga: 'Fecha de Descarga',
  estado_descarga: 'Estado Descarga',
  ruta_archivo_bruto: 'Archivo Almacenado',
  url_descarga: 'URL Descargada'
};

@Component({
  selector: 'app-interno-activos',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonLoaderComponent],
  templateUrl: './interno-activos.component.html',
  styleUrl: './interno-activos.component.css'
})
export class InternoActivosComponent implements OnInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly formatInt = formatIntegerBo;
  readonly formatMs = formatLatencyMs;

  readonly primaryDatasets: CatalogDatasetOption[] = [
    {
      id: 'catalogo_series_files',
      label: 'Catálogo de Robots y Series',
      subtitle: 'Robots de descarga registrados (manuales y automatizados) con su frecuencia, estado y URL.'
    },
    {
      id: 'historial_descargas_bruto',
      label: 'Historial de Descargas',
      subtitle: 'Registro cronológico de descargas ejecutadas y corridas de robots con ruta y estado.'
    }
  ];

  readonly datamarts = signal<DatamartSummaryItem[]>([]);
  readonly selectedDatamart = signal<'catalogo_series_files' | 'historial_descargas_bruto'>(
    'catalogo_series_files'
  );
  readonly syncing = signal<boolean>(false);

  // Consulta con búsqueda y paginación en servidor (cubre el 100% de registros)
  readonly columns = signal<string[]>([]);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly totalMatchingRows = signal<number>(0);
  readonly elapsedMs = signal<number | null>(null);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  searchTerm = '';
  pageSize = 50;
  readonly currentPage = signal<number>(1);

  // Diccionario técnico bajo bloque plegable (<details>)
  readonly dictionary = signal<DatamartDictionaryDetail | null>(null);

  private qpSub?: Subscription;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly activeOption = computed<CatalogDatasetOption>(
    () =>
      this.primaryDatasets.find((d) => d.id === this.selectedDatamart()) ||
      this.primaryDatasets[0]
  );

  readonly activeSummary = computed<DatamartSummaryItem | undefined>(() =>
    this.datamarts().find((d) => d.datamart === this.selectedDatamart())
  );

  readonly orderedColumns = computed<string[]>(() => {
    const cols = this.columns();
    if (cols.length === 0) return [];
    // Ocultar el slug interno institucion_id cuando ya existe el nombre legible institucion_nombre
    const visibleCols =
      cols.includes('institucion_nombre')
        ? cols.filter((c) => c !== 'institucion_id')
        : cols;
    const primaryKey = 'codigo_serie';
    if (!visibleCols.includes(primaryKey)) return visibleCols;
    return [primaryKey, ...visibleCols.filter((c) => c !== primaryKey)];
  });

  readonly totalPages = computed<number>(() =>
    Math.max(1, Math.ceil(this.totalMatchingRows() / Math.max(1, Number(this.pageSize) || 50)))
  );

  readonly rangeStart = computed<number>(() => {
    if (this.totalMatchingRows() === 0) return 0;
    return (this.currentPage() - 1) * (Number(this.pageSize) || 50) + 1;
  });

  readonly rangeEnd = computed<number>(() =>
    Math.min(this.currentPage() * (Number(this.pageSize) || 50), this.totalMatchingRows())
  );

  ngOnInit(): void {
    this.loadOverview();
    this.loadDataset(true);

    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const dm = params.get('datamart');
      if (dm === 'catalogo_series_files' || dm === 'historial_descargas_bruto') {
        if (dm !== this.selectedDatamart()) {
          this.selectDataset(dm);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  loadOverview(): void {
    this.analyticsService.getDatamartsSummary().subscribe({
      next: (list) => this.datamarts.set(list || []),
      error: () => {}
    });
  }

  getRowCountFor(id: string): number {
    return this.datamarts().find((d) => d.datamart === id)?.total_rows ?? 0;
  }

  selectDataset(id: 'catalogo_series_files' | 'historial_descargas_bruto'): void {
    if (this.selectedDatamart() === id) return;
    this.selectedDatamart.set(id);
    this.searchTerm = '';
    this.currentPage.set(1);
    this.loadDataset(true);
  }

  onSearchInput(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadDataset(false);
    }, 250);
  }

  onSearchSubmit(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.currentPage.set(1);
    this.loadDataset(false);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage.set(1);
    this.loadDataset(false);
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
    this.loadDataset(false);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadDataset(false);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadDataset(false);
    }
  }

  loadDataset(loadDictionary: boolean): void {
    const dm = this.selectedDatamart();
    const limit = Number(this.pageSize) || 50;
    const offset = (this.currentPage() - 1) * limit;
    const search = this.searchTerm.trim() || null;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.analyticsService
      .queryDatamart({ datamart: dm, search, limit, offset })
      .subscribe({
        next: (res) => {
          this.columns.set(res.columns || []);
          this.rows.set(res.records || []);
          this.totalMatchingRows.set(res.total_records || 0);
          this.elapsedMs.set(res.execution_time_ms ?? null);
          this.loading.set(false);
        },
        error: (err) => {
          this.columns.set([]);
          this.rows.set([]);
          this.totalMatchingRows.set(0);
          this.loading.set(false);
          this.errorMessage.set(
            err?.error?.detail ||
              'No se pudo cargar el catálogo. Pulse "Actualizar desde Base de Datos" para refrescar los registros.'
          );
        }
      });

    if (loadDictionary) {
      this.analyticsService.getDatamartDictionary(dm).subscribe({
        next: (dict) => this.dictionary.set(dict),
        error: () => this.dictionary.set(null)
      });
    }
  }

  onRefreshFromDatabase(): void {
    this.syncing.set(true);
    this.analyticsService.materializeGold(this.selectedDatamart()).subscribe({
      next: (res) => {
        this.syncing.set(false);
        this.toast.success(
          'Catálogo actualizado',
          `${formatIntegerBo(res.total_gold_records)} registros sincronizados desde la base de datos.`
        );
        this.loadOverview();
        this.currentPage.set(1);
        this.loadDataset(true);
      },
      error: (err) => {
        this.syncing.set(false);
        this.toast.error('No se pudo actualizar el catálogo', err?.error?.detail || '');
      }
    });
  }

  getExportHref(format: 'xlsx' | 'csv' | 'parquet'): string {
    return this.analyticsService.buildExportUrl(format, {
      datamart: this.selectedDatamart()
    });
  }

  columnLabel(col: string): string {
    return COLUMN_LABELS[col] || col.replace(/_/g, ' ');
  }

  isNumericCol(col: string): boolean {
    return isNumericMetricColumn(col);
  }

  isUrlCol(col: string): boolean {
    return col.includes('url');
  }

  isHttpUrl(val: unknown): boolean {
    return typeof val === 'string' && /^https?:\/\//i.test(val.trim());
  }

  formatCell(col: string, val: unknown): string {
    if (val === null || val === undefined || val === '') return '—';
    const raw = String(val).trim();
    if (col === 'tipo_serie') {
      if (raw === 'MANUAL_FILE') return 'Archivo manual';
      if (raw === 'AUTOMATIZADO_DAG') return 'Robot automatizado';
    }
    if (col === 'estado_serie' || col === 'estado_descarga') {
      const upper = raw.toUpperCase();
      if (upper === 'ACTIVO' || upper === 'ACTIVE') return 'Activo';
      if (upper === 'INACTIVO' || upper === 'INACTIVE') return 'Inactivo';
      if (upper === 'SUCCESS' || upper === 'COMPLETED') return 'Completada';
      if (upper === 'FAILED') return 'Con error';
      if (upper === 'RUNNING') return 'En curso';
    }
    if (col === 'frecuencia_publicacion' && raw.length > 0) {
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }
    if (col === 'ruta_archivo_bruto' && raw.startsWith('/')) {
      const parts = raw.split('/').filter(Boolean);
      return parts.length > 0 ? parts[parts.length - 1] : raw;
    }
    return formatMetricCell(col, val);
  }
}
