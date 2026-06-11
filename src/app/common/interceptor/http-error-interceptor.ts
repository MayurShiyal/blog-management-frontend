import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take } from 'rxjs';
import { AuthStateService } from '../services/auth-state.service';
import { ROUTES } from '../constants/routes.constants';
import { environment } from '../../../environments/environment';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Global HTTP error interceptor.
 * Handles automatic token refreshing on 401 Unauthorized using HttpOnly cookies.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const http = inject(HttpClient);
  const baseUrl = environment.apiUrl;

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Prevent refreshing token for login or refresh-token requests
        if (req.url.includes('/refresh-token') || req.url.includes('/login')) {
          authState.clearAuth();
          router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
          return throwError(() => error);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return http
            .post<{ status: boolean; token?: string; data?: any }>(
              `${baseUrl}/api/user/refresh-token`,
              {},
              { withCredentials: true }
            )
            .pipe(
              switchMap((res) => {
                isRefreshing = false;
                if (res.status && res.token) {
                  authState.setToken(res.token);
                  if (res.data) {
                    authState.setUser(res.data);
                  }
                  refreshTokenSubject.next(res.token);
                  
                  // Clone request and retry with new headers
                  const retryReq = req.clone({
                    setHeaders: { Authorization: `Bearer ${res.token}` },
                    withCredentials: true,
                  });
                  return next(retryReq);
                } else {
                  authState.clearAuth();
                  router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
                  return throwError(() => error);
                }
              }),
              catchError((refreshErr) => {
                isRefreshing = false;
                authState.clearAuth();
                router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
                return throwError(() => refreshErr);
              })
            );
        } else {
          // If already refreshing, wait for the token and retry
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
              const retryReq = req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              });
              return next(retryReq);
            })
          );
        }
      }

      if (error.status === 403) {
        router.navigate([ROUTES.ERROR.FORBIDDEN]);
      }

      return throwError(() => error);
    })
  );
};
