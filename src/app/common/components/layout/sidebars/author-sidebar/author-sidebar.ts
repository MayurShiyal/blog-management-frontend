import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { ROUTES } from '../../../../constants/routes.constants';

@Component({
  selector: 'app-author-sidebar',
  imports: [RouterLink, RouterLinkActive, UpperCasePipe],
  templateUrl: './author-sidebar.html',
  styleUrl: './author-sidebar.scss',
})
export class AuthorSidebarComponent {
  readonly routes = ROUTES;
  user = input<{ firstName?: string; email?: string; role?: string; id?: string } | null>(null);
  isOpen = input(false);
  closeSidebar = output<void>();
  logoutClicked = output<void>();
}

