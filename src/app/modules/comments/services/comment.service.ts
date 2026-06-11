import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  GetCommentsResponse,
  AddCommentRequest,
  AddCommentResponse,
  AddReplyRequest,
  AddReplyResponse,
} from '../models/comment.models';
import {
  GetCommentHistoryResponse,
} from '../models/admin-comment.models';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly api = inject(ApiService);
  private readonly blogsBase = '/api/blogs';
  private readonly commentsBase = '/api/comments';
  private readonly adminBlogsBase = '/api/admin/blogs';
  private readonly adminCommentsBase = '/api/admin/comments';

  // ── Public / Visitor ─────────────────────────────────────────────────────

  getComments(blogId: string, pageNumber = 1, pageSize = 10): Observable<GetCommentsResponse> {
    return this.api.get<GetCommentsResponse>(
      `${this.blogsBase}/${blogId}/comments?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
  }

  addComment(payload: AddCommentRequest): Observable<AddCommentResponse> {
    return this.api.post<AddCommentResponse>(`${this.commentsBase}/`, payload);
  }

  addReply(payload: AddReplyRequest): Observable<AddReplyResponse> {
    return this.api.post<AddReplyResponse>(`${this.commentsBase}/`, {
      blogId: payload.blogId,
      content: payload.content,
      parentCommentId: payload.parentCommentId,
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

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
