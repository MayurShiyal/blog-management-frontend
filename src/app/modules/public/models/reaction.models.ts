// Matches backend ReactDto exactly
export interface ReactDto {
  id: string;
  blogId?: string | null;
  commentId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ReactResponse {
  status: boolean;
  message: string;
  data?: ReactDto | null;
}

export type ReactToBlogResponse = ReactResponse;
export type ReactToCommentResponse = ReactResponse;
export interface BlogReactionDto {
  id: string;
  blogId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CommentReactionDto {
  id: string;
  commentId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}