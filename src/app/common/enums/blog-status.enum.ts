export enum BlogStatusEnum {
  Draft = 0,
  PendingApproval = 1,
  Published = 2,
  Rejected = 3
}

export type BlogStatus = 'Draft' | 'PendingApproval' | 'Published' | 'Rejected';
