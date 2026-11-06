import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryStore } from '../inventory.store';

@Component({
  selector: 'app-interno-curaduria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interno-curaduria.component.html',
  styleUrl: './interno-curaduria.component.css'
})
export class InternoCuraduriaComponent {
  readonly store = inject(InventoryStore);

  onSourceChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setSourceFilter(target.value);
  }

  onStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setStatusFilter(target.value);
  }

  onDownloadFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value === 'YES' ? true : target.value === 'NO' ? false : null;
    this.store.setDownloadFilter(val);
  }

  onProcessedFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value === 'YES' ? true : target.value === 'NO' ? false : null;
    this.store.setProcessedFilter(val);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.store.setSearchQuery(target.value);
  }
}
