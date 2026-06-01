import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  GetPublicBlogsResponse,
  GetPublicBlogByIdResponse,
} from '../models/public-blog.models';
import { ReactToBlogResponse, ReactToCommentResponse } from '../models/reaction.models';

@Injectable({ providedIn: 'root' })
export class PublicBlogService {
  private readonly api = inject(ApiService);
  private readonly base = '/api/blogs';
  private readonly reactionsBase = '/api/reactions';

  getPublicBlogs(params: {
    search?: string;
    categoryIds?: string[];
    pageNumber?: number;
    pageSize?: number;
  } = {}): Observable<GetPublicBlogsResponse> {
    const queryParts: string[] = [];

    if (params.search && params.search.trim()) {
      queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    }
    // Backend supports single categoryId — send first selected or none
    if (params.categoryIds && params.categoryIds.length === 1) {
      queryParts.push(`categoryId=${encodeURIComponent(params.categoryIds[0])}`);
    }
    if (params.pageNumber !== undefined) {
      queryParts.push(`pageNumber=${params.pageNumber}`);
    }
    if (params.pageSize !== undefined) {
      queryParts.push(`pageSize=${params.pageSize}`);
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.api.get<GetPublicBlogsResponse>(`${this.base}/public${queryString}`);
  }

  getPublicBlogById(id: string): Observable<GetPublicBlogByIdResponse> {
    return this.api.get<GetPublicBlogByIdResponse>(`${this.base}/${id}`);
  }

  reactToBlog(blogId: string): Observable<ReactToBlogResponse> {
    return this.api.post<ReactToBlogResponse>(`${this.reactionsBase}/blog/${blogId}`, {});
  }

  reactToComment(commentId: string): Observable<ReactToCommentResponse> {
    return this.api.post<ReactToCommentResponse>(`${this.reactionsBase}/comment/${commentId}`, {});
  }
}
