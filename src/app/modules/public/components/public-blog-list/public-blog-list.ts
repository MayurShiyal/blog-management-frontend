import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { PublicBlogService } from '../../services/public-blog.service';
import { CategoryService } from '../../../categories/services/category.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { ToastService } from '../../../../common/services/toast.service';
import { CommentDialogComponent } from '../../../comments/components/comment-dialog/comment-dialog';
import { ReportModalComponent } from '../../../reports/components/report-modal/report-modal';
import { PublicBlogListItemDto } from '../../models/public-blog.models';
import { CategoryDto } from '../../../categories/models/category.models';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { extractApiErrorMessage } from '../../../../common/utils/error.utils';

@Component({
  selector: 'app-public-blog-list',
  imports: [CommonModule, FormsModule, CommentDialogComponent, ReportModalComponent],
  templateUrl: './public-blog-list.html',
  styleUrl: './public-blog-list.scss',
})
export class PublicBlogList implements OnInit, OnDestroy {
  private readonly publicBlogSvc = inject(PublicBlogService);
  private readonly catSvc = inject(CategoryService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  blogs = signal<PublicBlogListItemDto[]>([]);
  totalCount = signal(0);
  loading = signal(false);
  initialLoading = signal(true);

  categories = signal<CategoryDto[]>([]);

  selectedCategoryId = signal<string | null>(null);
  categoryDropdownOpen = signal(false);

  searchQuery = signal<string>('');
  private readonly searchSubject$ = new Subject<string>();

  blogLikedMap = signal<Record<string, boolean>>({});
  blogLikeLoadingMap = signal<Record<string, boolean>>({});
  blogReactionCountMap = signal<Record<string, number>>({});

  commentDialogBlogId = signal<string | null>(null);
  commentDialogBlogTitle = signal<string>('');

  reportDialogBlogId = signal<string | null>(null);
  reportDialogBlogTitle = signal<string>('');

  private commentLikedMapCache: Record<string, Record<string, boolean>> = {};
  private commentCountMapCache: Record<string, Record<string, number>> = {};

  get dialogCommentLikedMap(): Record<string, boolean> {
    const id = this.commentDialogBlogId();
    return id ? this.commentLikedMapCache[id] ?? {} : {};
  }

  get dialogCommentCountMap(): Record<string, number> {
    const id = this.commentDialogBlogId();
    return id ? this.commentCountMapCache[id] ?? {} : {};
  }

  onCommentLikeStateChanged(event: {
    likedMap: Record<string, boolean>;
    countMap: Record<string, number>;
  }): void {
    const id = this.commentDialogBlogId();
    if (!id) return;
    this.commentLikedMapCache[id] = event.likedMap;
    this.commentCountMapCache[id] = event.countMap;
  }

  isLoggedIn = toSignal(this.authState.isLoggedIn$, { initialValue: this.authState.isLoggedIn });

  selectedCategoryLabel = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return 'All Topics';
    const cat = this.categories().find((c) => c.id === id);
    return cat?.name ?? 'All Topics';
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadBlogs();

    this.searchSubject$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.resetAndLoad());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.catSvc
      .getAll(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.categories.set((res.items ?? []).filter((c) => c.isActive));
          }
        },
        error: () => {},
      });
  }

  loadBlogs(): void {
    if (this.loading()) return;
    this.loading.set(true);

    const catId = this.selectedCategoryId();
    const query = this.searchQuery().trim();

    this.publicBlogSvc
      .getPublicBlogs({
        search: query || undefined,
        categoryIds: catId ? [catId] : undefined,
        pageNumber: 1,
        pageSize: 1000,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.initialLoading.set(false);
          if (res.status) {
            const items = res.items ?? [];
            this.blogs.set(items);

            const countMap: Record<string, number> = {};
            const likedMap: Record<string, boolean> = {};
            items.forEach((b) => {
              countMap[b.id] = b.totalReactions;
              likedMap[b.id] = b.isLiked;
            });
            this.blogReactionCountMap.set(countMap);
            this.blogLikedMap.set(likedMap);

            this.totalCount.set(res.totalCount ?? 0);
          } else {
            this.toast.show('danger', res.message || 'Failed to load blogs.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.initialLoading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  resetAndLoad(): void {
    this.blogs.set([]);
    this.totalCount.set(0);
    this.initialLoading.set(true);
    this.loadBlogs();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject$.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject$.next('');
  }

  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update((v) => !v);
  }

  selectCategory(catId: string | null): void {
    this.selectedCategoryId.set(catId);
    this.categoryDropdownOpen.set(false);
    this.resetAndLoad();
  }

  clearCategory(): void {
    this.selectedCategoryId.set(null);
    this.categoryDropdownOpen.set(false);
    this.resetAndLoad();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-filter-wrap')) {
      this.categoryDropdownOpen.set(false);
    }
  }

  toggleBlogLike(blog: PublicBlogListItemDto, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (this.blogLikeLoadingMap()[blog.id]) return;

    const prevLiked = !!this.blogLikedMap()[blog.id];
    const prevCount = this.blogReactionCountMap()[blog.id] ?? blog.totalReactions;

    this.blogLikedMap.update((m) => ({ ...m, [blog.id]: !prevLiked }));
    this.blogReactionCountMap.update((m) => ({
      ...m,
      [blog.id]: prevLiked ? prevCount - 1 : prevCount + 1,
    }));
    this.blogLikeLoadingMap.update((m) => ({ ...m, [blog.id]: true }));

    this.publicBlogSvc
      .reactToBlog(blog.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.blogLikeLoadingMap.update((m) => ({ ...m, [blog.id]: false }));
          if (!res.status) {
            this.blogLikedMap.update((m) => ({ ...m, [blog.id]: prevLiked }));
            this.blogReactionCountMap.update((m) => ({ ...m, [blog.id]: prevCount }));
            this.toast.show('danger', res.message || 'Failed to toggle reaction.');
          } else if (res.data) {
            this.blogLikedMap.update((m) => ({ ...m, [blog.id]: res.data!.isActive }));
          }
        },
        error: (err) => {
          this.blogLikeLoadingMap.update((m) => ({ ...m, [blog.id]: false }));
          this.blogLikedMap.update((m) => ({ ...m, [blog.id]: prevLiked }));
          this.blogReactionCountMap.update((m) => ({ ...m, [blog.id]: prevCount }));
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

  isLiked(blogId: string): boolean {
    return !!this.blogLikedMap()[blogId];
  }

  isLikeLoading(blogId: string): boolean {
    return !!this.blogLikeLoadingMap()[blogId];
  }

  getReactionCount(blog: PublicBlogListItemDto): number {
    const val = this.blogReactionCountMap()[blog.id];
    return val !== undefined ? val : blog.totalReactions;
  }

  navigateToBlog(blog: PublicBlogListItemDto, event: MouseEvent): void {
    event.preventDefault();
    this.router.navigate([this.routes.PUBLIC.BLOG_DETAIL.ABSOLUTE(blog.id)], {
      state: { isLiked: this.blogLikedMap()[blog.id] ?? blog.isLiked },
    });
  }

  openCommentDialog(blog: PublicBlogListItemDto, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.commentDialogBlogId.set(blog.id);
    this.commentDialogBlogTitle.set(blog.title);
  }

  closeCommentDialog(): void {
    this.commentDialogBlogId.set(null);
  }

  onCommentCountChanged(newCount: number): void {
    const activeId = this.commentDialogBlogId();
    if (!activeId) return;

    this.blogs.update((list) =>
      list.map((b) => (b.id === activeId ? { ...b, totalComments: newCount } : b))
    );
  }

  openReportModal(blog: PublicBlogListItemDto, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.reportDialogBlogId.set(blog.id);
    this.reportDialogBlogTitle.set(blog.title);
  }

  closeReportModal(): void {
    this.reportDialogBlogId.set(null);
  }

  onBlogReported(): void {
    const activeId = this.reportDialogBlogId();
    if (activeId) {
      this.blogs.update((list) => list.filter((b) => b.id !== activeId));
      this.totalCount.update((count) => Math.max(0, count - 1));
      this.toast.show('success', 'Blog content has been reported.');
    }
    this.reportDialogBlogId.set(null);
  }

  getExcerpt(blog: PublicBlogListItemDto): string {
    if (blog.shortDescription) return blog.shortDescription;
    const plain = blog.content.replace(/<[^>]*>/g, '');
    return plain.length > 160 ? plain.substring(0, 160) + '...' : plain;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
