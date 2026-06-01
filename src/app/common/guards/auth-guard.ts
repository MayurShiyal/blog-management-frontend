import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage';
import { ROUTES } from '../constants/routes.constants';

export const authGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  if (storage.isLoggedIn()) return true;
  return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
};

export const adminGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  if (storage.isLoggedIn() && storage.isAdmin()) return true;
  return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
};

/** Only Admin and Author roles can access protected dashboard routes. */
export const authorOrAdminGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  if (!storage.isLoggedIn()) {
    return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }
  const role = storage.getRole();
  if (role === 'Admin' || role === 'Author') return true;
  // Visitor/Customer => redirect to public blogs
  return router.createUrlTree([ROUTES.PUBLIC.BLOGS.ABSOLUTE]);
};

export const guestGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router = inject(Router);
  if (!storage.isLoggedIn()) return true;
  // Redirect based on role after login
  const role = storage.getRole();
  if (role === 'Admin') return router.createUrlTree([ROUTES.DASHBOARD.ADMIN.ABSOLUTE]);
  if (role === 'Author') return router.createUrlTree([ROUTES.DASHBOARD.HOME.ABSOLUTE]);
  return router.createUrlTree([ROUTES.PUBLIC.BLOGS.ABSOLUTE]);
};
