import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import { GetCommentsResponse } from '../models/comment.models';

export interface AdminCommentHistoryItem {
  commentId: string;
  blogId: string;
  blogTitle: string;
  userId: string;
  userName: string;
  content: string;
  parentCommentId: string | null;
  isHidden: boolean;
  isReported: boolean;
  reportCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface GetCommentHistoryResponse {
  status: boolean;
  message: string;
  items: AdminCommentHistoryItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class AdminCommentService {
  private readonly api = inject(ApiService);
  private readonly blogsBase = '/api/blogs';
  private readonly adminBlogsBase = '/api/admin/blogs';
  private readonly adminCommentsBase = '/api/admin/comments';

  getCommentsByBlog(
    blogId: string,
    pageNumber = 1,
    pageSize = 20
  ): Observable<GetCommentsResponse> {
    return this.api.get<GetCommentsResponse>(
      `${this.blogsBase}/${blogId}/comments?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getAdminCommentsByBlog(
    blogId: string,
    pageNumber = 1,
    pageSize = 20
  ): Observable<GetCommentsResponse> {
    return this.api.get<GetCommentsResponse>(
      `${this.adminBlogsBase}/${blogId}/comments?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  getCommentHistory(params: {
    isReported?: boolean;
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<GetCommentHistoryResponse> {
    const parts: string[] = [];
    if (params.isReported != null) parts.push(`isReported=${params.isReported}`);
    if (params.search?.trim()) parts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.pageNumber != null) parts.push(`pageNumber=${params.pageNumber}`);
    if (params.pageSize != null) parts.push(`pageSize=${params.pageSize}`);
    const query = parts.length ? `?${parts.join('&')}` : '';
    return this.api.get<GetCommentHistoryResponse>(`${this.adminCommentsBase}/history${query}`);
  }
}
