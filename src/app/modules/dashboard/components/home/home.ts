import { Component, inject, OnInit, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../../../common/services/auth-state.service';
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
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);

  readonly routes = ROUTES;

  user = computed(() => this.authState.currentUser);
  isAdmin = computed(() => this.authState.isAdmin);

  ngOnInit(): void {
    if (!this.authState.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    if (this.authState.isAdmin) {
      this.router.navigate([ROUTES.DASHBOARD.ADMIN.ABSOLUTE]);
      return;
    }

    this.layout.setHeader('Dashboard', 'Manage and view your blog space', false);
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
    });
  }
}
