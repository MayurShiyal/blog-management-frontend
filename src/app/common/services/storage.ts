import { Injectable } from '@angular/core';

const TOKEN_KEY = 'bma_token';


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

  hasToken(): boolean {
    return !!this.getToken();
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('bma_user');
    localStorage.removeItem('bma_role');
  }
}
