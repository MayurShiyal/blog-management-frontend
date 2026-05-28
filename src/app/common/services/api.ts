import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private jsonHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  get<T>(path: string, token?: string): Observable<T> {
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.get<T>(`${this.baseUrl}${path}`, { headers });
  }

  post<T>(path: string, body: unknown, token?: string): Observable<T> {
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.post<T>(`${this.baseUrl}${path}`, body, { headers });
  }

  put<T>(path: string, body: unknown, token?: string): Observable<T> {
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.put<T>(`${this.baseUrl}${path}`, body, { headers });
  }

  patch<T>(path: string, body: unknown, token?: string): Observable<T> {
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, { headers });
  }

  delete<T>(path: string, token?: string): Observable<T> {
    let headers = this.jsonHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.delete<T>(`${this.baseUrl}${path}`, { headers });
  }
}
