import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../../services/storage';
import { AuthService } from '../../../../modules/auth/services/auth.service';
import { LayoutService } from '../../../services/layout.service';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../toast/toast';
import { AdminSidebarComponent } from '../sidebars/admin-sidebar/admin-sidebar';
import { AuthorSidebarComponent } from '../sidebars/author-sidebar/author-sidebar';
import { ROUTES } from '../../../constants/routes.constants';

@Component({
  selector: 'app-admin-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    ToastComponent,
    AdminSidebarComponent,
    AuthorSidebarComponent,
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly layoutService = inject(LayoutService);
  readonly toastService = inject(ToastService);

  user = signal<{ firstName?: string; email?: string; role?: string; id?: string } | null>(null);
  sidebarOpen = signal(false);

  isAdmin = computed(() => this.user()?.role === 'Admin');

  ngOnInit(): void {
    if (!this.storage.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }
    const currentUser = this.storage.getUser<{
      firstName: string;
      email: string;
      role: string;
      id: string;
    }>();
    this.user.set(currentUser);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }
}
