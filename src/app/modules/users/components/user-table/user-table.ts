import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserListItemDto } from '../../models';

@Component({
  selector: 'app-user-table',
  imports: [CommonModule],
  templateUrl: './user-table.html',
  styleUrl: './user-table.scss',
})
export class UserTable {
  users      = input.required<UserListItemDto[]>();
  pageNumber = input.required<number>();
  pageSize   = input.required<number>();

  editClicked   = output<UserListItemDto>();
  deleteClicked = output<UserListItemDto>();
  toggleClicked = output<UserListItemDto>();

  trackById(_: number, item: UserListItemDto): string {
    return item.id;
  }
}
