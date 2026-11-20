import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InventoryStore } from '../inventory.store';
import { InternoService } from '../../../core/services/interno.service';
import { ToastService } from '../../../core/services/toast.service';
import { UrlInventoryItem } from '../../../core/models/inventory.model';
import {
  DataGridColumn,
  DataGridComponent,
  DataGridFilterChip
} from '../../../shared/components/data-grid/data-grid.component';
import { ConfirmReasonModalComponent } from '../../../shared/components/confirm-reason-modal/confirm-reason-modal.component';
import { formatIntegerBo, formatPercentage } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-interno-curaduria',
  standalone: true,
  imports: [CommonModule, FormsModule, DataGridComponent, ConfirmReasonModalComponent],
  templateUrl: './interno-curaduria.component.html',
  styleUrl: './interno-curaduria.component.css'
})
export class InternoCuraduriaComponent implements OnInit, OnDestroy {
  readonly store = inject(InventoryStore);
  private readonly internoService = inject(InternoService);
  readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly formatInt = formatIntegerBo;
  readonly formatPct = formatPercentage;

  readonly selectedKeys = signal<Set<string>>(new Set<string>());
  readonly bulkEnqueuing = signal<boolean>(false);

  // Accessible audited override modal (zero window.confirm)
  readonly pendingToggle = signal<{
    item: UrlInventoryItem;
    field: 'is_downloaded' | 'is_processed';
  } | null>(null);
  readonly submittingToggle = signal<boolean>(false);

  private qpSub?: Subscription;
  private searchDebounce?: ReturnType<typeof setTimeout>;

  readonly columns: DataGridColumn[] = [
    { key: 'source_id', label: 'Fuente', mono: true, width: '105px' },
    { key: 'canonical_url', label: 'Enlace / Archivo' },
    { key: 'status', label: 'Estado Pipeline', width: '165px' },
    { key: 'is_downloaded', label: 'Descargado', align: 'center', width: '130px' },
    { key: 'is_processed', label: 'Procesado', align: 'center', width: '130px' },
    { key: 'sha256_hash', label: 'SHA-256', mono: true, width: '145px' },
    { key: 'actions', label: 'Acciones', width: '155px' }
  ];

  readonly rowKeyFn = (row: UrlInventoryItem): string => String(row.id);

  readonly filterChips = computed<DataGridFilterChip[]>(() => {
    const chips: DataGridFilterChip[] = [];
    if (this.store.selectedSource() !== 'ALL') {
      chips.push({ key: 'inv_src', label: 'Fuente', value: this.store.selectedSource().toUpperCase() });
    }
    if (this.store.selectedStatus() !== 'ALL') {
      chips.push({ key: 'inv_status', label: 'Estado', value: this.store.selectedStatus() });
    }
    if (this.store.downloadFilter() !== null) {
      chips.push({
        key: 'inv_dl',
        label: 'Descargado',
        value: this.store.downloadFilter() ? 'SÍ' : 'NO'
      });
    }
    if (this.store.processedFilter() !== null) {
      chips.push({
        key: 'inv_proc',
        label: 'Procesado',
        value: this.store.processedFilter() ? 'SÍ' : 'NO'
      });
    }
    if (this.store.searchQuery().trim()) {
      chips.push({ key: 'inv_q', label: 'Búsqueda', value: this.store.searchQuery().trim() });
    }
    return chips;
  });

  ngOnInit(): void {
    this.qpSub = this.route.queryParamMap.subscribe((params) => {
      const source = params.get('inv_src') || 'ALL';
      const status = params.get('inv_status') || 'ALL';
      const dlRaw = params.get('inv_dl');
      const procRaw = params.get('inv_proc');
      const downloaded = dlRaw === 'YES' ? true : dlRaw === 'NO' ? false : null;
      const processed = procRaw === 'YES' ? true : procRaw === 'NO' ? false : null;
      const search = params.get('inv_q') || '';
      const page = Math.max(1, Number(params.get('inv_page')) || 1);
      const pageSize = Math.max(10, Number(params.get('inv_limit')) || 25);

      this.store.applyFilters({
        source,
        status,
        downloaded,
        processed,
        search,
        page,
        pageSize
      });
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }

  private syncQuery(patch: Record<string, string | number | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'curaduria', ...patch },
      queryParamsHandling: 'merge'
    });
  }

  onSourceChange(val: string): void {
    this.syncQuery({ inv_src: val === 'ALL' ? null : val, inv_page: 1 });
  }

  onStatusChange(val: string): void {
    this.syncQuery({ inv_status: val === 'ALL' ? null : val, inv_page: 1 });
  }

  onDownloadFilterChange(val: string): void {
    this.syncQuery({ inv_dl: val === 'ALL' ? null : val, inv_page: 1 });
  }

  onProcessedFilterChange(val: string): void {
    this.syncQuery({ inv_proc: val === 'ALL' ? null : val, inv_page: 1 });
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.syncQuery({ inv_q: val.trim() || null, inv_page: 1 });
    }, 250);
  }

  onPageChange(page: number): void {
    this.syncQuery({ inv_page: page });
  }

  onPageSizeChange(limit: number): void {
    this.syncQuery({ inv_limit: limit, inv_page: 1 });
  }

  onRemoveChip(key: string): void {
    this.syncQuery({ [key]: null, inv_page: 1 });
  }

  onClearAllChips(): void {
    this.syncQuery({
      inv_src: null,
      inv_status: null,
      inv_dl: null,
      inv_proc: null,
      inv_q: null,
      inv_page: 1
    });
  }

  onSelectionChange(keys: string[]): void {
    this.selectedKeys.set(new Set(keys));
  }

  enqueueSingle(item: UrlInventoryItem): void {
    this.internoService
      .enqueueDownload({
        source_id: item.source_id.toUpperCase(),
        canonical_url: item.canonical_url,
        dataset_code: item.file_code || undefined,
        execute_now: true
      })
      .subscribe({
        next: (rec) => {
          this.toast.success(
            rec.coalesced ? 'Suscrito a descarga en curso' : 'Descarga real encolada',
            `ID: ${rec.download_id} · Estado: ${rec.status}`
          );
          this.store.loadStats();
        },
        error: (err) => {
          this.toast.error('Error al encolar descarga', err?.error?.detail || '');
        }
      });
  }

  enqueueSelected(): void {
    const keys = this.selectedKeys();
    const items = this.store.items().filter((i) => keys.has(String(i.id)));
    if (items.length === 0) return;

    this.bulkEnqueuing.set(true);
    const calls = items.map((item) =>
      this.internoService
        .enqueueDownload({
          source_id: item.source_id.toUpperCase(),
          canonical_url: item.canonical_url,
          dataset_code: item.file_code || undefined,
          execute_now: true
        })
        .pipe(catchError(() => of(null)))
    );

    forkJoin(calls).subscribe({
      next: (results) => {
        const ok = results.filter(Boolean).length;
        this.bulkEnqueuing.set(false);
        this.selectedKeys.set(new Set());
        this.toast.success(
          `${ok} enlace(s) enviados al pool real de descargas`,
          'El avance se reflejará en vivo en el Monitor SSE de Control Previo.'
        );
      },
      error: () => {
        this.bulkEnqueuing.set(false);
        this.toast.error('Error al encolar los enlaces seleccionados');
      }
    });
  }

  requestAuditedToggle(item: UrlInventoryItem, field: 'is_downloaded' | 'is_processed'): void {
    this.pendingToggle.set({ item, field });
  }

  confirmAuditedToggle(reason: string): void {
    const target = this.pendingToggle();
    if (!target) return;
    this.submittingToggle.set(true);
    this.store.updateItemAudited(target.item, target.field, reason).subscribe({
      next: () => {
        this.submittingToggle.set(false);
        this.pendingToggle.set(null);
        this.toast.success(
          'Estado de inventario actualizado (auditado)',
          'La justificación fue registrada en inventory_status_audit.'
        );
      },
      error: (err) => {
        this.submittingToggle.set(false);
        this.toast.error(
          'No se pudo actualizar el estado',
          err?.error?.detail || 'Revise la conexión con el servidor.'
        );
      }
    });
  }

  getModalDescription(): string {
    const target = this.pendingToggle();
    if (!target) return '';
    const fieldName = target.field === 'is_downloaded' ? 'Descargado' : 'Procesado';
    const nextLabel =
      target.field === 'is_downloaded'
        ? !target.item.is_downloaded
          ? 'SÍ'
          : 'NO'
        : !target.item.is_processed
          ? 'SÍ'
          : 'NO';
    return `Se modificará excepcionalmente "${fieldName}" hacia "${nextLabel}" para ${target.item.canonical_url}. Registre la justificación operativa obligatoria.`;
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'DISPONIBLE_WEB_NUEVO':
        return 'Nuevo en Portal';
      case 'CATALOGADO_BDD':
        return 'Catalogado';
      case 'DESCARGA_HISTORICA_LEGACY':
        return 'Histórico Previo';
      case 'DESCARGADO_BRONZE':
      case 'COMPLETED':
        return 'En Custodia Bruta';
      default:
        return status;
    }
  }
}
