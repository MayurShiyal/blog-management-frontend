export interface PublicBlogListItemDto {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  content: string;
  thumbnailUrl?: string | null;
  categoryIds: string[];
  categoryNames: string[];
  authorId: string;
  authorName?: string | null;
  publishedAt?: string | null;
  totalComments: number;
  totalReactions: number;
}

export interface GetPublicBlogsResponse {
  status: boolean;
  message: string;
  items: PublicBlogListItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface PublicBlogDetailDto {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  content: string;
  thumbnailUrl?: string | null;
  categoryIds: string[];
  categoryNames: string[];
  authorId: string;
  authorName?: string | null;
  publishedAt?: string | null;
  totalComments: number;
  totalReactions: number;
}

export interface GetPublicBlogByIdResponse {
  status: boolean;
  message: string;
  data?: PublicBlogDetailDto | null;
}
