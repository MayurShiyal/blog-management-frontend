export interface AdminCommentHistoryItem {
  commentId: string;
  blogId: string;
  blogTitle: string;
  userId: string;
  userName: string;
  content: string;
  parentCommentId: string | null;
  isHidden: boolean;
  isReported: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface GetCommentHistoryResponse {
  status: boolean;
  message: string;
  items: AdminCommentHistoryItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
