import { Component, inject, signal } from '@angular/core';
import { SlicePipe, CommonModule } from '@angular/common';
import { InternoStore } from '../interno.store';

@Component({
  selector: 'app-interno-custodia',
  standalone: true,
  imports: [SlicePipe, CommonModule],
  templateUrl: './interno-custodia.component.html',
  styleUrl: './interno-custodia.component.css'
})
export class InternoCustodiaComponent {
  readonly store = inject(InternoStore);

  readonly selectedSourceForSync = signal<string>('bbv');
  readonly copiedHashId = signal<string | null>(null);

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

  copyHash(hash: string, artifactId: string): void {
    navigator.clipboard.writeText(hash);
    this.copiedHashId.set(artifactId);
    setTimeout(() => {
      if (this.copiedHashId() === artifactId) {
        this.copiedHashId.set(null);
      }
    }, 2500);
  }

  onExecuteSync(): void {
    this.store.runSyncBatch(this.selectedSourceForSync());
  }

  getEntityDisplayName(sourceId: string): string {
    switch (sourceId.toLowerCase()) {
      case 'bbv':
        return 'la Bolsa Boliviana de Valores (BBV)';
      case 'bcb':
        return 'el Banco Central de Bolivia (BCB)';
      case 'finrural':
        return 'FINRURAL';
      case 'asfi':
        return 'la Autoridad de Supervisión del Sistema Financiero (ASFI)';
      default:
        return sourceId.toUpperCase();
    }
  }

  formatSyncSummary(syncRes: any): string {
    const entity = this.getEntityDisplayName(syncRes.source_id);
    return `Se resguardaron exitosamente ${syncRes.completed_tasks} publicaciones oficiales de ${entity} en el repositorio físico de custodia.`;
  }
}
