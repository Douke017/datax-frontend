import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { ExternoService } from '../../core/services/externo.service';
import { CatalogResource } from '../../core/models/catalog.model';
import { InstitutionStateService, INSTITUTIONS } from '../../core/services/institution-state.service';

@Component({
  selector: 'app-catalog-radar',
  standalone: true,
  template: `
    <div class="radar-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="badge-row">
            <span class="source-tag">CATÁLOGO INSTITUCIONAL</span>
            <span class="radar-badge">PUBLICACIONES DETECTADAS</span>
          </div>
          <h1 class="page-title">Explorador de Publicaciones Web</h1>
          <p class="page-desc">
            Consulta del inventario de documentos e informes indexados desde los portales institucionales oficiales.
          </p>
        </div>

        <div class="header-actions">
          <button class="btn-primary" (click)="loadResources()" [disabled]="loading()">
            @if (loading()) {
              <span>Actualizando...</span>
            } @else {
              <span>Actualizar Catálogo</span>
            }
          </button>
        </div>
      </div>

      <!-- Controls & Search -->
      <div class="filter-bar">
        <div class="filter-controls">
          <div class="filter-item">
            <label class="filter-label">Entidad:</label>
            <select
              class="select-input"
              [value]="selectedSource()"
              (change)="onSourceChange($event)"
            >
              <option value="">Todas las Entidades</option>
              @for (inst of institutions; track inst.id) {
                <option [value]="inst.id">{{ inst.code }}</option>
              }
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Formato:</label>
            <select
              class="select-input"
              [value]="extensionFilter()"
              (change)="onExtensionChange($event)"
            >
              <option value="ALL">Todos los Formatos</option>
              <option value=".pdf">PDF (.pdf)</option>
              <option value=".zip">Comprimido (.zip)</option>
              <option value=".xlsx">Excel (.xlsx)</option>
            </select>
          </div>
        </div>

        <div class="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, período o URL..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="search-input"
          />
        </div>
      </div>

      <!-- Counter Bar -->
      <div class="counter-bar">
        <div class="counter-item">
          <span class="counter-num">{{ filteredResources().length }}</span>
          <span class="counter-lbl">Publicaciones Filtradas</span>
        </div>
        <div class="counter-item">
          <span class="counter-num text-success">{{ countChangeStatus('NEW') }}</span>
          <span class="counter-lbl">Nuevas Detectadas</span>
        </div>
        <div class="counter-item">
          <span class="counter-num text-info">{{ countPdf() }}</span>
          <span class="counter-lbl">Documentos PDF</span>
        </div>
      </div>

      <!-- Resources Table with Pagination -->
      <div class="section-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 100px;">Entidad</th>
                <th>Nombre del Documento</th>
                <th style="width: 80px;">Formato</th>
                <th style="width: 100px;">Período</th>
                <th>Enlace Oficial Web</th>
                <th style="width: 140px;">Fecha de Detección</th>
                <th style="width: 110px;">Condición</th>
              </tr>
            </thead>
            <tbody>
              @for (r of pagedResources(); track r.resource_key) {
                <tr>
                  <td>
                    <span class="source-code">{{ r.source_id.toUpperCase() }}</span>
                  </td>
                  <td>
                    <div class="res-title-box">
                      <span class="res-title">{{ r.title || r.resource_key.substring(0, 24) }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="ext-badge">{{ (r.file_extension || '.bin').toUpperCase().replace('.', '') }}</span>
                  </td>
                  <td>
                    <span class="period-badge">{{ r.period_label || 'General' }}</span>
                  </td>
                  <td>
                    <a [href]="r.url" target="_blank" class="url-link" title="Abrir enlace oficial">
                      {{ r.url }}
                    </a>
                  </td>
                  <td>
                    <span class="date-text">{{ formatDate(r.discovered_at) }}</span>
                  </td>
                  <td>
                    <span class="status-chip" [class]="'chip-' + r.change_status.toLowerCase()">
                      {{ formatStatus(r.change_status) }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty-state">
                    @if (loading()) {
                      <span>Cargando catálogo de publicaciones...</span>
                    } @else {
                      <span>No se encontraron publicaciones que coincidan con los filtros.</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        @if (filteredResources().length > pageSize()) {
          <div class="pagination-bar">
            <div class="pagination-left">
              <span class="pagination-info">
                Mostrando {{ paginationStart() }} a {{ paginationEnd() }} de {{ filteredResources().length }} registros
              </span>
              <div class="page-size-selector">
                <span class="page-size-lbl">Por página:</span>
                <select [value]="pageSize()" (change)="onPageSizeChange($event)" class="page-size-select">
                  <option [value]="25">25</option>
                  <option [value]="50">50</option>
                  <option [value]="100">100</option>
                </select>
              </div>
            </div>

            <div class="pagination-buttons">
              <button
                class="btn-page"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
              >
                Anterior
              </button>
              <span class="page-indicator">Página {{ currentPage() }} de {{ totalPages() }}</span>
              <button
                class="btn-page"
                [disabled]="currentPage() === totalPages()"
                (click)="nextPage()"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .radar-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .source-tag {
      background: var(--bg-surface-elevated);
      color: #93c5fd;
      border: 1px solid var(--border-medium);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
    }
    .radar-badge {
      font-size: 10px;
      font-weight: 700;
      color: #34d399;
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
    }
    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
    }
    .page-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .filter-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .select-input, .search-input {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 10px;
      color: var(--text-main);
      font-size: 12px;
    }
    .search-input {
      width: 280px;
    }
    .select-input:focus, .search-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .counter-bar {
      display: flex;
      gap: 16px;
    }
    .counter-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 10px 16px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .counter-num {
      font-family: var(--font-mono);
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }
    .counter-lbl {
      font-size: 11px;
      color: var(--text-subtle);
      text-transform: uppercase;
    }
    .text-success { color: #34d399; }
    .text-info { color: #38bdf8; }
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .source-code {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: #93c5fd;
    }
    .res-title-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .res-title {
      font-weight: 600;
      font-size: 12px;
      color: var(--text-main);
      word-break: break-all;
    }
    .ext-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      background: var(--bg-surface-elevated);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
    }
    .period-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #93c5fd;
    }
    .url-link {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #60a5fa;
      display: block;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .date-text {
      font-size: 11px;
      color: var(--text-subtle);
      font-family: var(--font-mono);
    }
    .status-chip {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .chip-new { background: var(--success-bg); color: #34d399; border: 1px solid var(--success-border); }
    .chip-modified { background: var(--warning-bg); color: #fbbf24; border: 1px solid var(--warning-border); }
    .chip-unchanged { background: var(--bg-surface-elevated); color: var(--text-subtle); border: 1px solid var(--border-subtle); }
    .empty-state {
      text-align: center;
      padding: 40px !important;
      color: var(--text-subtle);
      font-style: italic;
    }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      flex-wrap: wrap;
      gap: 12px;
    }
    .pagination-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .pagination-info {
      font-size: 12px;
      color: var(--text-subtle);
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .page-size-lbl {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .page-size-select {
      background: var(--bg-app);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }
    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-page {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      cursor: pointer;
    }
    .btn-page:hover:not(:disabled) {
      background: var(--bg-surface-hover);
    }
    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-indicator {
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
  `]
})
export class CatalogRadarComponent implements OnInit {
  private readonly externoService = inject(ExternoService);
  readonly instState = inject(InstitutionStateService);

  readonly institutions = INSTITUTIONS;
  readonly resources = signal<CatalogResource[]>([]);
  readonly loading = signal<boolean>(false);

  readonly selectedSource = signal<string>('');
  readonly extensionFilter = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  // Pagination
  readonly pageSize = signal<number>(25);
  readonly currentPage = signal<number>(1);

  readonly filteredResources = computed(() => {
    let list = this.resources();
    const ext = this.extensionFilter();
    if (ext !== 'ALL') {
      list = list.filter((r) => r.file_extension?.toLowerCase() === ext.toLowerCase());
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (r) =>
          r.url.toLowerCase().includes(q) ||
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.period_label && r.period_label.toLowerCase().includes(q))
      );
    }
    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredResources().length / this.pageSize()));
  });

  readonly pagedResources = computed(() => {
    const list = this.filteredResources();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  readonly paginationStart = computed(() => {
    if (this.filteredResources().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly paginationEnd = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredResources().length);
  });

  constructor() {
    effect(() => {
      const sourceId = this.instState.currentInstitutionId();
      if (sourceId) {
        this.selectedSource.set(sourceId);
        this.currentPage.set(1);
        this.loadResources();
      }
    });
  }

  ngOnInit(): void {
    this.selectedSource.set(this.instState.currentInstitutionId());
    this.loadResources();
  }

  loadResources(): void {
    this.loading.set(true);
    const source = this.selectedSource() || undefined;
    // Load up to 1000 items from API, but view is paginated with 25 per page in UI
    this.externoService.getResources(source, undefined, 1000).subscribe({
      next: (data) => {
        this.resources.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSourceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSource.set(val);
    if (val) {
      this.instState.setInstitution(val);
    }
    this.currentPage.set(1);
    this.loadResources();
  }

  onExtensionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.extensionFilter.set(val);
    this.currentPage.set(1);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentPage.set(1);
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(val);
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  countChangeStatus(status: string): number {
    return this.resources().filter((r) => r.change_status === status).length;
  }

  countPdf(): number {
    return this.resources().filter((r) => r.file_extension?.toLowerCase() === '.pdf').length;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  formatStatus(status: string): string {
    switch (status) {
      case 'NEW':
        return 'Nuevo';
      case 'MODIFIED':
        return 'Modificado';
      case 'UNCHANGED':
        return 'Sin Cambios';
      default:
        return status;
    }
  }
}
