export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
}

export interface UpdateCategoryRequest {
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CategoryResponse {
  status: boolean;
  message: string;
  data?: CategoryDto | null;
}

export interface PagedCategoryResponse {
  status: boolean;
  message: string;
  items: CategoryDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  activeCount: number;
  inactiveCount: number;
}
