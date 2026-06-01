export interface CommentReplyDto {
  id: string;
  blogId: string;
  userId: string;
  userName: string;
  content: string;
  parentCommentId: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CommentDto {
  id: string;
  blogId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  replies: CommentReplyDto[];
}

export interface GetCommentsResponse {
  status: boolean;
  message: string;
  items: CommentDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface AddCommentRequest {
  blogId: string;
  content: string;
}

export interface AddCommentResponse {
  status: boolean;
  message: string;
  data?: CommentDto | null;
}

export interface AddReplyRequest {
  blogId: string;
  parentCommentId: string;
  content: string;
}

export interface AddReplyResponse {
  status: boolean;
  message: string;
  data?: CommentReplyDto | null;
}
