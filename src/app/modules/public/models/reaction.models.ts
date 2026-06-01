export interface BlogReactionDto {
  id: string;
  blogId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ReactToBlogResponse {
  status: boolean;
  message: string;
  data?: BlogReactionDto | null;
}

export interface CommentReactionDto {
  id: string;
  commentId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ReactToCommentResponse {
  status: boolean;
  message: string;
  data?: CommentReactionDto | null;
}
