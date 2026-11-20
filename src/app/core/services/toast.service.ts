import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  durationMs: number;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = signal<ToastMessage[]>([]);
  readonly liveAnnouncement = signal<string>('');

  show(
    tone: ToastTone,
    title: string,
    detail?: string,
    durationMs: number = tone === 'error' ? 7000 : 4200
  ): number {
    const id = this.nextId++;
    const msg: ToastMessage = {
      id,
      tone,
      title,
      detail,
      durationMs,
      createdAt: Date.now()
    };

    this.toasts.update((list) => [...list.slice(-4), msg]);
    this.announce(detail ? `${title}. ${detail}` : title);

    if (durationMs > 0) {
      this.scheduleDismiss(id, durationMs);
    }
    return id;
  }

  success(title: string, detail?: string): number {
    return this.show('success', title, detail);
  }

  info(title: string, detail?: string): number {
    return this.show('info', title, detail);
  }

  warning(title: string, detail?: string): number {
    return this.show('warning', title, detail, 5500);
  }

  error(title: string, detail?: string): number {
    return this.show('error', title, detail, 7500);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  pauseDismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  resumeDismiss(id: number): void {
    const target = this.toasts().find((t) => t.id === id);
    if (target && target.durationMs > 0) {
      this.scheduleDismiss(id, 2400);
    }
  }

  copyToClipboard(text: string, label: string = 'Contenido'): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.success(`${label} copiado al portapapeles`);
        })
        .catch(() => {
          this.error(`No se pudo copiar ${label.toLowerCase()}`);
        });
    } else {
      this.warning('Portapapeles no disponible en este navegador');
    }
  }

  private scheduleDismiss(id: number, delayMs: number): void {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.timers.delete(id);
      this.toasts.update((list) => list.filter((t) => t.id !== id));
    }, delayMs);
    this.timers.set(id, timer);
  }

  private announce(message: string): void {
    this.liveAnnouncement.set('');
    setTimeout(() => this.liveAnnouncement.set(message), 20);
    if (typeof document !== 'undefined') {
      const docAny = document as unknown as { ariaNotify?: (text: string) => void };
      if (typeof docAny.ariaNotify === 'function') {
        try {
          docAny.ariaNotify(message);
        } catch {
          // Fallback live region already active
        }
      }
    }
  }
}
