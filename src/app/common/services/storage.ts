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

  /** Returns true only if a token string exists in storage. Does NOT validate the token. */
  hasToken(): boolean {
    return !!this.getToken();
  }

  /** Clears only the token from storage. */
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    // Remove any legacy keys that may have been stored before this refactor
    localStorage.removeItem('bma_user');
    localStorage.removeItem('bma_role');
  }
}
