import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { ROUTES } from '../constants/routes.constants';

export const authGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  if (authState.isLoggedIn) return true;

  return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
};

export const adminGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isLoggedIn) {
    return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  if (authState.isAdmin) return true;

  return router.createUrlTree([ROUTES.ERROR.FORBIDDEN]);
};

export const authorOrAdminGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.isLoggedIn) {
    return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  const role = authState.role;
  if (role === 'Admin' || role === 'Author') return true;

  return router.createUrlTree([ROUTES.ERROR.FORBIDDEN]);
};

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

  const role = authState.role;
  if (role === 'Admin') return router.createUrlTree([ROUTES.DASHBOARD.ADMIN.ABSOLUTE]);
  if (role === 'Author') return router.createUrlTree([ROUTES.DASHBOARD.HOME.ABSOLUTE]);
  return router.createUrlTree([ROUTES.PUBLIC.BLOGS.ABSOLUTE]);
};
