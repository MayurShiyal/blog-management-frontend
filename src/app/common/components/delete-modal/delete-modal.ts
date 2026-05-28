import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-modal',
  imports: [CommonModule],
  templateUrl: './delete-modal.html',
  styleUrl: './delete-modal.scss',
})
export class DeleteModal {
  @Input() show: boolean = false;
  @Input() title: string = 'Confirm Delete';
  @Input() message: string = 'Are you sure you want to delete this item? This action cannot be undone.';
  @Input() loading: boolean = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
