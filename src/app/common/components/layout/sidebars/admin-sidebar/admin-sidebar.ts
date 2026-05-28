import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { ROUTES } from '../../../../constants/routes.constants';

@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, UpperCasePipe],
  templateUrl: './admin-sidebar.html',
  styleUrl: './admin-sidebar.scss',
})
export class AdminSidebarComponent {
  readonly routes = ROUTES;
  user = input<{ firstName?: string; email?: string; role?: string; id?: string } | null>(null);
  isOpen = input(false);
  closeSidebar = output<void>();
  logoutClicked = output<void>();
}
