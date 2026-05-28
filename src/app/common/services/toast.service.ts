import { Injectable, signal } from '@angular/core';

export interface ToastItem {
  id: number;
  type: 'success' | 'danger' | 'warning';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<ToastItem[]>([]);
  private toastCounter = 0;

  show(type: 'success' | 'danger' | 'warning', message: string): void {
    const id = ++this.toastCounter;
    this.toasts.update((t) => [...t, { id, type, message }]);
    setTimeout(() => this.dismiss(id), 4500);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
