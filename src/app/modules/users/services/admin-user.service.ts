import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  GetUsersResponse,
  GetUserByIdResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
  DeleteUserResponse,
} from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly api  = inject(ApiService);
  private readonly base = '/api/admin/users';

  // ── GET /api/admin/users ─────────────────────────────────────────────────
  getUsers(params: {
    search?:     string;
    role?:       string;
    status?:     string;
    pageNumber?: number;
    pageSize?:   number;
  } = {}): Observable<GetUsersResponse> {
    const parts: string[] = [];

    if (params.search && params.search.trim()) {
      parts.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.role && params.role !== '') {
      parts.push(`role=${encodeURIComponent(params.role)}`);
    }
    if (params.status && params.status !== '') {
      parts.push(`status=${encodeURIComponent(params.status)}`);
    }
    if (params.pageNumber != null) {
      parts.push(`pageNumber=${params.pageNumber}`);
    }
    if (params.pageSize != null) {
      parts.push(`pageSize=${params.pageSize}`);
    }

    const qs = parts.length ? `?${parts.join('&')}` : '';
    return this.api.get<GetUsersResponse>(`${this.base}${qs}`);
  }

  // ── GET /api/admin/users/{id} ────────────────────────────────────────────
  getById(id: string): Observable<GetUserByIdResponse> {
    return this.api.get<GetUserByIdResponse>(`${this.base}/${id}`);
  }

  // ── PUT /api/admin/users/{id} ────────────────────────────────────────────
  update(id: string, payload: UpdateUserRequest): Observable<UpdateUserResponse> {
    return this.api.put<UpdateUserResponse>(`${this.base}/${id}`, payload);
  }

  // ── PATCH /api/admin/users/{id}/status ───────────────────────────────────
  updateStatus(id: string, payload: UpdateUserStatusRequest): Observable<UpdateUserStatusResponse> {
    return this.api.patch<UpdateUserStatusResponse>(`${this.base}/${id}/status`, payload);
  }

  // ── DELETE /api/admin/users/{id} ─────────────────────────────────────────
  delete(id: string): Observable<DeleteUserResponse> {
    return this.api.delete<DeleteUserResponse>(`${this.base}/${id}`);
  }
}
