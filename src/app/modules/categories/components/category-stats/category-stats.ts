import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-category-stats',
  imports: [CommonModule],
  templateUrl: './category-stats.html',
  styleUrl: './category-stats.scss',
})
export class CategoryStats {
  statusFilter = input.required<StatusFilter>();

  filterChange = output<StatusFilter>();

  setFilter(filter: StatusFilter): void {
    this.filterChange.emit(filter);
  }
}
