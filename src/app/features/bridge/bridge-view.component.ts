import { Component, OnInit, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { BridgeStore } from './bridge.store';
import { formatIntegerBo } from '../../shared/utils/format.utils';

@Component({
  selector: 'app-bridge-view',
  standalone: true,
  imports: [SlicePipe],
  templateUrl: './bridge-view.component.html',
  styleUrls: ['./bridge-view.component.css']
})
export class BridgeViewComponent implements OnInit {
  readonly store = inject(BridgeStore);
  readonly formatInt = formatIntegerBo;

  ngOnInit(): void {
    if (this.store.sources().length === 0) {
      this.store.loadSources();
    }
    if (!this.store.reconcileResult() && !this.store.reconciling()) {
      this.store.reconcileSource(this.store.selectedSourceId());
    }
  }

  onSourceSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    this.store.setSource(val);
  }

  onReconcile(): void {
    this.store.loadSources();
    this.store.reconcileSource(this.store.selectedSourceId());
  }

  onBatchSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.store.setBatchSize(parseInt(target.value, 10) || 10);
  }

  onExecuteSync(executeDownloads: boolean): void {
    this.store.executeSyncPlan({ executeDownloads });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.store.setSearchQuery(target.value);
  }
}
