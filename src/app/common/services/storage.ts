import { Injectable } from '@angular/core';

const TOKEN_KEY = 'bma_token';
const USER_KEY = 'bma_user';
const ROLE_KEY = 'bma_role';

@Injectable({ providedIn: 'root' })
export class StorageService {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  setUser(user: object): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser<T = unknown>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  setRole(role: string): void {
    localStorage.setItem(ROLE_KEY, role);
  }

  getRole(): string | null {
    return localStorage.getItem(ROLE_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getRole() === 'Admin';
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}
