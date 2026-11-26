import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExternoStore } from '../externo.store';
import { ToastService } from '../../../core/services/toast.service';
import {
  OpenDiscoveryCandidate,
  OpenDiscoverySearchRequest,
  PromoteCandidateRequest
} from '../../../core/models/catalog.model';
import { ConfirmReasonModalComponent } from '../../../shared/components/confirm-reason-modal/confirm-reason-modal.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-externo-discovery',
  standalone: true,
  imports: [FormsModule, ConfirmReasonModalComponent, SkeletonLoaderComponent],
  templateUrl: './externo-discovery.component.html',
  styleUrls: ['./externo-discovery.component.css']
})
export class ExternoDiscoveryComponent {
  readonly store = inject(ExternoStore);
  readonly toast = inject(ToastService);

  readonly availableExtensions = [
    '.xlsx',
    '.xls',
    '.csv',
    '.pdf',
    '.zip',
    '.json',
    '.xml',
    '.docx',
    '.txt'
  ];

  queryText = 'estadísticas series datos abiertos boletín';
  sectorFilter = 'TODOS';
  trustedDomainsOnly = false;
  enableExternalProviders = true;
  enableBfsExpansion = true;
  minCombinedScore = 45;
  liveProbe = true;
  newSeedUrl = '';
  readonly customSeeds = signal<string[]>([]);
  readonly selectedExtensions = signal<string[]>([
    '.xlsx',
    '.xls',
    '.csv',
    '.json',
    '.pdf',
    '.zip'
  ]);

  // Modal nativo de promoción al catálogo oficial
  @ViewChild('promoteDialog') promoteDialogRef?: ElementRef<HTMLDialogElement>;
  readonly promotingCandidate = signal<OpenDiscoveryCandidate | null>(null);
  promoteSourceId = '';
  promoteSourceName = '';
  promoteCategory: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY';
  promoteWorkflow: 'html' | 'javascript' | 'api' = 'html';
  readonly isPromoting = signal<boolean>(false);

  // Modal auditable de descarte con motivo obligatorio
  readonly discardingCandidate = signal<OpenDiscoveryCandidate | null>(null);
  readonly isDiscarding = signal<boolean>(false);

  constructor() {
    effect(() => {
      const cand = this.promotingCandidate();
      queueMicrotask(() => {
        const dialog = this.promoteDialogRef?.nativeElement;
        if (!dialog) return;
        if (cand && !dialog.open) dialog.showModal();
        else if (!cand && dialog.open) dialog.close();
      });
    });
  }

  toggleExtension(ext: string): void {
    const current = this.selectedExtensions();
    if (current.includes(ext)) {
      if (current.length > 1) {
        this.selectedExtensions.set(current.filter((e) => e !== ext));
      }
    } else {
      this.selectedExtensions.set([...current, ext]);
    }
  }

  addCustomSeed(): void {
    const u = this.newSeedUrl.trim();
    if (!u) return;
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      this.toast.warning('Dirección inválida', 'La URL semilla debe iniciar con http:// o https://');
      return;
    }
    if (!this.customSeeds().includes(u)) {
      this.customSeeds.set([...this.customSeeds(), u]);
    }
    this.newSeedUrl = '';
  }

  removeCustomSeed(index: number): void {
    this.customSeeds.set(this.customSeeds().filter((_, i) => i !== index));
  }

  onExecuteDiscovery(): void {
    const req: OpenDiscoverySearchRequest = {
      query: this.queryText.trim() || 'estadísticas series datos abiertos',
      sector: this.sectorFilter,
      target_extensions: this.selectedExtensions(),
      seed_urls: this.customSeeds(),
      trusted_domains_only: this.trustedDomainsOnly,
      enable_external_providers: this.enableExternalProviders,
      enable_bfs_expansion: this.enableBfsExpansion,
      include_discarded: this.store.includeDiscardedCandidates(),
      min_combined_score: Number(this.minCombinedScore) || 40
    };
    this.store.runOpenDiscovery(req, this.liveProbe);
  }

  onToggleIncludeDiscarded(checked: boolean): void {
    this.store.loadDiscoveryCandidates(checked);
  }

  openPromoteModal(cand: OpenDiscoveryCandidate): void {
    const hostSlug = cand.domain
      .replace(/^www\./i, '')
      .split('.')[0]
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    this.promotingCandidate.set(cand);
    this.promoteSourceId = hostSlug || 'nueva_fuente';
    this.promoteSourceName = cand.title;
    this.promoteCategory = 'MONTHLY';
    this.promoteWorkflow = 'html';
  }

  closePromoteModal(): void {
    this.promotingCandidate.set(null);
  }

  confirmPromotion(): void {
    const cand = this.promotingCandidate();
    if (!cand) return;
    const sid = this.promoteSourceId.trim().toLowerCase();
    const sname = this.promoteSourceName.trim();
    if (!sid || !sname) return;

    this.isPromoting.set(true);
    const payload: PromoteCandidateRequest = {
      source_id: sid,
      name: sname,
      update_category: this.promoteCategory,
      workflow: this.promoteWorkflow
    };

    this.store.promoteCandidate(cand.candidate_id, payload).subscribe({
      next: (created) => {
        this.isPromoting.set(false);
        this.promotingCandidate.set(null);
        this.toast.success(
          `Fuente '${created.source_id.toUpperCase()}' incorporada al catálogo`,
          created.name
        );
      },
      error: (err) => {
        this.isPromoting.set(false);
        this.toast.error(
          'Error al incorporar candidato',
          err?.error?.detail || 'Verifique que el identificador sea único.'
        );
      }
    });
  }

  openDiscardModal(cand: OpenDiscoveryCandidate): void {
    this.discardingCandidate.set(cand);
  }

  confirmDiscard(reason: string): void {
    const cand = this.discardingCandidate();
    if (!cand) return;
    this.isDiscarding.set(true);
    this.store.discardCandidate(cand.candidate_id, reason).subscribe({
      next: () => {
        this.isDiscarding.set(false);
        this.discardingCandidate.set(null);
        this.toast.info(`Candidato '${cand.domain}' descartado`, `Motivo registrado: ${reason}`);
      },
      error: (err) => {
        this.isDiscarding.set(false);
        this.toast.error('No se pudo descartar', err?.error?.detail || 'Reintente la operación.');
      }
    });
  }

  onReactivateCandidate(cand: OpenDiscoveryCandidate): void {
    this.store.reactivateCandidate(cand.candidate_id).subscribe({
      next: () => {
        this.toast.success(`Candidato '${cand.domain}' reactivado`, 'Disponible nuevamente para evaluación.');
      },
      error: (err) => {
        this.toast.error('No se pudo reactivar', err?.error?.detail || 'Reintente la operación.');
      }
    });
  }

  formatProviderLabel(provider?: string): string {
    switch (provider) {
      case 'ckan_open_data':
        return 'Portal de Datos Abiertos';
      case 'web_metasearch':
        return 'Buscador Web';
      case 'bounded_bfs':
        return 'Exploración de Enlaces';
      case 'seed_url':
        return 'Enlace Manual';
      case 'curated_directory':
        return 'Directorio Base';
      default:
        return provider || 'Web Abierta';
    }
  }
}
