import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { ROUTES } from '../constants/routes.constants';

export const authGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  if (authState.isLoggedIn) return true;
  // Not authenticated at all – go to login
  return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
};

/**
 * Admin-only guard.
 * - Not logged in  → login page
 * - Logged in but not Admin (e.g. Author) → 403 Forbidden page
 */
export const adminGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isLoggedIn) {
    return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  if (authState.isAdmin) return true;

  // User is authenticated but lacks the Admin role
  return router.createUrlTree([ROUTES.ERROR.FORBIDDEN]);
};

/**
 * Guard for routes accessible by both Admin and Author roles.
 * - Not logged in  → login page
 * - Logged in but wrong role (e.g. plain user) → 403 Forbidden page
 */
export const authorOrAdminGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isLoggedIn) {
    return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  const role = authState.role;
  if (role === 'Admin' || role === 'Author') return true;

  // Authenticated but unauthorised
  return router.createUrlTree([ROUTES.ERROR.FORBIDDEN]);
};

/**
 * Guard for Visitor-only (public) routes.
 * - Not logged in → allowed (true Visitor)
 * - Logged in as Admin → redirect to Admin dashboard
 * - Logged in as Author → redirect to Author dashboard
 * - Logged in as a regular user → allowed (regular users can browse public pages)
 *
 * Ensures Admin/Author sessions are never treated as Visitors,
 * even after closing and reopening the site (token restored on init).
 */
export const visitorGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isLoggedIn) return true;

  const role = authState.role;
  if (role === 'Admin') return router.createUrlTree([ROUTES.DASHBOARD.ADMIN.ABSOLUTE]);
  if (role === 'Author') return router.createUrlTree([ROUTES.DASHBOARD.HOME.ABSOLUTE]);

  return true;
};

export const guestGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  if (!authState.isLoggedIn) return true;
  // Redirect based on role after login
  const role = authState.role;
  if (role === 'Admin') return router.createUrlTree([ROUTES.DASHBOARD.ADMIN.ABSOLUTE]);
  if (role === 'Author') return router.createUrlTree([ROUTES.DASHBOARD.HOME.ABSOLUTE]);
  return router.createUrlTree([ROUTES.PUBLIC.BLOGS.ABSOLUTE]);
};
