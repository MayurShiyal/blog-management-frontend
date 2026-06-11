import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { PublicBlogService } from '../../services/public-blog.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { ToastService } from '../../../../common/services/toast.service';
import { CommentDialogComponent } from '../../../comments/components/comment-dialog/comment-dialog';
import { ReportModalComponent } from '../../../reports/components/report-modal/report-modal';
import { PublicBlogDetailDto } from '../../models/public-blog.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-public-blog-detail',
  imports: [CommonModule, RouterLink, CommentDialogComponent, ReportModalComponent],
  templateUrl: './public-blog-detail.html',
  styleUrl: './public-blog-detail.scss',
})
export class PublicBlogDetail implements OnInit, OnDestroy {
  private readonly publicBlogSvc = inject(PublicBlogService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  blog = signal<PublicBlogDetailDto | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  blogReactionCount = signal(0);
  blogLiked = signal(false);
  reactionLoading = signal(false);

  commentCount = signal(0);

  commentDialogOpen = signal(false);

  reportModalOpen = signal(false);

  commentLikedMapCache: Record<string, boolean> = {};
  commentCountMapCache: Record<string, number> = {};

  onCommentLikeStateChanged(event: {
    likedMap: Record<string, boolean>;
    countMap: Record<string, number>;
  }): void {
    this.commentLikedMapCache = event.likedMap;
    this.commentCountMapCache = event.countMap;
  }

  isLoggedIn = toSignal(this.authState.isLoggedIn$, { initialValue: this.authState.isLoggedIn });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMsg.set('Blog ID is missing.');
      this.loading.set(false);
      return;
    }

    const navState = history.state as { isLiked?: boolean };
    if (typeof navState?.isLiked === 'boolean') {
      this.blogLiked.set(navState.isLiked);
    }

    this.loadBlog(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBlog(id: string): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.publicBlogSvc
      .getPublicBlogById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status && res.data) {
            this.blog.set(res.data);
            this.blogReactionCount.set(res.data.totalReactions);
            this.commentCount.set(res.data.totalComments);
            this.blogLiked.set(res.data.isLiked ?? false);
          } else {
            this.errorMsg.set(res.message || 'Failed to load blog.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set(this.extractError(err));
        },
      });
  }

  getSafeContent(content: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content ?? '');
  }

  toggleBlogReaction(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    const blog = this.blog();
    if (!blog || this.reactionLoading()) return;

    const prevLiked = this.blogLiked();
    const prevCount = this.blogReactionCount();
    this.blogLiked.set(!prevLiked);
    this.blogReactionCount.update((c) => (prevLiked ? c - 1 : c + 1));

    this.reactionLoading.set(true);
    this.publicBlogSvc
      .reactToBlog(blog.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.reactionLoading.set(false);
          if (!res.status) {
            this.blogLiked.set(prevLiked);
            this.blogReactionCount.set(prevCount);
            this.toast.show('danger', res.message || 'Failed to toggle reaction.');
          } else if (res.data) {
            this.blogLiked.set(res.data.isActive);
          }
        },
        error: (err) => {
          this.reactionLoading.set(false);
          this.blogLiked.set(prevLiked);
          this.blogReactionCount.set(prevCount);

          const httpErr = err as { status?: number };
          if (httpErr?.status === 401) {
            this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
              queryParams: { returnUrl: this.router.url },
            });
          } else {
            this.toast.show('danger', this.extractError(err));
          }
        },
      });
  }

  openCommentDialog(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    this.commentDialogOpen.set(true);
  }

  closeCommentDialog(): void {
    this.commentDialogOpen.set(false);
  }

  isOwnBlog(): boolean {
    const user = this.authState.currentUser;
    const b = this.blog();
    if (!user || !b) return false;
    return b.createdBy === user.id;
  }

  openReportModal(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }
    if (this.isOwnBlog()) {
      this.toast.show('warning', 'You cannot report your own blog.');
      return;
    }
    this.reportModalOpen.set(true);
  }

  closeReportModal(): void {
    this.reportModalOpen.set(false);
  }

  onBlogReported(): void {
    this.reportModalOpen.set(false);
    // Blog is hidden for the current user — navigate back to listing
    this.router.navigate([ROUTES.PUBLIC.BLOGS.ABSOLUTE]);
  }

  onCommentCountChanged(count: number): void {
    this.commentCount.set(count);
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string }; status?: number };
    if (e?.status === 404) return 'This article was not found or has been removed.';
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
