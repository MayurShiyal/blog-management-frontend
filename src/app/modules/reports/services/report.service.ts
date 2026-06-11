import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import { CreateReportRequest, CreateReportResponse } from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);
  private readonly base = '/api/reports';

  createReport(payload: CreateReportRequest): Observable<CreateReportResponse> {
    return this.api.post<CreateReportResponse>(`${this.base}/`, payload);
  }
}
