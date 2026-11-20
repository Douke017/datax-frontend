import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output
} from '@angular/core';

export interface DrawerTab {
  id: string;
  label: string;
  badge?: string | number;
}

@Component({
  selector: 'app-slide-over-drawer',
  standalone: true,
  imports: [],
  templateUrl: './slide-over-drawer.component.html',
  styleUrls: ['./slide-over-drawer.component.css']
})
export class SlideOverDrawerComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('Detalle Técnico');
  readonly subtitle = input<string>('');
  readonly badge = input<string>('');
  readonly size = input<'md' | 'lg' | 'xl'>('lg');
  readonly tabs = input<DrawerTab[]>([]);
  readonly activeTab = input<string>('');

  readonly closed = output<void>();
  readonly tabChange = output<string>();

  @ViewChild('drawerDialog') dialogRef?: ElementRef<HTMLDialogElement>;

  private pointerDownOutside = false;
  readonly titleId = `drawer-title-${Math.random().toString(36).slice(2, 9)}`;

  constructor() {
    effect(() => {
      const shouldOpen = this.open();
      queueMicrotask(() => {
        const dialog = this.dialogRef?.nativeElement;
        if (!dialog) return;
        if (shouldOpen && !dialog.open) {
          dialog.showModal();
        } else if (!shouldOpen && dialog.open) {
          dialog.close();
        }
      });
    });
  }

  onRequestClose(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    } else {
      this.closed.emit();
    }
  }

  onDialogClosed(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog) {
      dialog.returnValue = '';
    }
    if (this.open()) {
      this.closed.emit();
    }
  }

  onPointerDown(event: PointerEvent): void {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    this.pointerDownOutside = this.isOutsideDialog(event, dialog);
  }

  onPointerUp(event: PointerEvent): void {
    if ('closedBy' in HTMLDialogElement.prototype) return;
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    if (this.pointerDownOutside && this.isOutsideDialog(event, dialog)) {
      dialog.close();
    }
    this.pointerDownOutside = false;
  }

  selectTab(tabId: string): void {
    this.tabChange.emit(tabId);
  }

  private isOutsideDialog(event: PointerEvent, dialog: HTMLDialogElement): boolean {
    const r = dialog.getBoundingClientRect();
    return (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    );
  }
}
