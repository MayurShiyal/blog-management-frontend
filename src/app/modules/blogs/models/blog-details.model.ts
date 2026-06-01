import { BlogStatus } from '../../../common/enums/blog-status.enum';

export interface GetBlogByIdDto {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  content: string;
  thumbnailUrl?: string | null;
  status: BlogStatus;
  rejectionReason?: string | null;
  categoryIds?: string[] | null;
  categoryNames?: string[] | null;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

export interface GetBlogByIdResponse {
  status: boolean;
  message: string;
  data?: GetBlogByIdDto | null;
}
