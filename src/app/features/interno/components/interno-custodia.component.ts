import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { InternoStore } from '../interno.store';
import { InstitutionStateService } from '../../../core/services/institution-state.service';
import { BridgeSyncResponse } from '../../../core/models/reconciliation.model';
import { formatBytes, formatInteger } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-interno-custodia',
  standalone: true,
  imports: [SlicePipe, CommonModule],
  templateUrl: './interno-custodia.component.html',
  styleUrl: './interno-custodia.component.css'
})
export class InternoCustodiaComponent {
  readonly store = inject(InternoStore);
  private readonly institutionState = inject(InstitutionStateService);

  readonly formatInt = formatInteger;
  readonly formatSize = formatBytes;

  readonly selectedSourceForSync = signal<string>(this.institutionState.currentInstitutionId());
  readonly copiedHashId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const inst = this.institutionState.currentInstitutionId();
      if (inst && inst !== this.selectedSourceForSync()) {
        this.selectedSourceForSync.set(inst);
      }
    });
  }

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

  onResetCircuit(domain: string): void {
    this.store.resetDomainCircuit(domain);
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

  formatSyncSummary(syncRes: BridgeSyncResponse): string {
    const entity = this.getEntityDisplayName(syncRes.source_id);
    return `Se resguardaron ${syncRes.completed_tasks} publicaciones oficiales de ${entity} con verificación criptográfica SHA-256.`;
  }
}
