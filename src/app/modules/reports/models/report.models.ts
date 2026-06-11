// ── Enums ────────────────────────────────────────────────────────────────────

export enum ReportStatus {
  Open = 1,
  UnderReview = 2,
  Approved = 3,
  Rejected = 4,
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.Open]: 'Open',
  [ReportStatus.UnderReview]: 'Under Review',
  [ReportStatus.Approved]: 'Approved',
  [ReportStatus.Rejected]: 'Rejected',
};

export enum ReportType {
  Spam = 1,
  InappropriateContent = 2,
  Harassment = 3,
  Other = 4,
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  [ReportType.Spam]: 'Spam',
  [ReportType.InappropriateContent]: 'Inappropriate Content',
  [ReportType.Harassment]: 'Harassment',
  [ReportType.Other]: 'Other',
};

// ── User-facing: Create Report ───────────────────────────────────────────────

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

// ── Admin: Reported Content List ─────────────────────────────────────────────

export interface ReportedContentItemDto {
  contentId: string;
  contentPreview: string;
  authorName: string;
  reportCount: number;
  latestStatus: ReportStatus;
  lastReportedAt: string;
  /** Present when contentType is 'comment' — the blog this comment belongs to */
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

// ── Admin: Report History ────────────────────────────────────────────────────

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

// ── Admin: Update Report Status ──────────────────────────────────────────────

export interface UpdateReportStatusRequest {
  status: ReportStatus;
}

export interface UpdateReportStatusResponse {
  status: boolean;
  message: string;
}
