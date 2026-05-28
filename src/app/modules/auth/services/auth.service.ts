import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../../../common/services/api';
import { StorageService } from '../../../common/services/storage';
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

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.api.post<RegisterResponse>('/api/user/register', payload);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/api/user/login', payload).pipe(
      tap((res) => {
        if (res.status && res.token) {
          this.storage.setToken(res.token);
          if (res.data) {
            this.storage.setUser(res.data);
            this.storage.setRole(res.data.role);
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

  logout(): void {
    this.storage.clear();
  }

  isLoggedIn(): boolean {
    return this.storage.isLoggedIn();
  }

  isAdmin(): boolean {
    return this.storage.isAdmin();
  }
}
