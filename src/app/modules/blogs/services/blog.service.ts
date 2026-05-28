import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  GetBlogsResponse,
  GetBlogByIdResponse,
  CreateBlogRequest,
  CreateBlogResponse,
  UpdateBlogRequest,
  UpdateBlogResponse,
  UpdateBlogStatusRequest,
  UpdateBlogStatusResponse,
  DeleteBlogResponse,
} from '../models/blog.models';

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly api = inject(ApiService);
  private readonly base = '/api/blogs';

  getBlogs(
    params: {
      slug?: string;
      status?: string;
      search?: string;
      mine?: boolean;
      pageNumber?: number;
      pageSize?: number;
      sortBy?: string;
      sortDesc?: boolean;
      categoryId?: number;
      authorId?: string;
    } = {}
  ): Observable<GetBlogsResponse> {
    const queryParts: string[] = [];

    if (params.slug !== undefined && params.slug !== null && params.slug.trim() !== '') {
      queryParts.push(`slug=${encodeURIComponent(params.slug.trim())}`);
    }
    if (params.status !== undefined && params.status !== null && params.status !== '') {
      queryParts.push(`status=${encodeURIComponent(params.status)}`);
    }
    if (params.search !== undefined && params.search !== null && params.search.trim() !== '') {
      queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    if (params.mine !== undefined && params.mine !== null) {
      queryParts.push(`mine=${params.mine}`);
    }
    if (params.pageNumber !== undefined && params.pageNumber !== null) {
      queryParts.push(`pageNumber=${params.pageNumber}`);
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
      queryParts.push(`pageSize=${params.pageSize}`);
    }
    if (params.sortBy !== undefined && params.sortBy !== null && params.sortBy.trim() !== '') {
      queryParts.push(`sortBy=${encodeURIComponent(params.sortBy.trim())}`);
    }
    if (params.sortDesc !== undefined && params.sortDesc !== null) {
      queryParts.push(`sortDesc=${params.sortDesc}`);
    }
    if (params.categoryId !== undefined && params.categoryId !== null) {
      queryParts.push(`categoryId=${params.categoryId}`);
    }
    if (
      params.authorId !== undefined &&
      params.authorId !== null &&
      params.authorId.trim() !== ''
    ) {
      queryParts.push(`authorId=${encodeURIComponent(params.authorId.trim())}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.api.get<GetBlogsResponse>(`${this.base}${queryString}`);
  }

  getById(id: string): Observable<GetBlogByIdResponse> {
    return this.api.get<GetBlogByIdResponse>(`${this.base}/${id}`);
  }

  create(payload: CreateBlogRequest & { saveAsDraft?: boolean }): Observable<CreateBlogResponse> {
    return this.api.post<CreateBlogResponse>(this.base, payload);
  }

  update(
    id: string,
    payload: UpdateBlogRequest & { saveAsDraft?: boolean }
  ): Observable<UpdateBlogResponse> {
    return this.api.put<UpdateBlogResponse>(`${this.base}/${id}`, payload);
  }

  updateStatus(id: string, payload: UpdateBlogStatusRequest): Observable<UpdateBlogStatusResponse> {
    return this.api.patch<UpdateBlogStatusResponse>(`${this.base}/${id}/status`, payload);
  }

  delete(id: string): Observable<DeleteBlogResponse> {
    return this.api.delete<DeleteBlogResponse>(`${this.base}/${id}`);
  }
}
