import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StorageService } from '../services/storage';
import { ROUTES } from '../constants/routes.constants';

export const authGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router  = inject(Router);
  if (storage.isLoggedIn()) return true;
  return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
};

export const adminGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router  = inject(Router);
  if (storage.isLoggedIn() && storage.isAdmin()) return true;
  return router.createUrlTree([ROUTES.AUTH.LOGIN.ABSOLUTE]);
};

export const guestGuard: CanActivateFn = (_route, _state) => {
  const storage = inject(StorageService);
  const router  = inject(Router);
  if (!storage.isLoggedIn()) return true;
  return router.createUrlTree([ROUTES.DASHBOARD.HOME.ABSOLUTE]);
};

