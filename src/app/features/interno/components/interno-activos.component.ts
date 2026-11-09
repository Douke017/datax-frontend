import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { InstitutionStateService } from '../../../core/services/institution-state.service';
import {
  DatamartDictionaryDetail,
  DatamartLineageEntry,
  DatamartRelationshipItem,
  DatamartSummaryItem,
  GoldDimensions,
  LineageIntegrityCheckResult,
  PredefinedViewMetadata,
  SelfServiceAccessLog,
  SelfServiceApiKey
} from '../../../core/models/analytics.model';
import {
  formatInteger,
  formatMetricCell,
  isNumericMetricColumn
} from '../../../shared/utils/format.utils';

type ActivosSubTab = 'explorer' | 'dictionary' | 'connectors';

@Component({
  selector: 'app-interno-activos',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe, DatePipe],
  templateUrl: './interno-activos.component.html',
  styleUrl: './interno-activos.component.css'
})
export class InternoActivosComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly institutionState = inject(InstitutionStateService);

  readonly formatInt = formatInteger;

  readonly activeSubTab = signal<ActivosSubTab>('explorer');

  // Repositorios consolidados multi-fuente (52+ fuentes)
  readonly datamarts = signal<DatamartSummaryItem[]>([]);
  readonly selectedDatamart = signal<string>('catalogo_series_files');
  readonly materializing = signal<boolean>(false);
  readonly materializeMessage = signal<string>('');

  // Consulta directa y vistas preestablecidas
  readonly dimensions = signal<GoldDimensions | null>(null);
  readonly predefinedViews = signal<PredefinedViewMetadata[]>([]);
  readonly selectedQueryMode = signal<string>('DIRECT_TABLE');
  readonly selectedInstitution = signal<string>('');
  readonly selectedGestion = signal<number | null>(null);
  readonly selectedMes = signal<number | null>(null);
  readonly resultLimit = signal<number>(50);

  readonly tableColumns = signal<string[]>([]);
  readonly tableRecords = signal<Record<string, unknown>[]>([]);
  readonly totalRecordsCount = signal<number>(0);
  readonly loadingData = signal<boolean>(false);

  // Catálogo técnico, relaciones y cadena de custodia
  readonly dictionary = signal<DatamartDictionaryDetail | null>(null);
  readonly relationships = signal<DatamartRelationshipItem[]>([]);
  readonly lineageEntries = signal<DatamartLineageEntry[]>([]);
  readonly verificationResults = signal<Record<string, LineageIntegrityCheckResult>>({});
  readonly verifyingAssetId = signal<string | null>(null);

  // Conectores Excel Power Query / Power BI (API Keys)
  readonly apiKeys = signal<SelfServiceApiKey[]>([]);
  readonly accessLogs = signal<SelfServiceAccessLog[]>([]);
  readonly newlyIssuedKey = signal<SelfServiceApiKey | null>(null);
  readonly creatingKey = signal<boolean>(false);
  readonly copiedToken = signal<string>('');

  newKeyLabel = 'Conector Directo Excel Power Query — Ciencia de Datos';
  newKeyScope = '*';

  readonly activeDatamartSummary = computed<DatamartSummaryItem | undefined>(() =>
    this.datamarts().find((d) => d.datamart === this.selectedDatamart())
  );

  readonly columnMetaMap = computed<Record<string, { label: string; unit?: string | null }>>(() => {
    const dict = this.dictionary();
    const map: Record<string, { label: string; unit?: string | null }> = {};
    if (dict) {
      for (const col of dict.columns) {
        map[col.column_name] = { label: col.business_label, unit: col.unit };
      }
    }
    return map;
  });

  readonly activeFeedUrl = computed<string>(() => {
    const rawKey = this.newlyIssuedKey()?.raw_api_key || 'INGRESE_SU_LLAVE_DE_ACCESO';
    return this.analyticsService.buildLiveFeedUrl(this.selectedDatamart(), rawKey, 'csv');
  });

  readonly powerQueryFormula = computed<string>(() => {
    const url = this.activeFeedUrl();
    return [
      'let',
      `    Origen = Csv.Document(Web.Contents("${url}"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.None]),`,
      '    EncabezadosPromovidos = Table.PromoteHeaders(Origen, [PromoteAllScalars=true])',
      'in',
      '    EncabezadosPromovidos'
    ].join('\n');
  });

  private lastSyncedInst = this.institutionState.currentInstitutionId();

  constructor() {
    effect(() => {
      const inst = this.institutionState.currentInstitutionId();
      if (inst && inst !== this.lastSyncedInst) {
        this.lastSyncedInst = inst;
        this.selectedInstitution.set(inst.toUpperCase());
        this.executeCurrentQuery();
      }
    });
  }

  ngOnInit(): void {
    this.loadDatamartsOverview();
    this.loadDatamartContext(this.selectedDatamart());
    this.loadSelfServiceKeysAndLogs();
  }

  loadDatamartsOverview(): void {
    this.analyticsService.getDatamartsSummary().subscribe({
      next: (list) => this.datamarts.set(list),
      error: () => {}
    });
  }

  selectDatamart(datamart: string): void {
    this.selectedDatamart.set(datamart);
    this.selectedInstitution.set('');
    this.selectedGestion.set(null);
    this.selectedMes.set(null);
    this.selectedQueryMode.set('DIRECT_TABLE');
    this.loadDatamartContext(datamart);
  }

  private loadDatamartContext(datamart: string): void {
    this.analyticsService.getDimensions(datamart).subscribe({
      next: (dims) => this.dimensions.set(dims),
      error: () => this.dimensions.set(null)
    });

    this.analyticsService.getPredefinedViews(datamart).subscribe({
      next: (views) => this.predefinedViews.set(views),
      error: () => this.predefinedViews.set([])
    });

    this.analyticsService.getDatamartDictionary(datamart).subscribe({
      next: (dict) => this.dictionary.set(dict),
      error: () => this.dictionary.set(null)
    });

    this.analyticsService.getRelationships(datamart).subscribe({
      next: (rels) => this.relationships.set(rels),
      error: () => this.relationships.set([])
    });

    this.analyticsService.getDatamartLineage(datamart, 60).subscribe({
      next: (entries) => this.lineageEntries.set(entries),
      error: () => this.lineageEntries.set([])
    });

    this.executeCurrentQuery();
  }

  executeCurrentQuery(): void {
    const dm = this.selectedDatamart();
    const mode = this.selectedQueryMode();
    this.loadingData.set(true);

    if (mode === 'DIRECT_TABLE') {
      this.analyticsService
        .queryDatamart({
          datamart: dm,
          institutions: this.selectedInstitution() ? [this.selectedInstitution()] : null,
          gestiones: this.selectedGestion() !== null ? [this.selectedGestion()!] : null,
          meses: this.selectedMes() !== null ? [this.selectedMes()!] : null
        })
        .subscribe({
          next: (res) => {
            const limit = this.resultLimit();
            this.tableColumns.set(res.columns);
            this.tableRecords.set(res.records.slice(0, limit));
            this.totalRecordsCount.set(res.total_records);
            this.loadingData.set(false);
          },
          error: () => {
            this.tableRecords.set([]);
            this.totalRecordsCount.set(0);
            this.loadingData.set(false);
          }
        });
    } else {
      this.analyticsService
        .executePredefinedView(mode, {
          institutions: this.selectedInstitution() ? [this.selectedInstitution()] : null,
          gestion: this.selectedGestion(),
          mes: this.selectedMes(),
          limit: this.resultLimit()
        })
        .subscribe({
          next: (res) => {
            this.tableColumns.set(res.columns);
            this.tableRecords.set(res.records);
            this.totalRecordsCount.set(res.total_records);
            this.loadingData.set(false);
          },
          error: () => {
            this.tableRecords.set([]);
            this.totalRecordsCount.set(0);
            this.loadingData.set(false);
          }
        });
    }
  }

  onMaterializeAll(): void {
    this.materializing.set(true);
    this.materializeMessage.set('Consolidando los 5 repositorios de las 52+ fuentes...');
    this.analyticsService.materializeGold().subscribe({
      next: (res) => {
        this.materializing.set(false);
        this.materializeMessage.set(
          `Consolidación completada: ${formatInteger(res.total_gold_records)} registros multi-fuente estructurados y disponibles para consulta.`
        );
        this.loadDatamartsOverview();
        this.loadDatamartContext(this.selectedDatamart());
        setTimeout(() => this.materializeMessage.set(''), 6000);
      },
      error: () => {
        this.materializing.set(false);
        this.materializeMessage.set('No fue posible completar la consolidación en este momento.');
      }
    });
  }

  getExportHref(format: 'xlsx' | 'csv'): string {
    return this.analyticsService.buildExportUrl(format, {
      datamart: this.selectedDatamart(),
      gestion: this.selectedGestion(),
      mes: this.selectedMes(),
      institutionId: this.selectedInstitution() || null
    });
  }

  getColumnHeader(col: string): string {
    const meta = this.columnMetaMap()[col];
    if (meta?.label) return meta.label;
    return col.replace(/_/g, ' ');
  }

  isNumericCol(col: string): boolean {
    const meta = this.columnMetaMap()[col];
    if (meta?.unit) return true;
    return isNumericMetricColumn(col);
  }

  formatCell(col: string, val: unknown): string {
    const unit = this.columnMetaMap()[col]?.unit;
    return formatMetricCell(col, val, unit);
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
      },
      error: () => {
        this.verifyingAssetId.set(null);
      }
    });
  }

  loadSelfServiceKeysAndLogs(): void {
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
        allowed_datamarts: this.newKeyScope
      })
      .subscribe({
        next: (created) => {
          this.newlyIssuedKey.set(created);
          this.creatingKey.set(false);
          this.loadSelfServiceKeysAndLogs();
        },
        error: () => {
          this.creatingKey.set(false);
        }
      });
  }

  onRevokeApiKey(keyId: string): void {
    this.analyticsService.revokeApiKey(keyId).subscribe({
      next: () => {
        if (this.newlyIssuedKey()?.key_id === keyId) {
          this.newlyIssuedKey.set(null);
        }
        this.loadSelfServiceKeysAndLogs();
      }
    });
  }

  copyText(text: string, tokenName: string): void {
    navigator.clipboard.writeText(text);
    this.copiedToken.set(tokenName);
    setTimeout(() => {
      if (this.copiedToken() === tokenName) {
        this.copiedToken.set('');
      }
    }, 2500);
  }

  formatDatamartName(dm: string): string {
    switch (dm) {
      case 'catalogo_series_files':
        return 'Catálogo de Series y Archivos Fuente (D_BO_* / A_*)';
      case 'historial_descargas_bruto':
        return 'Archivos Descargados en Bruto (Download & DAGs)';
      case 'reportes_conversiones':
        return 'Reportes Extraídos y Conversiones (D_BO_*_xx)';
      case 'bases_datos_cubos':
        return 'Bases de Datos Consolidadas (DB_BO_* / S_BO*) y Cubos';
      case 'mapa_web_52_fuentes':
        return 'Mapa Unificado de las 52 Fuentes (Externo ↔ Interno)';
      case '*':
        return 'Todos los Repositorios (*)';
      default:
        return dm;
    }
  }
}
