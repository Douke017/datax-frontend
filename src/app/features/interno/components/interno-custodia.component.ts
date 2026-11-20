import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InternoStore } from '../interno.store';
import { InventoryStore } from '../inventory.store';
import { InternoService } from '../../../core/services/interno.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  AssetTechnicalProfile,
  BronzeArtifactEntry
} from '../../../core/models/reconciliation.model';
import {
  DataGridColumn,
  DataGridComponent,
  DataGridFilterChip
} from '../../../shared/components/data-grid/data-grid.component';
import {
  DrawerTab,
  SlideOverDrawerComponent
} from '../../../shared/components/slide-over-drawer/slide-over-drawer.component';
import { CodeSnippetsPanelComponent } from '../../../shared/components/code-snippets-panel/code-snippets-panel.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import {
  formatBytesBo,
  formatIntegerBo,
  formatIsoDateShort,
  formatPercentage
} from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-interno-custodia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DataGridComponent,
    SlideOverDrawerComponent,
    CodeSnippetsPanelComponent,
    SkeletonLoaderComponent
  ],
  templateUrl: './interno-custodia.component.html',
  styleUrl: './interno-custodia.component.css'
})
export class InternoCustodiaComponent implements OnInit, OnDestroy {
  readonly store = inject(InternoStore);
  readonly inventoryStore = inject(InventoryStore);
  readonly internoService = inject(InternoService);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatInt = formatIntegerBo;
  readonly formatSize = formatBytesBo;
  readonly formatPct = formatPercentage;
  readonly formatDate = formatIsoDateShort;

  readonly selectedSourceForSync = signal<string>('bcb');

  // Slide-over drawer for automatic raw file profile & 20-row raw preview
  readonly inspectingArtifact = signal<BronzeArtifactEntry | null>(null);
  readonly drawerTab = signal<string>('profile');
  readonly profile = signal<AssetTechnicalProfile | null>(null);
  readonly profileLoading = signal<boolean>(false);
  readonly profileError = signal<string | null>(null);

  private qpSub?: Subscription;

  readonly columns: DataGridColumn[] = [
    { key: 'dataset_code', label: 'Dataset / Fuente', mono: true, width: '165px' },
    { key: 'file_path', label: 'Archivo Custodiado (Bruto)', mono: true },
    { key: 'period', label: 'Periodo', mono: true, width: '105px' },
    { key: 'size_bytes', label: 'Tamaño', align: 'right', mono: true, tabular: true, width: '110px' },
    { key: 'sha256_hash', label: 'Huella SHA-256', mono: true, width: '175px' },
    { key: 'downloaded_at', label: 'Custodiado', mono: true, width: '160px' },
    { key: 'actions', label: 'Acciones', width: '215px' }
  ];

  readonly rowKeyFn = (row: BronzeArtifactEntry): string => row.artifact_id;

  readonly drawerTabs = computed<DrawerTab[]>(() => [
    {
      id: 'profile',
      label: 'Perfil Técnico y Columnas',
      badge: this.profile()?.column_count ?? undefined
    },
    {
      id: 'sample',
      label: 'Muestra Cruda (20 filas)',
      badge: this.profile()?.sample_rows?.length ?? undefined
    },
    { id: 'code', label: 'Consumo Programático' }
  ]);

  readonly sampleColumns = computed<string[]>(() => {
    const p = this.profile();
    if (!p) return [];
    if (p.columns_summary && p.columns_summary.length > 0) {
      return p.columns_summary.map((c) => c.column_name);
    }
    const first = p.sample_rows?.[0];
    return first ? Object.keys(first) : [];
  });

  readonly filterChips = computed<DataGridFilterChip[]>(() => {
    const chips: DataGridFilterChip[] = [];
    if (this.store.sourceFilter() !== 'ALL') {
      chips.push({ key: 'source', label: 'Fuente', value: this.store.sourceFilter() });
    }
    if (this.store.periodFilter() !== 'ALL') {
      chips.push({ key: 'period', label: 'Periodo', value: this.store.periodFilter() });
    }
    if (this.store.searchQuery().trim()) {
      chips.push({ key: 'q', label: 'Búsqueda', value: this.store.searchQuery().trim() });
    }
    return chips;
  });

  readonly availableSyncSources = computed(() => {
    const base = ['bcb', 'asfi', 'ine', 'bbv', 'finrural', 'aps'];
    const dynamic = this.inventoryStore.sourcesList().map((s) => s.toLowerCase());
    return Array.from(new Set([...base, ...dynamic]));
  });

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const inspectId = params.get('inspect');
      const src = params.get('source');
      const period = params.get('period');
      const q = params.get('q');

      if (src !== null) this.store.setSourceFilter(src || 'ALL');
      if (period !== null) this.store.setPeriodFilter(period || 'ALL');
      if (q !== null) this.store.setSearchQuery(q || '');

      if (inspectId) {
        const found = this.store.artifacts().find((a) => a.artifact_id === inspectId);
        if (found) {
          this.openArtifactDrawer(found);
        } else {
          // Direct deep-link from global Ctrl+K even if not in Bronze list yet
          this.openProfileById(inspectId);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

  private syncQuery(patch: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'custodia', ...patch },
      queryParamsHandling: 'merge'
    });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.store.setSearchQuery(val);
    this.syncQuery({ q: val.trim() || null });
  }

  onSourceChange(val: string): void {
    this.store.setSourceFilter(val);
    this.syncQuery({ source: val === 'ALL' ? null : val });
  }

  onPeriodChange(val: string): void {
    this.store.setPeriodFilter(val);
    this.syncQuery({ period: val === 'ALL' ? null : val });
  }

  onRemoveChip(key: string): void {
    if (key === 'source') this.onSourceChange('ALL');
    if (key === 'period') this.onPeriodChange('ALL');
    if (key === 'q') {
      this.store.setSearchQuery('');
      this.syncQuery({ q: null });
    }
  }

  onClearAllChips(): void {
    this.store.setSourceFilter('ALL');
    this.store.setPeriodFilter('ALL');
    this.store.setSearchQuery('');
    this.syncQuery({ source: null, period: null, q: null });
  }

  openArtifactDrawer(artifact: BronzeArtifactEntry): void {
    this.inspectingArtifact.set(artifact);
    this.drawerTab.set('profile');
    this.loadProfile(artifact.artifact_id, false);
  }

  private openProfileById(assetId: string): void {
    this.inspectingArtifact.set({
      artifact_id: assetId,
      dataset_code: assetId,
      domain: 'Custodia Interna',
      file_path: assetId,
      sha256_hash: '',
      size_bytes: 0,
      downloaded_at: '',
      http_status: 200
    });
    this.drawerTab.set('profile');
    this.loadProfile(assetId, false);
  }

  loadProfile(assetId: string, refresh: boolean): void {
    this.profileLoading.set(true);
    this.profileError.set(null);
    this.profile.set(null);
    this.internoService.getAssetProfile(assetId, refresh).subscribe({
      next: (res) => {
        this.profile.set(res);
        this.profileLoading.set(false);
      },
      error: (err) => {
        this.profileLoading.set(false);
        this.profileError.set(
          err?.error?.detail ||
            `HTTP ${err?.status || 'ERR'}: No fue posible generar el perfil técnico del archivo.`
        );
      }
    });
  }

  closeDrawer(): void {
    this.inspectingArtifact.set(null);
    this.syncQuery({ inspect: null });
  }

  onExecuteSync(): void {
    this.store.runSyncBatch(this.selectedSourceForSync()).subscribe({
      next: (res) => {
        this.toast.success(
          `Lote de ${res.source_id.toUpperCase()} sincronizado`,
          `${res.completed_tasks} archivos resguardados con firma SHA-256.`
        );
      },
      error: () => {
        this.toast.error('No se pudo ejecutar la sincronización de lote');
      }
    });
  }

  formatCellValue(val: unknown): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
}
