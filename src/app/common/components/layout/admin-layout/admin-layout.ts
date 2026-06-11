import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
import { RouterOutlet, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../../services/auth-state.service';
import { AuthService } from '../../../../modules/auth/services/auth.service';
import { LayoutService } from '../../../services/layout.service';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../toast/toast';
import { AdminSidebarComponent } from '../sidebars/admin-sidebar/admin-sidebar';
import { ROUTES } from '../../../constants/routes.constants';

@Component({
  selector: 'app-admin-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastComponent,
    AdminSidebarComponent,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly layoutService = inject(LayoutService);
  readonly toastService = inject(ToastService);
  readonly routes = ROUTES;

  sidebarOpen = signal(false);
  profileMenuOpen = signal(false);

  user = computed(() => this.authState.currentUser);
  isAdmin = computed(() => this.authState.isAdmin);

  ngOnInit(): void {
    if (!this.authState.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    this.profileMenuOpen.set(false);
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-dropdown-wrap')) {
      this.profileMenuOpen.set(false);
    }
  }
}
