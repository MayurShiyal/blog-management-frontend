import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { ApiService } from '../../../common/services/api';
import { StorageService } from '../../../common/services/storage';
import { AuthStateService } from '../../../common/services/auth-state.service';
import {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../models/auth-request.models';
import {
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from '../models/auth-response.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);
  private readonly authState = inject(AuthStateService);

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.api.post<RegisterResponse>('/api/user/register', payload);
  }

  /**
   * Evaluates if an email address is already bound to an active registered profile
   * @param email The target raw query email string string typed into the input control field
   */
  checkEmailExists(email: string): Observable<{ status: boolean; exists: boolean; message?: string }> {
    // Passes the lowercase string inside query params configuration mapping
    return this.api.get<{ status: boolean; exists: boolean; message?: string }>(
      `/api/user/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
    );
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/user/login', payload).pipe(
      tap((res) => {
        if (res.status && res.token) {
          this.storage.setToken(res.token);
          this.authState.setToken(res.token);
          if (res.data) {
            this.authState.setUser(res.data);
          }
        }
      })
    );
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.api.post<ForgotPasswordResponse>('/api/user/forgot-password', payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<ResetPasswordResponse> {
    return this.api.post<ResetPasswordResponse>('/api/user/reset-password', payload);
  }

  changePassword(payload: any): Observable<any> {
    return this.api.post<any>('/api/user/change-password', payload);
  }

  logout(): Observable<void> {
    return this.api.post('/api/user/logout', {}).pipe(
      tap(() => {
        this.storage.clear();
        this.authState.clearAuth();
      }),
      catchError(() => {
        this.storage.clear();
        this.authState.clearAuth();
        return of(undefined);
      }),
      map(() => undefined)
    );
  }

  isLoggedIn(): boolean {
    return this.authState.isLoggedIn;
  }

  isAdmin(): boolean {
    return this.authState.isAdmin;
  }
}