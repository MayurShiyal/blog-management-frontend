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
