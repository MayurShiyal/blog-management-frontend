import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { PublicBlogService } from '../../services/public-blog.service';
import { StorageService } from '../../../../common/services/storage';
import { ToastService } from '../../../../common/services/toast.service';
import { LoadingComponent } from '../../../../common/components/loading/loading';
import { CommentDialogComponent } from '../../../comments/components/comment-dialog/comment-dialog';
import { PublicBlogDetailDto } from '../../models/public-blog.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-public-blog-detail',
  imports: [
    CommonModule,
    RouterLink,
    LoadingComponent,
    CommentDialogComponent,
  ],
  templateUrl: './public-blog-detail.html',
  styleUrl: './public-blog-detail.scss',
})
export class PublicBlogDetail implements OnInit, OnDestroy {
  private readonly publicBlogSvc = inject(PublicBlogService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  blog = signal<PublicBlogDetailDto | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  // Reaction state
  blogReactionCount = signal(0);
  blogLiked = signal(false);
  reactionLoading = signal(false);

  // Comment count
  commentCount = signal(0);

  // Comment dialog
  commentDialogOpen = signal(false);

  isLoggedIn = computed(() => this.storage.isLoggedIn());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMsg.set('Blog ID is missing.');
      this.loading.set(false);
      return;
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

  /** Sanitize HTML content for safe rendering */
  getSafeContent(content: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content ?? '');
  }

  toggleBlogReaction(): void {
    // Redirect to login if not authenticated — do not silently fail
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

          // Handle 401 Unauthorized — redirect to login
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
    // Redirect to login if not authenticated — do not silently fail
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
