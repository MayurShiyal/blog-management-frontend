import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empty-state.html',
  styleUrls: ['./empty-state.scss'],
})
export class EmptyStateComponent {
  @Input() icon: string = 'bi-folder-x';
  @Input() iconSize: number = 2.25;
  @Input() iconColor: string = '#9ca3af';

  @Input() title: string = 'No Items Found';

  @Input()
  message: string = 'There is currently no data available to display in this list.';
}
