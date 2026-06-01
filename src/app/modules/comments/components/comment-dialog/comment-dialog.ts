import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { CommentService } from '../../services/comment.service';
import { PublicBlogService } from '../../../public/services/public-blog.service';
import { StorageService } from '../../../../common/services/storage';
import { ToastService } from '../../../../common/services/toast.service';
import { LoadingComponent } from '../../../../common/components/loading/loading';
import { EmptyStateComponent } from '../../../../common/components/empty-state/empty-state';
import { CommentDto } from '../../models/comment.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-comment-dialog',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingComponent, EmptyStateComponent],
  templateUrl: './comment-dialog.html',
  styleUrl: './comment-dialog.scss',
})
export class CommentDialogComponent implements OnInit, OnDestroy {
  @Input() blogId!: string;
  @Input() blogTitle: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() commentCountChanged = new EventEmitter<number>();

  private readonly commentSvc = inject(CommentService);
  private readonly publicBlogSvc = inject(PublicBlogService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  comments = signal<CommentDto[]>([]);
  loading = signal(false);
  pageNumber = signal(1);
  totalCount = signal(0);
  allLoaded = signal(false);

  commentForm = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]],
  });
  commentSubmitting = signal(false);

  replyOpenFor = signal<string | null>(null);
  replyForms: Record<string, ReturnType<typeof this.fb.group>> = {};
  replySubmitting = signal(false);

  commentLikeLoading = signal<Record<string, boolean>>({});

  get isLoggedIn(): boolean {
    return this.storage.isLoggedIn();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  ngOnInit(): void {
    this.loadComments(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadComments(reset = false): void {
    if (this.loading()) return;
    if (!reset && this.allLoaded()) return;

    if (reset) {
      this.pageNumber.set(1);
      this.comments.set([]);
      this.allLoaded.set(false);
    }

    this.loading.set(true);
    this.commentSvc
      .getComments(this.blogId, this.pageNumber(), 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            const incoming = res.items ?? [];
            if (reset || this.pageNumber() === 1) {
              // Sort latest first
              this.comments.set([...incoming].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              ));
            } else {
              this.comments.update((existing) => [
                ...existing,
                ...[...incoming].sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ),
              ]);
            }
            this.totalCount.set(res.totalCount ?? 0);
            const loaded = this.comments().length;
            this.allLoaded.set(loaded >= (res.totalCount ?? 0));
            this.commentCountChanged.emit(res.totalCount ?? 0);
          } else {
            this.toast.show('danger', res.message || 'Failed to load comments.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  loadMoreComments(): void {
    if (this.allLoaded() || this.loading()) return;
    this.pageNumber.update((p) => p + 1);
    this.loadComments(false);
  }

  submitComment(): void {
    if (!this.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      this.close.emit();
      return;
    }

    this.commentForm.markAllAsTouched();
    if (this.commentForm.invalid) return;

    const content = this.commentForm.get('content')?.value?.trim();
    if (!content) return;

    this.commentSubmitting.set(true);
    this.commentSvc
      .addComment({ blogId: this.blogId, content })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.commentSubmitting.set(false);
          if (res.status) {
            this.commentForm.reset();
            this.toast.show('success', 'Comment added successfully.');
            this.loadComments(true);
          } else {
            this.toast.show('danger', res.message || 'Failed to add comment.');
          }
        },
        error: (err) => {
          this.commentSubmitting.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  openReply(commentId: string): void {
    if (!this.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      this.close.emit();
      return;
    }
    if (this.replyOpenFor() === commentId) {
      this.replyOpenFor.set(null);
      return;
    }
    this.replyOpenFor.set(commentId);
    if (!this.replyForms[commentId]) {
      this.replyForms[commentId] = this.fb.group({
        content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]],
      });
    }
  }

  cancelReply(): void {
    this.replyOpenFor.set(null);
  }

  submitReply(commentId: string): void {
    const form = this.replyForms[commentId];
    if (!form) return;

    form.markAllAsTouched();
    if (form.invalid) return;

    const content = form.get('content')?.value?.trim();
    if (!content) return;

    this.replySubmitting.set(true);
    this.commentSvc
      .addReply({ blogId: this.blogId, parentCommentId: commentId, content })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.replySubmitting.set(false);
          if (res.status) {
            form.reset();
            this.replyOpenFor.set(null);
            this.toast.show('success', 'Reply added successfully.');
            this.loadComments(true);
          } else {
            this.toast.show('danger', res.message || 'Failed to add reply.');
          }
        },
        error: (err) => {
          this.replySubmitting.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  toggleCommentLike(commentId: string): void {
    if (!this.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      this.close.emit();
      return;
    }

    const current = this.commentLikeLoading();
    if (current[commentId]) return;

    this.commentLikeLoading.update((s) => ({ ...s, [commentId]: true }));
    this.publicBlogSvc
      .reactToComment(commentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.commentLikeLoading.update((s) => ({ ...s, [commentId]: false }));
          if (!res.status) {
            this.toast.show('danger', res.message || 'Failed to toggle reaction.');
          }
        },
        error: (err) => {
          this.commentLikeLoading.update((s) => ({ ...s, [commentId]: false }));
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  isLikeLoading(commentId: string): boolean {
    return !!this.commentLikeLoading()[commentId];
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const threshold = 100;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      this.loadMoreComments();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('comment-dialog-backdrop')) {
      this.close.emit();
    }
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
