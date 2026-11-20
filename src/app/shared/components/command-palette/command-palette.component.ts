import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommandPaletteService } from '../../../core/services/command-palette.service';
import { ExternoStore } from '../../../features/externo/externo.store';
import { InternoStore } from '../../../features/interno/interno.store';
import { ExternoService } from '../../../core/services/externo.service';
import { InternoService } from '../../../core/services/interno.service';

export interface PaletteResultItem {
  id: string;
  category: 'FUENTE' | 'ARCHIVO_EXT' | 'COLUMNA' | 'ACTIVO_INT' | 'ALERTA' | 'CORRIDA' | 'ACCION';
  title: string;
  subtitle: string;
  badge: string;
  route: string;
  queryParams: Record<string, string>;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './command-palette.component.html',
  styleUrls: ['./command-palette.component.css']
})
export class CommandPaletteComponent {
  readonly paletteService = inject(CommandPaletteService);
  private readonly router = inject(Router);
  private readonly externoStore = inject(ExternoStore);
  private readonly internoStore = inject(InternoStore);
  private readonly externoService = inject(ExternoService);
  private readonly internoService = inject(InternoService);

  @ViewChild('paletteDialog') dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  readonly query = signal<string>('');
  readonly selectedIndex = signal<number>(0);
  readonly remoteLoading = signal<boolean>(false);
  readonly remoteItems = signal<PaletteResultItem[]>([]);

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pointerDownOutside = false;

  readonly quickActions: PaletteResultItem[] = [
    {
      id: 'act-ext-overview',
      category: 'ACCION',
      title: 'Prospector Externo — Portales y Cobertura de Resiliencia',
      subtitle: 'Lista Blanca, Lista Negra y puntos únicos de fallo (0 respaldos)',
      badge: 'EXTERNO',
      route: '/externo',
      queryParams: { tab: 'overview' }
    },
    {
      id: 'act-ext-discovery',
      category: 'ACCION',
      title: 'Exploración Web Abierta y Filtrado de Fuentes',
      subtitle: 'Búsqueda multicanal, validación TLS X.509 y preselección',
      badge: 'EXTERNO',
      route: '/externo',
      queryParams: { tab: 'discovery' }
    },
    {
      id: 'act-int-gatekeeper',
      category: 'ACCION',
      title: 'Prospector Interno — Control Previo (Gatekeeper) y Cola SSE',
      subtitle: 'Evaluación individual/lote (dry_run), workers reales y reutilización delta',
      badge: 'INTERNO',
      route: '/interno',
      queryParams: { tab: 'gatekeeper' }
    },
    {
      id: 'act-int-activos',
      category: 'ACCION',
      title: 'Catálogo de Datos y Descarga (Parquet / CSV)',
      subtitle: 'Vista previa de tablas, diccionario de columnas, Python/R y filtro SQL opcional',
      badge: 'DATOS',
      route: '/interno',
      queryParams: { tab: 'activos' }
    },
    {
      id: 'act-bridge',
      category: 'ACCION',
      title: 'Conciliación Documental & Sync Bridge',
      subtitle: 'Cruce Externo ↔ Interno y ejecución de lotes físicos',
      badge: 'BRIDGE',
      route: '/bridge',
      queryParams: {}
    }
  ];

  readonly localItems = computed<PaletteResultItem[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.quickActions;
    }

    const matches: PaletteResultItem[] = [];

    for (const src of this.externoStore.sources()) {
      if (
        src.source_id.toLowerCase().includes(q) ||
        src.name.toLowerCase().includes(q) ||
        src.entrypoint.toLowerCase().includes(q) ||
        (src.audit_code || '').toLowerCase().includes(q)
      ) {
        matches.push({
          id: `src-${src.source_id}`,
          category: 'FUENTE',
          title: `${src.source_id.toUpperCase()} — ${src.name}`,
          subtitle: src.entrypoint,
          badge: src.health_status,
          route: '/externo',
          queryParams: { tab: 'inventory', source_id: src.source_id }
        });
      }
      if (matches.length >= 6) break;
    }

    for (const alrt of this.externoStore.alerts()) {
      if (
        alrt.source_id.toLowerCase().includes(q) ||
        alrt.alert_code.toLowerCase().includes(q) ||
        alrt.diagnostic_summary.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `alrt-${alrt.alert_id}`,
          category: 'ALERTA',
          title: `[${alrt.alert_code}] ${alrt.source_name}`,
          subtitle: alrt.diagnostic_summary,
          badge: alrt.severity,
          route: '/externo',
          queryParams: { tab: 'alerts', source_id: alrt.source_id }
        });
      }
      if (matches.length >= 10) break;
    }

    for (const run of this.externoStore.runs()) {
      if (run.run_id.toLowerCase().includes(q)) {
        matches.push({
          id: `run-${run.run_id}`,
          category: 'CORRIDA',
          title: `Corrida ${run.run_id}`,
          subtitle: `${run.sources_processed} procesadas · ${run.sources_failed} fallos`,
          badge: run.status || 'RUN',
          route: '/externo',
          queryParams: { tab: 'runs', run_id: run.run_id }
        });
      }
      if (matches.length >= 12) break;
    }

    for (const art of this.internoStore.artifacts()) {
      if (
        art.artifact_id.toLowerCase().includes(q) ||
        art.sha256_hash.toLowerCase().includes(q) ||
        art.dataset_code.toLowerCase().includes(q) ||
        art.file_path.toLowerCase().includes(q)
      ) {
        matches.push({
          id: `art-${art.artifact_id}`,
          category: 'ACTIVO_INT',
          title: `${art.dataset_code} (${art.artifact_id})`,
          subtitle: `SHA-256: ${art.sha256_hash.slice(0, 20)}... · ${art.domain}`,
          badge: 'BRONZE',
          route: '/interno',
          queryParams: { tab: 'custodia', inspect: art.artifact_id }
        });
      }
      if (matches.length >= 16) break;
    }

    return matches;
  });

  readonly allResults = computed<PaletteResultItem[]>(() => {
    const merged = [...this.localItems()];
    const seen = new Set(merged.map((m) => m.id));
    for (const r of this.remoteItems()) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    return merged.slice(0, 20);
  });

  constructor() {
    effect(() => {
      const open = this.paletteService.isOpen();
      queueMicrotask(() => {
        const dialog = this.dialogRef?.nativeElement;
        if (!dialog) return;
        if (open && !dialog.open) {
          this.query.set('');
          this.remoteItems.set([]);
          this.selectedIndex.set(0);
          dialog.showModal();
          setTimeout(() => this.searchInputRef?.nativeElement.focus(), 10);
        } else if (!open && dialog.open) {
          dialog.close();
        }
      });
    });
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteService.toggle();
    }
  }

  onQueryInput(value: string): void {
    this.query.set(value);
    this.selectedIndex.set(0);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      this.remoteItems.set([]);
      this.remoteLoading.set(false);
      return;
    }

    this.remoteLoading.set(true);
    this.debounceTimer = setTimeout(() => this.executeRemoteSearch(trimmed), 220);
  }

  private executeRemoteSearch(term: string): void {
    const looksLikeHash = /^[a-f0-9]{8,64}$/i.test(term);
    forkJoin({
      interno: this.internoService
        .searchGlobalCatalog({
          q: term,
          column: term,
          sha256: looksLikeHash ? term : undefined,
          limit: 12
        })
        .pipe(catchError(() => of(null))),
      externoRes: this.externoService
        .getResourcesPaged({ search: term, limit: 8 })
        .pipe(catchError(() => of({ items: [], total: 0 })))
    }).subscribe({
      next: ({ interno, externoRes }) => {
        const results: PaletteResultItem[] = [];

        if (interno) {
          for (const col of interno.column_matches || []) {
            const isGold = col.origin === 'GOLD_DICTIONARY';
            results.push({
              id: `col-${col.origin}-${col.asset_id}-${col.column_name}`,
              category: 'COLUMNA',
              title: `Columna: ${col.column_name}`,
              subtitle: `${col.dataset_id || col.asset_id} · Tipo ${col.inferred_type} · Nulos ${col.null_pct}%`,
              badge: isGold ? 'GOLD' : 'PERFIL BRUTO',
              route: '/interno',
              queryParams: isGold
                ? { tab: 'activos', datamart: String(col.dataset_id || col.asset_id) }
                : { tab: 'custodia', inspect: col.asset_id }
            });
          }
          for (const asset of interno.asset_matches || []) {
            results.push({
              id: `asset-rem-${asset.asset_id}`,
              category: 'ACTIVO_INT',
              title: `${asset.dataset_id} — ${asset.asset_id}`,
              subtitle: `SHA-256: ${asset.sha256_hash.slice(0, 20)}... · ${asset.source_id}`,
              badge: asset.storage_layer,
              route: '/interno',
              queryParams: { tab: 'custodia', inspect: asset.asset_id }
            });
          }
        }

        for (const res of externoRes.items || []) {
          results.push({
            id: `ext-res-${res.resource_key}`,
            category: 'ARCHIVO_EXT',
            title: res.title || res.declared_filename || res.resource_key,
            subtitle: `${res.source_id.toUpperCase()} · ${res.url}`,
            badge: (res.file_extension || 'FILE').toUpperCase(),
            route: '/externo',
            queryParams: {
              tab: 'inventory',
              source_id: res.source_id,
              search: res.resource_key,
              inspect: res.resource_key
            }
          });
        }

        this.remoteItems.set(results);
        this.remoteLoading.set(false);
      },
      error: () => {
        this.remoteLoading.set(false);
      }
    });
  }

  onInputKeydown(event: KeyboardEvent): void {
    const list = this.allResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (list.length > 0) {
        this.selectedIndex.set((this.selectedIndex() + 1) % list.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.length > 0) {
        this.selectedIndex.set((this.selectedIndex() - 1 + list.length) % list.length);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = list[this.selectedIndex()];
      if (target) this.selectItem(target);
    }
  }

  selectItem(item: PaletteResultItem): void {
    this.paletteService.close();
    this.router.navigate([item.route], { queryParams: item.queryParams });
  }

  onDialogClosed(): void {
    if (this.paletteService.isOpen()) {
      this.paletteService.close();
    }
  }

  onPointerDown(event: PointerEvent): void {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    this.pointerDownOutside = this.isOutside(event, dialog);
  }

  onPointerUp(event: PointerEvent): void {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    if (this.pointerDownOutside && this.isOutside(event, dialog)) {
      dialog.close();
    }
    this.pointerDownOutside = false;
  }

  getCategoryLabel(cat: PaletteResultItem['category']): string {
    switch (cat) {
      case 'FUENTE':
        return 'Fuente Web';
      case 'ARCHIVO_EXT':
        return 'Catálogo Ext.';
      case 'COLUMNA':
        return 'Columna';
      case 'ACTIVO_INT':
        return 'Custodia SHA-256';
      case 'ALERTA':
        return 'Alerta';
      case 'CORRIDA':
        return 'Corrida';
      default:
        return 'Acceso';
    }
  }

  private isOutside(event: PointerEvent, dialog: HTMLDialogElement): boolean {
    const r = dialog.getBoundingClientRect();
    return (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    );
  }
}
