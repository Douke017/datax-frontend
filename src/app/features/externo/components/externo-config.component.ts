import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import {
  BackupOriginType,
  CatalogSource,
  SourcePolicyUpdate
} from '../../../core/models/catalog.model';

@Component({
  selector: 'app-externo-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './externo-config.component.html',
  styleUrl: './externo-config.component.css'
})
export class ExternoConfigComponent {
  readonly store = inject(ExternoStore);

  readonly availableExtensions = [
    '.pdf',
    '.xlsx',
    '.xls',
    '.csv',
    '.zip',
    '.docx',
    '.dat',
    '.json',
    '.ods'
  ];

  readonly selectedSourceId = signal<string>('bcb');
  readonly isSaving = signal<boolean>(false);
  readonly saveSuccess = signal<boolean>(false);
  readonly saveError = signal<boolean>(false);
  readonly actionMessage = signal<string>('');
  readonly validationError = signal<string>('');

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

  readonly formAllowedHosts = signal<string[]>([]);
  newAllowedHost = '';

  readonly formExcludedKeywords = signal<string[]>([]);
  newExcludedKeyword = '';

  readonly formExtensions = signal<string[]>(['.pdf', '.xlsx', '.xls', '.csv', '.zip', '.docx']);

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
    this.store.clearContingencyResult();
    const src = this.store.sources().find((s) => s.source_id === sourceId);
    if (src) {
      this.syncFormWithSource(src);
    }
  }

  private syncFormWithSource(src: CatalogSource): void {
    this.formEntrypoint = src.entrypoint || '';

    const urls: string[] = [];
    if (src.contingency_urls && src.contingency_urls.length > 0) {
      urls.push(...src.contingency_urls);
    } else if (src.contingency_url) {
      urls.push(src.contingency_url);
    }
    this.formContingencyUrls.set(urls);
    this.newContingencyUrl = '';

    const cat = src.update_category;
    this.formCategory =
      cat === 'DAILY' || cat === 'WEEKLY' || cat === 'MONTHLY' ? cat : 'MONTHLY';
    this.formRateLimit = src.rate_limit_seconds ?? 1.0;
    this.formMaxUrls = src.max_urls ?? 250;
    this.formMaxResources = src.max_resources ?? 1000;
    this.formIgnoreRobots = !!src.ignore_robots_txt;
    const hs = src.health_status;
    this.formHealth =
      hs === 'ACTIVE' || hs === 'WARNING' || hs === 'SUSPENDED' ? hs : 'ACTIVE';
    this.formAuditCode = src.audit_code || '';
    this.formAuditNote = src.audit_note || '';

    this.formSeeds.set([...(src.seeds || [])]);
    this.formAllowedHosts.set([...(src.allowed_hosts || [])]);
    this.formExcludedKeywords.set([...(src.excluded_path_keywords || [])]);
    this.formExtensions.set([
      ...(src.allowed_extensions || ['.pdf', '.xlsx', '.xls', '.csv', '.zip', '.docx'])
    ]);
    this.validationError.set('');
  }

  addContingencyUrl(candidateUrl?: string): void {
    const url = (candidateUrl ?? this.newContingencyUrl).trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.validationError.set('El enlace de contingencia debe iniciar con http:// o https://');
      return;
    }
    this.validationError.set('');
    const current = this.formContingencyUrls();
    if (!current.includes(url)) {
      this.formContingencyUrls.set([...current, url]);
    }
    if (!candidateUrl) {
      this.newContingencyUrl = '';
    }
  }

  removeContingencyUrl(index: number): void {
    this.formContingencyUrls.set(this.formContingencyUrls().filter((_, idx) => idx !== index));
  }

  onDiscoverContingencies(): void {
    const sid = this.selectedSourceId();
    this.validationError.set('');
    this.store.discoverContingencies(sid, true).subscribe({
      next: (res) => {
        this.formContingencyUrls.set([...res.updated_contingency_urls]);
        this.saveSuccess.set(true);
        this.saveError.set(false);
        this.actionMessage.set(
          `Evaluación concluida: ${res.candidates.length} rutas verificadas, ${res.auto_registered_count} enlaces de respaldo registrados automáticamente.`
        );
      },
      error: () => {
        this.saveError.set(true);
        this.saveSuccess.set(false);
        this.actionMessage.set('No fue posible completar la búsqueda automática de contingencias.');
      }
    });
  }

  formatOriginType(origin: BackupOriginType): string {
    switch (origin) {
      case 'CONFIGURADA':
        return 'Respaldo Configurado';
      case 'ESPEJO_INSTITUCIONAL':
        return 'Espejo Institucional';
      case 'RUTA_ESTADISTICA_ALTERNA':
        return 'Ruta Estadística Alterna';
      case 'DATOS_ABIERTOS':
        return 'Portal Datos Abiertos';
      case 'WAYBACK_CDX':
        return 'Archivo Histórico Verificado';
      default:
        return origin;
    }
  }

  addSeed(): void {
    const url = this.newSeedUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.validationError.set('La ruta semilla debe iniciar con http:// o https://');
      return;
    }
    this.validationError.set('');
    const current = this.formSeeds();
    if (!current.includes(url)) {
      this.formSeeds.set([...current, url]);
    }
    this.newSeedUrl = '';
  }

  removeSeed(index: number): void {
    this.formSeeds.set(this.formSeeds().filter((_, idx) => idx !== index));
  }

  addAllowedHost(): void {
    const host = this.newAllowedHost
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (!host) return;
    const current = this.formAllowedHosts();
    if (!current.includes(host)) {
      this.formAllowedHosts.set([...current, host]);
    }
    this.newAllowedHost = '';
  }

  removeAllowedHost(index: number): void {
    this.formAllowedHosts.set(this.formAllowedHosts().filter((_, idx) => idx !== index));
  }

  addExcludedKeyword(): void {
    const kw = this.newExcludedKeyword.trim().toLowerCase();
    if (!kw) return;
    const current = this.formExcludedKeywords();
    if (!current.includes(kw)) {
      this.formExcludedKeywords.set([...current, kw]);
    }
    this.newExcludedKeyword = '';
  }

  removeExcludedKeyword(index: number): void {
    this.formExcludedKeywords.set(
      this.formExcludedKeywords().filter((_, idx) => idx !== index)
    );
  }

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
    this.validationError.set('');
    this.actionMessage.set('Guardando parámetros operativos del portal...');

    const contingencyList = this.formContingencyUrls();
    const payload: SourcePolicyUpdate = {
      entrypoint: this.formEntrypoint,
      contingency_urls: contingencyList,
      contingency_url: contingencyList.length > 0 ? contingencyList[0] : undefined,
      seeds: this.formSeeds(),
      allowed_hosts: this.formAllowedHosts(),
      excluded_path_keywords: this.formExcludedKeywords(),
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
        this.actionMessage.set(
          `Parámetros de '${sid.toUpperCase()}' actualizados y sincronizados correctamente.`
        );
        setTimeout(() => this.actionMessage.set(''), 5000);
      },
      error: () => {
        this.isSaving.set(false);
        this.saveError.set(true);
        this.actionMessage.set('No fue posible guardar los parámetros en el servidor.');
      }
    });
  }
}
