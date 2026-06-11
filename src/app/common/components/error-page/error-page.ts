import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../services/auth-state.service';
import { ROUTES } from '../../constants/routes.constants';

interface ErrorConfig {
  code: number;
  title: string;
  message: string;
  description: string;
  icon: string;
  iconColor: string;
  primaryLabel: string;
  primaryRoute: string;
  showSecondary: boolean;
}

const ERROR_CONFIGS: Record<number, ErrorConfig> = {
  401: {
    code: 401,
    title: 'Authentication Required',
    message: 'You are not signed in.',
    description:
      'Please log in to your account to access this page. If you believe this is an error, try signing in again.',
    icon: 'bi-lock-fill',
    iconColor: '#f59e0b',
    primaryLabel: 'Sign In',
    primaryRoute: ROUTES.AUTH.LOGIN.ABSOLUTE,
    showSecondary: true,
  },
  403: {
    code: 403,
    title: 'Access Denied',
    message: 'You do not have permission to access this page.',
    description:
      'Your account role does not permit access to this resource. If you think this is a mistake, please contact your administrator.',
    icon: 'bi-shield-lock-fill',
    iconColor: '#ef4444',
    primaryLabel: 'Go to Dashboard',
    primaryRoute: ROUTES.DASHBOARD.HOME.ABSOLUTE,
    showSecondary: true,
  },
  404: {
    code: 404,
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.',
    description:
      'The URL may be incorrect, or the resource may have been moved or deleted. Double-check the address and try again.',
    icon: 'bi-file-earmark-x-fill',
    iconColor: '#6366f1',
    primaryLabel: 'Go Home',
    primaryRoute: ROUTES.PUBLIC.BLOGS.ABSOLUTE,
    showSecondary: false,
  },
  500: {
    code: 500,
    title: 'Server Error',
    message: 'Something went wrong on our end.',
    description:
      'An unexpected error occurred on the server. Our team has been notified. Please try again in a few moments.',
    icon: 'bi-exclamation-triangle-fill',
    iconColor: '#f97316',
    primaryLabel: 'Try Again',
    primaryRoute: ROUTES.PUBLIC.BLOGS.ABSOLUTE,
    showSecondary: false,
  },
};

const DEFAULT_ERROR: ErrorConfig = {
  code: 0,
  title: 'Unexpected Error',
  message: 'Something went wrong.',
  description: 'An unexpected error occurred. Please try navigating back to the home page.',
  icon: 'bi-exclamation-circle-fill',
  iconColor: '#6b7280',
  primaryLabel: 'Go Home',
  primaryRoute: ROUTES.PUBLIC.BLOGS.ABSOLUTE,
  showSecondary: false,
};

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);

  config = signal<ErrorConfig>(DEFAULT_ERROR);
  isLoggedIn = signal(false);

  ngOnInit(): void {
    this.isLoggedIn.set(this.authState.isLoggedIn);

    const code = Number(this.route.snapshot.paramMap.get('code') ?? 0);
    this.config.set(ERROR_CONFIGS[code] ?? DEFAULT_ERROR);
  }

  navigatePrimary(): void {
    this.router.navigate([this.config().primaryRoute]);
  }

  goBack(): void {
    history.back();
  }
}
