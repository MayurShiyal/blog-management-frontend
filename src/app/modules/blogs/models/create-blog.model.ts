import { BlogStatusEnum } from '../../../common/enums/blog-status.enum';
import { BlogListItemDto } from './blog-list.model';

export interface CreateBlogRequest {
  title: string;
  slug: string;
  shortDescription?: string | null;
  content: string;
  thumbnailUrl?: string | null;
  categoryIds: number[];
  status: BlogStatusEnum;
}

export interface CreateBlogResponse {
  status: boolean;
  message: string;
  data?: BlogListItemDto | null;
}
