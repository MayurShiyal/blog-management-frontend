import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthUserDto } from '../../modules/auth/models/auth-response.models';

export interface AuthState {
  user: AuthUserDto | null;
  token: string | null;
  initialized: boolean;
}

const TOKEN_KEY = 'bma_token';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly _state$ = new BehaviorSubject<AuthState>({
    user: null,
    token: null,
    initialized: false,
  });

  readonly state$ = this._state$.asObservable();
  readonly user$ = this._state$.pipe(map((s) => s.user));
  readonly isLoggedIn$ = this._state$.pipe(map((s) => !!s.token && !!s.user));

  get snapshot(): AuthState {
    return this._state$.getValue();
  }

  get isLoggedIn(): boolean {
    return !!this.snapshot.token && !!this.snapshot.user;
  }

  get currentUser(): AuthUserDto | null {
    return this.snapshot.user;
  }

  get role(): string | null {
    return this.snapshot.user?.role ?? null;
  }

  get isAdmin(): boolean {
    return this.snapshot.user?.role === 'Admin';
  }

  get isAuthor(): boolean {
    return this.snapshot.user?.role === 'Author';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this._state$.next({ ...this.snapshot, token });
  }

  setUser(user: AuthUserDto): void {
    this._state$.next({ ...this.snapshot, user });
  }

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._state$.next({ user: null, token: null, initialized: true });
  }

  initialize(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this._state$.next({ user: null, token: null, initialized: true });
      return of(false);
    }

    return this.http
      .get<{ status: boolean; data?: AuthUserDto }>(`${this.baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((res) => {
          if (res.status && res.data) {
            this._state$.next({ user: res.data, token, initialized: true });
          } else {
            this.clearAuth();
          }
        }),
        map((res) => !!(res.status && res.data)),
        catchError(() => {
          this.clearAuth();
          return of(false);
        })
      );
  }
}
