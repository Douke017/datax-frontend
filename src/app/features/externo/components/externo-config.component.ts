import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import { ToastService } from '../../../core/services/toast.service';
import {
  BackupOriginType,
  CatalogSource,
  ContingencyCandidate,
  SourcePolicyUpdate
} from '../../../core/models/catalog.model';
import { formatLatencyMs } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-externo-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './externo-config.component.html',
  styleUrl: './externo-config.component.css'
})
export class ExternoConfigComponent {
  readonly store = inject(ExternoStore);
  readonly toast = inject(ToastService);

  readonly formatMs = formatLatencyMs;

  readonly availableExtensions = [
    '.xlsx',
    '.xls',
    '.csv',
    '.pdf',
    '.zip',
    '.docx',
    '.json',
    '.xml',
    '.txt',
    '.rar'
  ];

  readonly selectedSourceId = signal<string>('bcb');
  readonly isSaving = signal<boolean>(false);
  readonly validationError = signal<string>('');

  // Per-URL health probe map
  readonly probingUrl = signal<string | null>(null);
  readonly probeResults = signal<Record<string, ContingencyCandidate>>({});

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

  readonly formExtensions = signal<string[]>(['.pdf', '.xlsx', '.xls', '.csv', '.zip']);

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
    this.probeResults.set({});
    const src = this.store.sources().find((s) => s.source_id === sourceId);
    if (src) this.syncFormWithSource(src);
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
    this.formHealth = hs === 'ACTIVE' || hs === 'WARNING' || hs === 'SUSPENDED' ? hs : 'ACTIVE';
    this.formAuditCode = src.audit_code || '';
    this.formAuditNote = src.audit_note || '';

    this.formSeeds.set([...(src.seeds || [])]);
    this.formAllowedHosts.set([...(src.allowed_hosts || [])]);
    this.formExcludedKeywords.set([...(src.excluded_path_keywords || [])]);
    this.formExtensions.set([
      ...(src.allowed_extensions || ['.pdf', '.xlsx', '.xls', '.csv', '.zip'])
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
    if (!candidateUrl) this.newContingencyUrl = '';
  }

  removeContingencyUrl(index: number): void {
    this.formContingencyUrls.set(this.formContingencyUrls().filter((_, idx) => idx !== index));
  }

  moveContingency(index: number, delta: -1 | 1): void {
    const list = [...this.formContingencyUrls()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const tmp = list[index];
    list[index] = list[target];
    list[target] = tmp;
    this.formContingencyUrls.set(list);
  }

  onProbeContingencyUrl(url: string): void {
    const sid = this.selectedSourceId();
    this.probingUrl.set(url);
    this.store.probeContingencyUrl(sid, url).subscribe({
      next: (res) => {
        this.probingUrl.set(null);
        this.probeResults.set({ ...this.probeResults(), [url]: res });
        if (res.reachable) {
          this.toast.success(
            `Respaldo verificado (HTTP ${res.http_status})`,
            `${this.formatFreshnessLabel(res.freshness_class)} · ${this.formatMs(res.latency_ms)}`
          );
        } else {
          this.toast.warning('Respaldo no alcanzable', res.recommendation);
        }
      },
      error: (err) => {
        this.probingUrl.set(null);
        this.toast.error(
          'Error al verificar respaldo',
          err?.error?.detail || 'No se pudo completar la verificación de conexión.'
        );
      }
    });
  }

  onDiscoverContingencies(): void {
    const sid = this.selectedSourceId();
    this.validationError.set('');
    this.store.discoverContingencies(sid, true).subscribe({
      next: (res) => {
        this.formContingencyUrls.set([...res.updated_contingency_urls]);
        this.toast.success(
          'Evaluación de contingencias finalizada',
          `${res.candidates.length} rutas probadas, ${res.auto_registered_count} espejos activos registrados.`
        );
      },
      error: () => {
        this.toast.error('No fue posible completar la búsqueda automática de contingencias.');
      }
    });
  }

  formatHealthLabel(status?: string): string {
    if (status === 'ACTIVE') return 'Lista Blanca';
    if (status === 'WARNING') return 'Con Incidencia';
    if (status === 'SUSPENDED') return 'Suspendida';
    return status || 'Operativa';
  }

  formatFreshnessLabel(freshness?: string): string {
    return freshness === 'HISTORICO_SOLO_LECTURA' ? 'Archivo Histórico' : 'Espejo Activo';
  }

  formatOriginType(origin: BackupOriginType): string {
    switch (origin) {
      case 'CONFIGURADA':
        return 'Respaldo Configurado';
      case 'REDIRECCION_PERMANENTE':
        return 'Redirección Permanente';
      case 'SITEMAP_ALTERNO':
        return 'Mapa de Sitio Alterno';
      case 'ESPEJO_INSTITUCIONAL':
        return 'Espejo Institucional';
      case 'RUTA_ESTADISTICA_ALTERNA':
        return 'Ruta Estadística Alterna';
      case 'DATOS_ABIERTOS':
        return 'Portal de Datos Abiertos';
      case 'WAYBACK_CDX':
        return 'Archivo Histórico Web';
      default:
        return origin;
    }
  }

  addSeed(): void {
    const url = this.newSeedUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.validationError.set('La URL semilla debe iniciar con http:// o https://');
      return;
    }
    this.validationError.set('');
    if (!this.formSeeds().includes(url)) {
      this.formSeeds.set([...this.formSeeds(), url]);
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
    if (!this.formAllowedHosts().includes(host)) {
      this.formAllowedHosts.set([...this.formAllowedHosts(), host]);
    }
    this.newAllowedHost = '';
  }

  removeAllowedHost(index: number): void {
    this.formAllowedHosts.set(this.formAllowedHosts().filter((_, idx) => idx !== index));
  }

  addExcludedKeyword(): void {
    const kw = this.newExcludedKeyword.trim().toLowerCase();
    if (!kw) return;
    if (!this.formExcludedKeywords().includes(kw)) {
      this.formExcludedKeywords.set([...this.formExcludedKeywords(), kw]);
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
    this.validationError.set('');

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
        this.toast.success(
          `Política de '${sid.toUpperCase()}' guardada`,
          'Cambios persistidos y sincronizados correctamente.'
        );
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.error(
          'No fue posible guardar los parámetros',
          err?.error?.detail || 'Revise los campos obligatorios.'
        );
      }
    });
  }
}
