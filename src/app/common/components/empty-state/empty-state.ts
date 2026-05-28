import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  imports: [CommonModule],
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center py-5 text-center px-3">
      <div class="empty-state-icon-wrap mb-3 d-flex align-items-center justify-content-center" [style.color]="iconColor">
        <i class="bi" [class]="icon" [style.font-size.rem]="iconSize"></i>
      </div>
      <h3 class="fw-bold fs-5 text-dark mb-2">{{ title }}</h3>
      <p class="text-muted small mb-0 max-width-320">{{ message }}</p>
    </div>
  `,
  styles: [`
    .empty-state-icon-wrap {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 50%;
      background-color: #f3f4f6;
    }
    .max-width-320 {
      max-width: 320px;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string = 'bi-folder-x';
  @Input() iconSize: number = 2.25;
  @Input() iconColor: string = '#9ca3af';
  @Input() title: string = 'No Items Found';
  @Input() message: string = 'There is currently no data available to display in this list.';
}
