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
