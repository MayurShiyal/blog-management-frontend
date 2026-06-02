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

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly api = inject(ApiService);
  private readonly blogsBase = '/api/blogs';
  private readonly commentsBase = '/api/comments';

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
}
