import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToastItem {
  id: number;
  type: 'success' | 'danger' | 'warning';
  message: string;
}

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class ToastComponent {
  @Input() toasts: ToastItem[] = [];

  @Output() dismiss = new EventEmitter<number>();

  onDismiss(id: number): void {
    this.dismiss.emit(id);
  }
}
