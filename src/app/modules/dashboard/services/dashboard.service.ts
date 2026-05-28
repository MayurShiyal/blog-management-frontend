import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  GetDashboardSummaryResponse,
  GetDashboardStatusResponse,
  GetDashboardBlogsResponse,
} from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api  = inject(ApiService);
  private readonly base = '/api/admin/dashboard';

  // ── GET /api/admin/dashboard/summary ─────────────────────────────────────
  getSummary(): Observable<GetDashboardSummaryResponse> {
    return this.api.get<GetDashboardSummaryResponse>(`${this.base}/summary`);
  }

  // ── GET /api/admin/dashboard/status ──────────────────────────────────────
  getStatus(): Observable<GetDashboardStatusResponse> {
    return this.api.get<GetDashboardStatusResponse>(`${this.base}/status`);
  }

  // ── GET /api/admin/dashboard/blogs ───────────────────────────────────────
  getBlogs(params: { latestCount?: number; monthsBack?: number } = {}): Observable<GetDashboardBlogsResponse> {
    const parts: string[] = [];
    if (params.latestCount != null) parts.push(`latestCount=${params.latestCount}`);
    if (params.monthsBack  != null) parts.push(`monthsBack=${params.monthsBack}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    return this.api.get<GetDashboardBlogsResponse>(`${this.base}/blogs${qs}`);
  }
}
