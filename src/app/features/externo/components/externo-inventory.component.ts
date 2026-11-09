import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import { FileProcessingStatus } from '../../../core/models/catalog.model';
import { formatBytesBo, formatIntegerBo } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-externo-inventory',
  standalone: true,
  imports: [SlicePipe, FormsModule],
  templateUrl: './externo-inventory.component.html',
  styleUrls: ['./externo-inventory.component.css']
})
export class ExternoInventoryComponent {
  readonly store = inject(ExternoStore);
  readonly formatBytes = formatBytesBo;
  readonly formatInt = formatIntegerBo;

  readonly copiedUrl = signal<boolean>(false);

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

  onProcessingFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as 'ALL' | FileProcessingStatus;
    this.store.setProcessingFilter(val);
  }

  onUpdateProcessingStatus(resourceKey: string, nextStatus: string): void {
    this.store.updateResourceStatus(resourceKey, nextStatus as FileProcessingStatus);
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
      case 'REMOVED':
      case 'DELETED':
        return 'RETIRADO';
      default:
        return status;
    }
  }

  getProcessingLabel(status?: FileProcessingStatus): string {
    switch (status || 'PENDIENTE') {
      case 'PROCESADO_EXITOSAMENTE':
        return 'PROCESADO';
      case 'EN_PROCESO':
        return 'EN PROCESO';
      case 'ERROR':
        return 'CON ERROR';
      default:
        return 'PENDIENTE';
    }
  }

  copiarUrl(url: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copiedUrl.set(true);
        setTimeout(() => this.copiedUrl.set(false), 2000);
      });
    }
  }
}
