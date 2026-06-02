import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../../services/auth-state.service';
import { AuthService } from '../../../../modules/auth/services/auth.service';
import { ROUTES } from '../../../constants/routes.constants';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly routes = ROUTES;
  readonly currentYear = new Date().getFullYear();

  isLoggedIn = computed(() => this.authState.isLoggedIn);

  logout(): void {
    this.auth.logout();
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }
}
