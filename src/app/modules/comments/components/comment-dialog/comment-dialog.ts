import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { CommentService } from '../../services/comment.service';
import { PublicBlogService } from '../../../public/services/public-blog.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { ToastService } from '../../../../common/services/toast.service';
import { LoadingComponent } from '../../../../common/components/loading/loading';
import { EmptyStateComponent } from '../../../../common/components/empty-state/empty-state';
import { ReportModalComponent } from '../../../reports/components/report-modal/report-modal';
import { CommentDto } from '../../models/comment.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-comment-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LoadingComponent,
    EmptyStateComponent,
    ReportModalComponent,
  ],
  templateUrl: './comment-dialog.html',
  styleUrl: './comment-dialog.scss',
})
export class CommentDialogComponent implements OnInit, OnDestroy {
  @Input() blogId!: string;
  @Input() blogTitle: string = '';
  @Input() initialCommentLikedMap: Record<string, boolean> = {};
  @Input() initialCommentReactionCountMap: Record<string, number> = {};
  @Output() close = new EventEmitter<void>();
  @Output() commentCountChanged = new EventEmitter<number>();
  @Output() commentLikeStateChanged = new EventEmitter<{
    likedMap: Record<string, boolean>;
    countMap: Record<string, number>;
  }>();

  private readonly commentSvc = inject(CommentService);
  private readonly publicBlogSvc = inject(PublicBlogService);
  private readonly authState = inject(AuthStateService);
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

  commentsLimit = signal<number>(3);
  expandedReplies = signal<Record<string, { visible: boolean; limit: number }>>({});

  visibleComments = computed(() => {
    return this.comments().slice(0, this.commentsLimit());
  });

  commentForm = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]],
  });
  commentSubmitting = signal(false);
  paginationLoading = signal(false);
  replyOpenFor = signal<string | null>(null);
  replyForms: Record<string, ReturnType<typeof this.fb.group>> = {};
  replySubmitting = signal(false);

  commentLikeLoading = signal<Record<string, boolean>>({});
  commentLikedMap = signal<Record<string, boolean>>({});
  commentReactionCountMap = signal<Record<string, number>>({});

  reportModalOpen = signal(false);
  reportTargetId = signal<string | null>(null);
  reportTargetPreview = signal('');

  readonly isLoggedIn = toSignal(this.authState.isLoggedIn$, {
    initialValue: this.authState.isLoggedIn,
  });

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
    if (Object.keys(this.initialCommentLikedMap).length > 0) {
      this.commentLikedMap.set({ ...this.initialCommentLikedMap });
    }
    if (Object.keys(this.initialCommentReactionCountMap).length > 0) {
      this.commentReactionCountMap.set({ ...this.initialCommentReactionCountMap });
    }
    this.loadComments(true);
  }

  ngOnDestroy(): void {
    this.commentLikeStateChanged.emit({
      likedMap: this.commentLikedMap(),
      countMap: this.commentReactionCountMap(),
    });
    this.destroy$.next();
    this.destroy$.complete();
  }

  showMoreComments(): void {
    const proposedLimit = this.commentsLimit() + 10;
    this.commentsLimit.set(proposedLimit);

    if (proposedLimit >= this.comments().length && !this.allLoaded()) {
      this.loadMoreComments();
    }
  }

  toggleRepliesVisibility(commentId: string): void {
    this.expandedReplies.update((state) => {
      const current = state[commentId];
      return {
        ...state,
        [commentId]: {
          visible: current ? !current.visible : true,
          limit: current ? current.limit : 3,
        },
      };
    });
  }

  showMoreReplies(commentId: string, maxCount: number): void {
    this.expandedReplies.update((state) => ({
      ...state,
      [commentId]: {
        visible: true,
        limit: maxCount,
      },
    }));
  }

  getReplyState(commentId: string) {
    return this.expandedReplies()[commentId] || { visible: false, limit: 3 };
  }

  getVisibleReplies(comment: CommentDto): any[] {
    const state = this.getReplyState(comment.id);
    const repliesArray = comment.replies ?? [];
    return repliesArray.slice(0, state.limit);
  }

  loadComments(reset = false): void {
    if (this.loading()) return;
    if (!reset && this.allLoaded()) return;

    if (reset) {
      this.pageNumber.set(1);
      this.comments.set([]);
      this.allLoaded.set(false);
      this.commentsLimit.set(3);
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
            const sortedIncoming = [...incoming].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            if (reset || this.pageNumber() === 1) {
              this.comments.set(sortedIncoming);
              const likedMap: Record<string, boolean> = {};
              const countMap: Record<string, number> = {};
              sortedIncoming.forEach((c) => {
                likedMap[c.id] = c.isLikedByCurrentUser ?? false;
                countMap[c.id] = c.totalReactions ?? 0;
              });
              this.commentLikedMap.set(likedMap);
              this.commentReactionCountMap.set(countMap);
            } else {
              this.comments.update((existing) => [...existing, ...sortedIncoming]);
              const newLiked: Record<string, boolean> = {};
              const newCounts: Record<string, number> = {};
              sortedIncoming.forEach((c) => {
                newLiked[c.id] = c.isLikedByCurrentUser ?? false;
                newCounts[c.id] = c.totalReactions ?? 0;
              });
              this.commentLikedMap.update((m) => ({ ...m, ...newLiked }));
              this.commentReactionCountMap.update((m) => ({ ...m, ...newCounts }));
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
    if (this.allLoaded() || this.loading() || this.paginationLoading()) {
      return;
    }

    this.paginationLoading.set(true);

    this.pageNumber.update((p) => p + 1);

    this.commentSvc
      .getComments(this.blogId, this.pageNumber(), 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.paginationLoading.set(false);

          if (res.status) {
            const incoming = res.items ?? [];

            const sortedIncoming = [...incoming].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            this.comments.update((existing) => [...existing, ...sortedIncoming]);

            this.totalCount.set(res.totalCount ?? 0);

            const loaded = this.comments().length;

            this.allLoaded.set(loaded >= (res.totalCount ?? 0));
          }
        },
        error: () => {
          this.paginationLoading.set(false);
        },
      });
  }

  submitComment(): void {
    if (!this.isLoggedIn()) {
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
    if (!this.isLoggedIn()) {
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
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      this.close.emit();
      return;
    }

    const current = this.commentLikeLoading();
    if (current[commentId]) return;

    const prevLiked = !!this.commentLikedMap()[commentId];
    const prevCount = this.commentReactionCountMap()[commentId] ?? 0;

    this.commentLikedMap.update((m) => ({ ...m, [commentId]: !prevLiked }));
    this.commentReactionCountMap.update((m) => ({
      ...m,
      [commentId]: prevLiked ? prevCount - 1 : prevCount + 1,
    }));
    this.commentLikeLoading.update((s) => ({ ...s, [commentId]: true }));

    this.publicBlogSvc
      .reactToComment(commentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.commentLikeLoading.update((s) => ({ ...s, [commentId]: false }));
          if (!res.status) {
            this.commentLikedMap.update((m) => ({ ...m, [commentId]: prevLiked }));
            this.commentReactionCountMap.update((m) => ({ ...m, [commentId]: prevCount }));
            this.toast.show('danger', res.message || 'Failed to toggle reaction.');
          } else if (res.data) {
            this.commentLikedMap.update((m) => ({ ...m, [commentId]: res.data!.isActive }));
          }
        },
        error: (err) => {
          this.commentLikeLoading.update((s) => ({ ...s, [commentId]: false }));
          this.commentLikedMap.update((m) => ({ ...m, [commentId]: prevLiked }));
          this.commentReactionCountMap.update((m) => ({ ...m, [commentId]: prevCount }));
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  isCommentLiked(commentId: string): boolean {
    return !!this.commentLikedMap()[commentId];
  }

  getCommentReactionCount(commentId: string): number {
    return this.commentReactionCountMap()[commentId] ?? 0;
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

  openCommentReport(commentId: string, content: string, commentUserId: string): void {
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      this.close.emit();
      return;
    }
    const currentUser = this.authState.currentUser;
    if (currentUser && currentUser.id === commentUserId) {
      this.toast.show('warning', 'You cannot report your own comment.');
      return;
    }
    const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
    this.reportTargetId.set(commentId);
    this.reportTargetPreview.set(preview);
    this.reportModalOpen.set(true);
  }

  closeCommentReport(): void {
    this.reportModalOpen.set(false);
    this.reportTargetId.set(null);
    this.reportTargetPreview.set('');
  }

  onCommentReported(): void {
    this.closeCommentReport();

    this.loadComments(true);
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
