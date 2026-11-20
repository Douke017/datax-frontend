import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css']
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getToneLabel(tone: string): string {
    switch (tone) {
      case 'success':
        return 'OK';
      case 'warning':
        return 'AVISO';
      case 'error':
        return 'ERROR';
      default:
        return 'INFO';
    }
  }
}
