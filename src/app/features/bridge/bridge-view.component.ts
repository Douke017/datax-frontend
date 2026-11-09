import { Component, effect, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { BridgeStore } from './bridge.store';
import { InstitutionStateService } from '../../core/services/institution-state.service';
import { formatIntegerBo } from '../../shared/utils/format.utils';

@Component({
  selector: 'app-bridge-view',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './bridge-view.component.html',
  styleUrls: ['./bridge-view.component.css']
})
export class BridgeViewComponent {
  readonly store = inject(BridgeStore);
  private readonly institutionState = inject(InstitutionStateService);
  readonly formatInt = formatIntegerBo;

  constructor() {
    effect(() => {
      const globalInst = this.institutionState.currentInstitutionId();
      const mapped = globalInst === 'asfi' ? 'asfi_valores' : globalInst;
      if (['bcb', 'bbv', 'finrural', 'asfi_valores'].includes(mapped) && this.store.selectedSourceId() !== mapped) {
        this.store.setSource(mapped);
      }
    });
  }

  onSourceSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    this.store.setSource(val);
    if (val === 'asfi_valores') {
      this.institutionState.setInstitution('asfi');
    } else if (['bcb', 'bbv', 'finrural'].includes(val)) {
      this.institutionState.setInstitution(val);
    }
  }

  onReconcile(): void {
    this.store.reconcileSource(this.store.selectedSourceId());
  }

  onBatchSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setBatchSize(parseInt(target.value, 10) || 5);
  }

  onExecuteSync(executeDownloads: boolean): void {
    this.store.executeSyncPlan({ executeDownloads });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.store.setSearchQuery(target.value);
  }
}
