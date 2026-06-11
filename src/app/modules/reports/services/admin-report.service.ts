import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  GetReportedContentsResponse,
  GetReportHistoryResponse,
  UpdateReportStatusRequest,
  UpdateReportStatusResponse,
  ReportStatus,
} from '../models/report.models';
import { GetAllReportHistoryResponse } from '../components/report-history/report-history';

@Injectable({ providedIn: 'root' })
export class AdminReportService {
  private readonly api = inject(ApiService);
  private readonly base = '/api/admin/reports';

  getReportedContents(params: {
    contentType: 'blog' | 'comment';
    status?: ReportStatus | null;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortDesc?: boolean;
  }): Observable<GetReportedContentsResponse> {
    const parts: string[] = [`contentType=${params.contentType}`];

    if (params.status != null) parts.push(`status=${params.status}`);
    if (params.search?.trim()) parts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.pageNumber != null) parts.push(`pageNumber=${params.pageNumber}`);
    if (params.pageSize != null) parts.push(`pageSize=${params.pageSize}`);
    if (params.sortBy?.trim()) parts.push(`sortBy=${encodeURIComponent(params.sortBy.trim())}`);
    if (params.sortDesc != null) parts.push(`sortDesc=${params.sortDesc}`);

    return this.api.get<GetReportedContentsResponse>(`${this.base}?${parts.join('&')}`);
  }

  // Merged endpoint: GET /api/admin/reports/history/{contentId}?contentType=blog|comment
  getReportHistory(
    contentId: string,
    contentType: 'blog' | 'comment'
  ): Observable<GetReportHistoryResponse> {
    return this.api.get<GetReportHistoryResponse>(
      `${this.base}/history/${contentId}?contentType=${contentType}`
    );
  }

  // All report history: GET /api/admin/reports/history?contentType=...&status=...&search=...&pageNumber=...&pageSize=...
  getAllReportHistory(params: {
    contentType?: 'blog' | 'comment';
    status?: ReportStatus;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<GetAllReportHistoryResponse> {
    const parts: string[] = [];
    if (params.contentType) parts.push(`contentType=${params.contentType}`);
    if (params.status != null) parts.push(`status=${params.status}`);
    if (params.search?.trim()) parts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.pageNumber != null) parts.push(`pageNumber=${params.pageNumber}`);
    if (params.pageSize != null) parts.push(`pageSize=${params.pageSize}`);

    const query = parts.length ? `?${parts.join('&')}` : '';
    return this.api.get<GetAllReportHistoryResponse>(`${this.base}/history${query}`);
  }

  updateReportStatus(
    contentId: string,
    contentType: 'blog' | 'comment',
    payload: UpdateReportStatusRequest,
    adminId?: string | null
  ): Observable<UpdateReportStatusResponse> {
    let url = `${this.base}/${contentId}/status?contentType=${contentType}`;
    if (adminId) url += `&adminId=${adminId}`;
    return this.api.put<UpdateReportStatusResponse>(url, payload);
  }
}
