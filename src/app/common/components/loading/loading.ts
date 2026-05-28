import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  imports: [CommonModule],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center py-5">
      <div class="spinner-border text-primary" role="status" [style.width.rem]="size" [style.height.rem]="size">
        <span class="visually-hidden">Loading...</span>
      </div>
      @if (message) {
        <p class="mt-3 text-muted fw-medium small">{{ message }}</p>
      }
    </div>
  `
})
export class LoadingComponent {
  @Input() message: string = 'Loading details...';
  @Input() size: number = 2.5;
}
