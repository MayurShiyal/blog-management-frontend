import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryDto } from '../../models';

@Component({
  selector: 'app-category-table',
  imports: [CommonModule],
  templateUrl: './category-table.html',
  styleUrl: './category-table.scss',
})
export class CategoryTable {
  categories = input.required<CategoryDto[]>();
  pageNumber = input.required<number>();
  pageSize = input.required<number>();
  isAdmin = input.required<boolean>();

  editClicked = output<CategoryDto>();
  deleteClicked = output<CategoryDto>();
  toggleClicked = output<CategoryDto>();

  trackById(_: number, item: CategoryDto): number {
    return item.id;
  }
}
