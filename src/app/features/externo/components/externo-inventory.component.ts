import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ExternoStore } from '../externo.store';
import { CatalogResource } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-inventory',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <div class="inventory-container">
      <!-- Filter and Search Toolbar -->
      <div class="toolbar-card">
        <div class="search-box">
          <label class="toolbar-label" for="doc-search">Búsqueda de publicaciones:</label>
          <div class="input-wrapper">
            <input
              id="doc-search"
              type="text"
              class="search-input"
              placeholder="Buscar por título, palabra clave o URL..."
              [value]="store.searchQuery()"
              (input)="onSearchInput($event)"
            />
            @if (store.searchQuery()) {
              <button type="button" class="btn-clear" (click)="clearSearch()" title="Limpiar búsqueda">
                Limpiar
              </button>
            }
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-item">
            <label class="toolbar-label" for="source-filter">Entidad:</label>
            <select
              id="source-filter"
              class="select-input"
              [value]="store.selectedSourceId()"
              (change)="onSourceChange($event)"
            >
              <option value="ALL">Todas las Entidades</option>
              @for (src of store.sources(); track src.source_id) {
                <option [value]="src.source_id">{{ src.source_id.toUpperCase() }} — {{ src.name }}</option>
              }
            </select>
          </div>

          <div class="filter-item">
            <label class="toolbar-label" for="format-filter">Formato:</label>
            <select
              id="format-filter"
              class="select-input"
              [value]="store.extensionFilter()"
              (change)="onExtensionChange($event)"
            >
              <option value="ALL">Todos los Formatos</option>
              <option value=".pdf">PDF (.pdf)</option>
              <option value=".xlsx">Excel (.xlsx)</option>
              <option value=".csv">CSV (.csv)</option>
              <option value=".zip">Comprimido (.zip)</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="toolbar-label" for="status-filter">Estado en Portal:</label>
            <select
              id="status-filter"
              class="select-input"
              [value]="store.statusFilter()"
              (change)="onStatusChange($event)"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="UNCHANGED">Confirmado / Sin Cambios</option>
              <option value="NEW">Nuevo Hallazgo</option>
              <option value="MODIFIED">Modificado en Origen</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Results Summary Bar -->
      <div class="results-bar">
        <div class="results-count">
          Mostrando <strong class="mono">{{ store.paginationRange().start }} – {{ store.paginationRange().end }}</strong> de
          <strong class="mono">{{ store.totalFiltered() }}</strong> documentos detectados
          @if (store.totalFiltered() !== store.totalDiscovered()) {
            <span class="sub-count">(filtrados de {{ store.totalDiscovered() }} en total)</span>
          }
        </div>

        <div class="page-size-selector">
          <label class="size-lbl" for="page-size">Filas:</label>
          <select id="page-size" class="size-select" [value]="store.pageSize()" (change)="onPageSizeChange($event)">
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      <!-- Data Table -->
      <div class="table-card">
        @if (store.loading()) {
          <div class="table-state-msg">
            <span class="state-title">Consultando inventario web...</span>
            <span class="state-desc">Indexando publicaciones y metadatos de los portales</span>
          </div>
        } @else if (store.pagedResources().length === 0) {
          <div class="table-state-msg">
            <span class="state-title">No se localizaron documentos</span>
            <span class="state-desc">Verifique los filtros seleccionados o el término de búsqueda</span>
          </div>
        } @else {
          <div class="table-scroll-container">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th class="th-entity">Entidad</th>
                  <th class="th-title">Título del Documento</th>
                  <th class="th-period">Periodo</th>
                  <th class="th-format">Formato</th>
                  <th class="th-status" title="Ciclo de vida web en el portal respecto a barridos anteriores">
                    Estado en Portal <span class="th-info-icon" title="NUEVO: detectado en el último barrido. CONFIRMADO: sin cambios. MODIFICADO: alterado en origen.">ⓘ</span>
                  </th>
                  <th class="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (res of store.pagedResources(); track res.resource_key) {
                  <tr
                    class="table-row"
                    [class.row-selected]="store.selectedResource()?.resource_key === res.resource_key"
                    (click)="store.selectResource(res)"
                  >
                    <td class="td-entity">
                      <span class="badge-source">{{ res.source_id.toUpperCase() }}</span>
                    </td>
                    <td class="td-title">
                      <div class="doc-title-cell">
                        <span class="doc-title" [title]="res.title || 'Documento sin título formal'">
                          {{ res.title || 'Documento sin título formal' }}
                        </span>
                        <span class="doc-url mono" [title]="res.url">{{ res.url }}</span>
                      </div>
                    </td>
                    <td class="td-period mono">
                      {{ res.period_label || 'Periódico' }}
                    </td>
                    <td class="td-format">
                      <span
                        class="badge-ext"
                        [class.ext-pdf]="res.file_extension?.toLowerCase() === '.pdf'"
                        [class.ext-excel]="res.file_extension?.toLowerCase() === '.xlsx' || res.file_extension?.toLowerCase() === '.csv'"
                        [class.ext-zip]="res.file_extension?.toLowerCase() === '.zip'"
                      >
                        {{ (res.file_extension || '.DAT').toUpperCase() }}
                      </span>
                    </td>
                    <td class="td-status">
                      <span
                        class="status-chip"
                        [class.status-new]="res.change_status === 'NEW'"
                        [class.status-unchanged]="res.change_status === 'UNCHANGED'"
                        [class.status-modified]="res.change_status === 'MODIFIED'"
                      >
                        {{ getStatusLabel(res.change_status) }}
                      </span>
                    </td>
                    <td class="td-actions" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="btn-detail"
                        (click)="store.selectResource(res)"
                        title="Ver ficha técnica"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="pagination-bar">
            <div class="pagination-info">
              Página <span class="mono">{{ store.currentPage() }}</span> de <span class="mono">{{ store.totalPages() }}</span>
            </div>

            <div class="pagination-controls">
              <button
                type="button"
                class="btn-page"
                [disabled]="store.currentPage() <= 1"
                (click)="store.setPage(store.currentPage() - 1)"
              >
                Anterior
              </button>
              <button
                type="button"
                class="btn-page"
                [disabled]="store.currentPage() >= store.totalPages()"
                (click)="store.setPage(store.currentPage() + 1)"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Detail Drawer (Slide-over panel) -->
      @if (store.selectedResource(); as selected) {
        <div class="drawer-backdrop" (click)="store.selectResource(null)">
          <div class="drawer-panel" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <div class="drawer-heading">
                <span class="drawer-tag">FICHA TÉCNICA DE PUBLICACIÓN</span>
                <h3 class="drawer-title">{{ selected.title || 'Documento Oficial' }}</h3>
              </div>
              <button type="button" class="btn-close-drawer" (click)="store.selectResource(null)">
                Cerrar
              </button>
            </div>

            <div class="drawer-content">
              <div class="drawer-section">
                <span class="drawer-section-title">METADATOS DE PROCEDENCIA</span>
                <div class="drawer-field">
                  <span class="field-lbl">Entidad Emisora:</span>
                  <span class="field-val highlight">{{ selected.source_id.toUpperCase() }}</span>
                </div>
                <div class="drawer-field">
                  <span class="field-lbl">Estado en el Portal:</span>
                  <span class="field-val">
                    <span
                      class="status-chip"
                      [class.status-new]="selected.change_status === 'NEW'"
                      [class.status-unchanged]="selected.change_status === 'UNCHANGED'"
                    >
                      {{ getStatusLabel(selected.change_status) }}
                    </span>
                  </span>
                </div>
                <div class="drawer-field">
                  <span class="field-lbl">Periodo Asociado:</span>
                  <span class="field-val mono">{{ selected.period_label || 'No especificado en cabecera' }}</span>
                </div>
                <div class="drawer-field">
                  <span class="field-lbl">Formato / Tipo MIME:</span>
                  <span class="field-val mono">{{ selected.file_extension }} ({{ selected.content_type || 'application/octet-stream' }})</span>
                </div>
                <div class="drawer-field">
                  <span class="field-lbl">Tamaño Reportado:</span>
                  <span class="field-val mono">
                    {{ selected.content_length_bytes ? formatBytes(selected.content_length_bytes) : 'Disponible en servidor de origen' }}
                  </span>
                </div>
              </div>

              <div class="drawer-section">
                <span class="drawer-section-title">LOCALIZACIÓN Y ENLACE OFICIAL</span>
                <div class="url-block">
                  <span class="field-lbl">URL Canónica de Descarga:</span>
                  <a [href]="selected.url" target="_blank" rel="noopener noreferrer" class="link-url mono">
                    {{ selected.url }}
                  </a>
                </div>
                @if (selected.discovered_from_url) {
                  <div class="url-block">
                    <span class="field-lbl">Página Origen de Detección:</span>
                    <a [href]="selected.discovered_from_url" target="_blank" rel="noopener noreferrer" class="link-url mono">
                      {{ selected.discovered_from_url }}
                    </a>
                  </div>
                }
              </div>

              <div class="drawer-section">
                <span class="drawer-section-title">FIRMAS TÉCNICAS Y ENCABEZADOS</span>
                <div class="drawer-field">
                  <span class="field-lbl">Identificador Clave:</span>
                  <span class="field-val mono snippet">{{ selected.resource_key }}</span>
                </div>
                @if (selected.etag) {
                  <div class="drawer-field">
                    <span class="field-lbl">Encabezado ETag:</span>
                    <span class="field-val mono">{{ selected.etag }}</span>
                  </div>
                }
                @if (selected.last_modified_header) {
                  <div class="drawer-field">
                    <span class="field-lbl">Fecha Última Modificación (HTTP):</span>
                    <span class="field-val mono">{{ selected.last_modified_header }}</span>
                  </div>
                }
                <div class="drawer-field">
                  <span class="field-lbl">Fecha de Detección:</span>
                  <span class="field-val mono">{{ selected.discovered_at | slice:0:19 }}</span>
                </div>
              </div>
            </div>

            <div class="drawer-footer">
              <a
                [href]="selected.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-external"
              >
                Abrir en Portal Oficial ↗
              </a>
              <button
                type="button"
                class="btn-copy-url"
                [class.copied]="copiedUrl()"
                (click)="copiarUrl(selected.url)"
                [title]="selected.url"
              >
                {{ copiedUrl() ? '✓ Enlace Copiado' : 'Copiar URL Canónica' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .inventory-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .toolbar-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
    }
    .toolbar-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-input {
      width: 100%;
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 7px 12px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      transition: border-color 0.15s ease;
    }
    .search-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .btn-clear {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--text-subtle);
      font-size: 11px;
      cursor: pointer;
      padding: 2px 6px;
    }
    .btn-clear:hover {
      color: var(--text-main);
    }
    .filter-group {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .select-input {
      background: var(--bg-app);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 7px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      cursor: pointer;
      min-width: 160px;
    }
    .select-input:focus {
      outline: none;
      border-color: var(--border-focus);
    }
    .results-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
      font-size: 12px;
      color: var(--text-muted);
    }
    .results-count strong {
      color: var(--text-main);
    }
    .sub-count {
      color: var(--text-subtle);
      margin-left: 4px;
    }
    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .size-lbl {
      font-size: 11px;
      color: var(--text-subtle);
    }
    .size-select {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 3px 6px;
      border-radius: var(--radius-sm);
      font-size: 11px;
    }
    .table-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .table-scroll-container {
      width: 100%;
      overflow-x: auto;
    }
    .inventory-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 12px;
    }
    .inventory-table th {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-medium);
      white-space: nowrap;
    }
    .inventory-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      vertical-align: middle;
    }
    .table-row {
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .table-row:hover {
      background: var(--bg-surface-hover);
    }
    .table-row.row-selected {
      background: rgba(37, 99, 235, 0.08);
      border-left: 2px solid var(--primary);
    }
    .badge-source {
      font-size: 11px;
      font-weight: 700;
      color: #60a5fa;
      font-family: var(--font-mono);
      background: rgba(37, 99, 235, 0.1);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid rgba(37, 99, 235, 0.25);
    }
    .doc-title-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-width: 480px;
    }
    .doc-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .doc-url {
      font-size: 11px;
      color: var(--text-subtle);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge-ext {
      font-size: 10px;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border-medium);
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
    }
    .badge-ext.ext-pdf {
      background: rgba(139, 92, 246, 0.12);
      color: #c084fc;
      border-color: rgba(139, 92, 246, 0.3);
    }
    .badge-ext.ext-excel {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.3);
    }
    .badge-ext.ext-zip {
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.3);
    }
    .status-chip {
      font-size: 10px;
      font-weight: 700;
      font-family: var(--font-mono);
      padding: 2px 7px;
      border-radius: 3px;
      letter-spacing: 0.03em;
      background: var(--bg-surface-elevated);
      color: var(--text-subtle);
      border: 1px solid var(--border-subtle);
    }
    .status-chip.status-new {
      background: var(--success-bg);
      color: #34d399;
      border-color: var(--success-border);
    }
    .status-chip.status-unchanged {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border-color: rgba(59, 130, 246, 0.25);
    }
    .status-chip.status-modified {
      background: var(--warning-bg);
      color: #fbbf24;
      border-color: var(--warning-border);
    }
    .btn-detail {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-medium);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .btn-detail:hover {
      background: var(--bg-surface-hover);
      color: var(--text-main);
      border-color: var(--border-focus);
    }
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      background: var(--bg-surface-elevated);
      border-top: 1px solid var(--border-subtle);
      font-size: 12px;
    }
    .pagination-info {
      color: var(--text-muted);
    }
    .pagination-controls {
      display: flex;
      gap: 8px;
    }
    .btn-page {
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-page:hover:not(:disabled) {
      background: var(--bg-surface-hover);
    }
    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .table-state-msg {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 6px;
    }
    .state-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }
    .state-desc {
      font-size: 12px;
      color: var(--text-subtle);
    }
    .mono {
      font-family: var(--font-mono);
    }

    /* Drawer Styles */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.15s ease-out;
    }
    .drawer-panel {
      width: 520px;
      max-width: 90vw;
      height: 100%;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-medium);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.2s ease-out;
    }
    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .drawer-heading {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .drawer-tag {
      font-size: 10px;
      font-weight: 700;
      color: #60a5fa;
      letter-spacing: 0.06em;
      font-family: var(--font-mono);
    }
    .drawer-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.3;
    }
    .btn-close-drawer {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-medium);
      color: var(--text-muted);
      padding: 5px 12px;
      border-radius: var(--radius-sm);
      font-size: 11px;
      cursor: pointer;
    }
    .btn-close-drawer:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }
    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .drawer-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--bg-app);
      padding: 16px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
    }
    .drawer-section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-subtle);
      letter-spacing: 0.05em;
    }
    .drawer-field {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      font-size: 12px;
    }
    .field-lbl {
      color: var(--text-subtle);
      font-weight: 500;
      white-space: nowrap;
    }
    .field-val {
      color: var(--text-main);
      text-align: right;
      word-break: break-all;
    }
    .field-val.highlight {
      color: #60a5fa;
      font-weight: 700;
    }
    .field-val.snippet {
      font-size: 11px;
      color: var(--text-muted);
    }
    .url-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .link-url {
      color: #60a5fa;
      font-size: 11px;
      word-break: break-all;
      line-height: 1.4;
    }
    .link-url:hover {
      text-decoration: underline;
    }
    .drawer-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: var(--bg-surface);
    }
    .btn-external {
      display: inline-flex;
      align-items: center;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 8px 14px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
    }
    .btn-external:hover {
      background: var(--bg-surface-hover);
      text-decoration: none;
    }
    .btn-copy-url {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-medium);
      color: var(--text-main);
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-copy-url:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-focus);
    }
    .btn-copy-url.copied {
      background: var(--success-bg);
      border-color: var(--success-border);
      color: #34d399;
    }
    .th-info-icon {
      font-size: 11px;
      color: var(--text-subtle);
      cursor: help;
      margin-left: 2px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class ExternoInventoryComponent {
  readonly store = inject(ExternoStore);

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.store.setSearchQuery(val);
  }

  clearSearch(): void {
    this.store.setSearchQuery('');
  }

  onSourceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setSourceFilter(val);
  }

  onExtensionChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setExtensionFilter(val);
  }

  onStatusChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setStatusFilter(val);
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.store.setPageSize(val);
  }

  getStatusLabel(status: string): string {
    switch (status.toUpperCase()) {
      case 'NEW':
        return 'NUEVO';
      case 'UNCHANGED':
        return 'CONFIRMADO';
      case 'MODIFIED':
        return 'MODIFICADO';
      default:
        return status;
    }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  readonly copiedUrl = signal<boolean>(false);

  copiarUrl(url: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copiedUrl.set(true);
        setTimeout(() => this.copiedUrl.set(false), 2000);
      });
    }
  }
}
