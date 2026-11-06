import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { InternoStore } from '../interno.store';

@Component({
  selector: 'app-interno-custodia',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './interno-custodia.component.html',
  styleUrl: './interno-custodia.component.css'
})
export class InternoCustodiaComponent {
  readonly store = inject(InternoStore);

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.store.setSearchQuery(val);
  }

  onSourceChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setSourceFilter(val);
  }

  onPeriodChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.store.setPeriodFilter(val);
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  copyHash(hash: string): void {
    navigator.clipboard.writeText(hash);
  }
}
