import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ExternoStore } from '../externo.store';
import { CatalogResource } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-inventory',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './externo-inventory.component.html',
  styleUrl: './externo-inventory.component.css'
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
