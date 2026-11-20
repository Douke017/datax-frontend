import {
  Component,
  ContentChild,
  TemplateRef,
  computed,
  input,
  output,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { formatIntegerBo } from '../../utils/format.utils';

export interface DataGridColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  tabular?: boolean;
  width?: string;
}

export interface DataGridFilterChip {
  key: string;
  label: string;
  value: string;
}

export interface DataGridSortEvent {
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [NgTemplateOutlet, SkeletonLoaderComponent],
  templateUrl: './data-grid.component.html',
  styleUrls: ['./data-grid.component.css']
})
export class DataGridComponent<T = Record<string, unknown>> {
  readonly caption = input<string>('Tabla de registros técnicos');
  readonly columns = input<DataGridColumn[]>([]);
  readonly rows = input<T[]>([]);
  readonly rowKey = input<(row: T, index: number) => string>(
    (_row, idx) => String(idx)
  );
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly emptyTitle = input<string>('Sin registros coincidentes');
  readonly emptyMessage = input<string>(
    'Ajuste los filtros activos o ejecute una actualización para poblar el inventario.'
  );

  // Sorting state (server-side or controlled)
  readonly sortBy = input<string>('');
  readonly sortDir = input<'asc' | 'desc'>('asc');

  // Filter chips synced with URL query params
  readonly filterChips = input<DataGridFilterChip[]>([]);

  // Multi-row selection
  readonly selectable = input<boolean>(false);
  readonly selectedKeys = input<ReadonlySet<string>>(new Set<string>());

  // Pagination (controlled / server-side)
  readonly page = input<number>(1);
  readonly pageSize = input<number>(20);
  readonly totalItems = input<number>(0);
  readonly pageSizeOptions = input<number[]>([20, 50, 100]);
  readonly showPagination = input<boolean>(true);
  readonly clickableRows = input<boolean>(true);

  readonly sortChange = output<DataGridSortEvent>();
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();
  readonly removeChip = output<string>();
  readonly clearAllChips = output<void>();
  readonly selectionChange = output<string[]>();
  readonly rowClick = output<T>();
  readonly retry = output<void>();

  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<{
    $implicit: T;
    row: T;
    column: DataGridColumn;
  }>;

  readonly captionId = `grid-cap-${Math.random().toString(36).slice(2, 9)}`;
  readonly sortStatusMessage = signal<string>('');
  readonly formatInt = formatIntegerBo;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / Math.max(1, this.pageSize())))
  );

  readonly rangeStart = computed(() => {
    if (this.totalItems() === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly rangeEnd = computed(() =>
    Math.min(this.page() * this.pageSize(), this.totalItems())
  );

  readonly allVisibleSelected = computed(() => {
    const list = this.rows();
    if (list.length === 0) return false;
    const selected = this.selectedKeys();
    const keyFn = this.rowKey();
    return list.every((row, idx) => selected.has(keyFn(row, idx)));
  });

  readonly selectedCount = computed(() => this.selectedKeys().size);

  onHeaderSort(col: DataGridColumn): void {
    if (!col.sortable) return;
    const nextDir: 'asc' | 'desc' =
      this.sortBy() === col.key && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.sortStatusMessage.set(
      `Ordenado por ${col.label}, ${nextDir === 'asc' ? 'ascendente' : 'descendente'}`
    );
    this.sortChange.emit({ sortBy: col.key, sortDir: nextDir });
  }

  getAriaSort(col: DataGridColumn): 'ascending' | 'descending' | null {
    if (!col.sortable || this.sortBy() !== col.key) return null;
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  isRowSelected(row: T, index: number): boolean {
    return this.selectedKeys().has(this.rowKey()(row, index));
  }

  toggleRowSelection(row: T, index: number, event: Event): void {
    event.stopPropagation();
    const key = this.rowKey()(row, index);
    const next = new Set(this.selectedKeys());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selectionChange.emit(Array.from(next));
  }

  toggleSelectAllVisible(): void {
    const list = this.rows();
    const keyFn = this.rowKey();
    const next = new Set(this.selectedKeys());
    if (this.allVisibleSelected()) {
      list.forEach((row, idx) => next.delete(keyFn(row, idx)));
    } else {
      list.forEach((row, idx) => next.add(keyFn(row, idx)));
    }
    this.selectionChange.emit(Array.from(next));
  }

  clearSelection(): void {
    this.selectionChange.emit([]);
  }

  onRowClick(row: T): void {
    if (this.clickableRows()) {
      this.rowClick.emit(row);
    }
  }

  onPageSizeSelect(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(size) && size > 0) {
      this.pageSizeChange.emit(size);
    }
  }

  readRawValue(row: T, key: string): string {
    const rec = row as Record<string, unknown>;
    const val = rec[key];
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  }
}
