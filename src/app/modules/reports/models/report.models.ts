import { ReportStatus, ReportType } from '../../../common/enums';

export { ReportStatus, REPORT_STATUS_LABELS, ReportType, REPORT_TYPE_LABELS } from '../../../common/enums';

export interface CreateReportRequest {
  blogId?: string | null;
  commentId?: string | null;
  type: ReportType;
  reason?: string | null;
}

export interface CreateReportDto {
  id: string;
  blogId?: string | null;
  commentId?: string | null;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface CreateReportResponse {
  status: boolean;
  message: string;
  data?: CreateReportDto | null;
}

export interface ReportedContentItemDto {
  contentId: string;
  contentPreview: string;
  authorName: string;
  reportCount: number;
  latestStatus: ReportStatus;
  lastReportedAt: string;

  blogId?: string | null;
  blogTitle?: string | null;
}

export interface GetReportedContentsResponse {
  status: boolean;
  message: string;
  items: ReportedContentItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface ReportHistoryItemDto {
  reportId: string;
  reporterName: string;
  reason: string;
  status: ReportStatus;
  reportDate: string;
}

export interface GetReportHistoryResponse {
  status: boolean;
  message: string;
  items: ReportHistoryItemDto[];
}

export interface UpdateReportStatusRequest {
  status: ReportStatus;
}

export interface UpdateReportStatusResponse {
  status: boolean;
  message: string;
}
