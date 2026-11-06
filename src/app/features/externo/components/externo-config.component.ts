import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import { CatalogSource, SourcePolicyUpdate } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './externo-config.component.html',
  styleUrl: './externo-config.component.css'
})
export class ExternoConfigComponent {
  readonly store = inject(ExternoStore);

  readonly availableExtensions = ['.pdf', '.xlsx', '.xls', '.csv', '.zip', '.dat', '.json', '.ods'];

  readonly selectedSourceId = signal<string>('bcb');
  readonly isSaving = signal<boolean>(false);
  readonly saveSuccess = signal<boolean>(false);
  readonly saveError = signal<boolean>(false);
  readonly actionMessage = signal<string>('');

  // Form Fields
  formEntrypoint = '';
  readonly formContingencyUrls = signal<string[]>([]);
  newContingencyUrl = '';

  formCategory: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY';
  formRateLimit = 1.0;
  formMaxUrls = 250;
  formMaxResources = 1000;
  formIgnoreRobots = false;
  formHealth: 'ACTIVE' | 'WARNING' | 'SUSPENDED' = 'ACTIVE';
  formAuditCode = '';
  formAuditNote = '';

  readonly formSeeds = signal<string[]>([]);
  newSeedUrl = '';

  readonly formExtensions = signal<string[]>(['.pdf', '.xlsx', '.csv', '.zip']);

  readonly currentSource = computed<CatalogSource | undefined>(() => {
    const list = this.store.sources();
    if (!list.length) return undefined;
    const found = list.find((s) => s.source_id === this.selectedSourceId());
    return found || list[0];
  });

  constructor() {
    effect(() => {
      const src = this.currentSource();
      if (src) {
        this.syncFormWithSource(src);
      }
    });

    effect(() => {
      const storeSelected = this.store.selectedSourceId();
      if (storeSelected && storeSelected !== 'ALL' && storeSelected !== this.selectedSourceId()) {
        this.selectedSourceId.set(storeSelected);
      }
    });
  }

  onSelectSource(sourceId: string): void {
    this.selectedSourceId.set(sourceId);
    const src = this.store.sources().find((s) => s.source_id === sourceId);
    if (src) {
      this.syncFormWithSource(src);
    }
  }

  private syncFormWithSource(src: CatalogSource): void {
    this.formEntrypoint = src.entrypoint || '';

    // Manejo de múltiples URLs de contingencia
    const urls: string[] = [];
    if (src.contingency_urls && src.contingency_urls.length > 0) {
      urls.push(...src.contingency_urls);
    } else if (src.contingency_url) {
      urls.push(src.contingency_url);
    }
    this.formContingencyUrls.set(urls);
    this.newContingencyUrl = '';

    this.formCategory = (src.update_category as any) || 'MONTHLY';
    this.formRateLimit = src.rate_limit_seconds ?? 1.0;
    this.formMaxUrls = src.max_urls ?? 250;
    this.formMaxResources = src.max_resources ?? 1000;
    this.formIgnoreRobots = !!src.ignore_robots_txt;
    this.formHealth = (src.health_status as any) || 'ACTIVE';
    this.formAuditCode = src.audit_code || '';
    this.formAuditNote = src.audit_note || '';

    this.formSeeds.set([...(src.seeds || [])]);
    this.formExtensions.set([...(src.allowed_extensions || ['.pdf', '.xlsx', '.csv', '.zip'])]);
    this.actionMessage.set('');
  }

  // URLs de Contingencia (múltiples)
  addContingencyUrl(): void {
    const url = this.newContingencyUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('La URL debe comenzar con http:// o https://');
      return;
    }
    const current = this.formContingencyUrls();
    if (!current.includes(url)) {
      this.formContingencyUrls.set([...current, url]);
    }
    this.newContingencyUrl = '';
  }

  removeContingencyUrl(index: number): void {
    const current = this.formContingencyUrls();
    this.formContingencyUrls.set(current.filter((_, idx) => idx !== index));
  }

  // Rutas Semilla
  addSeed(): void {
    const url = this.newSeedUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('La ruta semilla debe comenzar con http:// o https://');
      return;
    }
    const current = this.formSeeds();
    if (!current.includes(url)) {
      this.formSeeds.set([...current, url]);
    }
    this.newSeedUrl = '';
  }

  removeSeed(index: number): void {
    const current = this.formSeeds();
    this.formSeeds.set(current.filter((_, idx) => idx !== index));
  }

  // Extensiones
  toggleExtension(ext: string): void {
    const current = this.formExtensions();
    if (current.includes(ext)) {
      if (current.length > 1) {
        this.formExtensions.set(current.filter((e) => e !== ext));
      }
    } else {
      this.formExtensions.set([...current, ext]);
    }
  }

  onSavePolicy(): void {
    const sid = this.selectedSourceId();
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(false);
    this.actionMessage.set('Guardando parámetros en la base de datos...');

    const contingencyList = this.formContingencyUrls();
    const payload: SourcePolicyUpdate = {
      entrypoint: this.formEntrypoint,
      contingency_urls: contingencyList,
      contingency_url: contingencyList.length > 0 ? contingencyList[0] : undefined,
      seeds: this.formSeeds(),
      update_category: this.formCategory,
      allowed_extensions: this.formExtensions(),
      rate_limit_seconds: this.formRateLimit,
      max_urls: this.formMaxUrls,
      max_resources: this.formMaxResources,
      ignore_robots_txt: this.formIgnoreRobots,
      health_status: this.formHealth,
      audit_code: this.formAuditCode,
      audit_note: this.formAuditNote
    };

    this.store.saveSourcePolicy(sid, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.actionMessage.set(`Parámetros de '${sid.toUpperCase()}' guardados y sincronizados correctamente.`);
        setTimeout(() => this.actionMessage.set(''), 5000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set(true);
        this.actionMessage.set('Error al guardar los parámetros en el servidor.');
      }
    });
  }
}
