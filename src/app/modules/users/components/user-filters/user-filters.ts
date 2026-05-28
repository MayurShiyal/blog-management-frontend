import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

export type RoleFilter   = '' | 'Author' | 'Visitor';
export type StatusFilter = '' | 'Active' | 'Inactive';

@Component({
  selector: 'app-user-filters',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-filters.html',
  styleUrl: './user-filters.scss',
})
export class UserFilters {
  roleFilter     = input.required<RoleFilter>();
  statusFilter   = input.required<StatusFilter>();
  totalCount     = input.required<number>();
  searchControl  = input.required<FormControl<string | null>>();

  roleChange   = output<RoleFilter>();
  statusChange = output<StatusFilter>();

  onRoleDropdown(event: Event): void {
    this.roleChange.emit((event.target as HTMLSelectElement).value as RoleFilter);
  }

  onStatusDropdown(event: Event): void {
    this.statusChange.emit((event.target as HTMLSelectElement).value as StatusFilter);
  }
}
