import { BlogStatusEnum } from '../../../common/enums/blog-status.enum';
import { BlogListItemDto } from './blog-list.model';

export interface UpdateBlogRequest {
  title?: string | null;
  slug?: string | null;
  shortDescription?: string | null;
  content?: string | null;
  thumbnailUrl?: string | null;
  categoryId?: number | null;
  categoryIds?: number[] | null;
  status?: BlogStatusEnum | null;
}

export interface UpdateBlogResponse {
  status: boolean;
  message: string;
  data?: BlogListItemDto | null;
}

export interface UpdateBlogStatusRequest {
  status: BlogStatusEnum;
  rejectionReason?: string | null;
}

export interface UpdateBlogStatusResponse {
  status: boolean;
  message: string;
  data?: {
    id: string;
    title: string;
    status: string;
    rejectionReason?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
  } | null;
}
