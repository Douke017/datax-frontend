import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-reason-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './confirm-reason-modal.component.html',
  styleUrls: ['./confirm-reason-modal.component.css']
})
export class ConfirmReasonModalComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('Confirmar operación auditable');
  readonly description = input<string>(
    'Esta acción quedará registrada en la bitácora de auditoría con su justificación técnica.'
  );
  readonly reasonLabel = input<string>('Justificación obligatoria');
  readonly reasonPlaceholder = input<string>(
    'Describa la causa técnica o referencia de ticket que justifica este cambio...'
  );
  readonly confirmLabel = input<string>('Confirmar cambio');
  readonly cancelLabel = input<string>('Cancelar');
  readonly minLength = input<number>(5);
  readonly tone = input<'primary' | 'warning' | 'danger'>('warning');
  readonly busy = input<boolean>(false);

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  @ViewChild('confirmDialog') dialogRef?: ElementRef<HTMLDialogElement>;

  readonly reasonText = signal<string>('');
  readonly errorText = signal<string>('');
  readonly titleId = `confirm-title-${Math.random().toString(36).slice(2, 9)}`;

  constructor() {
    effect(() => {
      const shouldOpen = this.open();
      queueMicrotask(() => {
        const dialog = this.dialogRef?.nativeElement;
        if (!dialog) return;
        if (shouldOpen && !dialog.open) {
          this.reasonText.set('');
          this.errorText.set('');
          dialog.showModal();
        } else if (!shouldOpen && dialog.open) {
          dialog.close();
        }
      });
    });
  }

  onSubmit(): void {
    const clean = this.reasonText().trim();
    if (clean.length < this.minLength()) {
      this.errorText.set(
        `Debe ingresar al menos ${this.minLength()} caracteres de justificación técnica.`
      );
      return;
    }
    this.errorText.set('');
    this.confirmed.emit(clean);
  }

  onCancel(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    } else {
      this.cancelled.emit();
    }
  }

  onDialogClosed(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (dialog) dialog.returnValue = '';
    if (this.open()) {
      this.cancelled.emit();
    }
  }
}
