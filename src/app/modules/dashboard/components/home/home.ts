import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../../../common/services/storage';
import { AuthService } from '../../../auth/services/auth.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly storage = inject(StorageService);
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly layout  = inject(LayoutService);

  readonly routes = ROUTES;

  user    = signal<{ firstName?: string; email?: string; role?: string } | null>(null);
  isAdmin = computed(() => this.storage.isAdmin());

  ngOnInit(): void {
    if (!this.storage.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }
    this.user.set(this.storage.getUser<{ firstName: string; email: string; role: string }>());

    // Redirect admins directly to the full dashboard
    if (this.storage.isAdmin()) {
      this.router.navigate([ROUTES.DASHBOARD.ADMIN.ABSOLUTE]);
      return;
    }

    this.layout.setHeader('Dashboard', 'Manage and view your blog space', false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }
}

