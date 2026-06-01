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
import { RouterLink, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { PublicBlogService } from '../../services/public-blog.service';
import { CategoryService } from '../../../categories/services/category.service';
import { StorageService } from '../../../../common/services/storage';
import { ToastService } from '../../../../common/services/toast.service';
import { EmptyStateComponent } from '../../../../common/components/empty-state/empty-state';
import { LoadingComponent } from '../../../../common/components/loading/loading';
import { CommentDialogComponent } from '../../../comments/components/comment-dialog/comment-dialog';
import { PublicBlogListItemDto } from '../../models/public-blog.models';
import { CategoryDto } from '../../../categories/models/category.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-public-blog-list',
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    EmptyStateComponent,
    LoadingComponent,
    CommentDialogComponent,
  ],
  templateUrl: './public-blog-list.html',
  styleUrl: './public-blog-list.scss',
})
export class PublicBlogList implements OnInit, OnDestroy {
  private readonly publicBlogSvc = inject(PublicBlogService);
  private readonly catSvc = inject(CategoryService);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;
  readonly PAGE_SIZE = 3;

  blogs = signal<PublicBlogListItemDto[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  loading = signal(false);
  initialLoading = signal(true);
  allLoaded = computed(() => this.blogs().length >= this.totalCount() && this.totalCount() > 0);

  categories = signal<CategoryDto[]>([]);
  searchControl = new FormControl<string>('');
  searchQuery = signal('');

  // Multi-select category state
  selectedCategoryIds = signal<string[]>([]);
  categoryDropdownOpen = signal(false);

  // Blog like state
  blogLikedMap = signal<Record<string, boolean>>({});
  blogLikeLoadingMap = signal<Record<string, boolean>>({});
  blogReactionCountMap = signal<Record<string, number>>({});

  // Comment dialog state
  commentDialogBlogId = signal<string | null>(null);
  commentDialogBlogTitle = signal<string>('');

  isLoggedIn = computed(() => this.storage.isLoggedIn());

  selectedCategoryLabel = computed(() => {
    const ids = this.selectedCategoryIds();
    if (ids.length === 0) return 'Topics';
    if (ids.length === 1) {
      const cat = this.categories().find((c) => c.id === ids[0]);
      return cat?.name ?? 'Topics';
    }
    return `${ids.length} topics`;
  });

  ngOnInit(): void {
    this.loadCategories();

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.searchQuery.set(val ?? '');
        this.resetAndLoad();
      });

    this.loadBlogs(true);
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
        error: () => {
          // Categories are optional; silently fail
        },
      });
  }

  loadBlogs(initial = false): void {
    if (this.loading()) return;
    if (!initial && this.allLoaded()) return;

    this.loading.set(true);

    const ids = this.selectedCategoryIds();

    this.publicBlogSvc
      .getPublicBlogs({
        search: this.searchQuery() || undefined,
        categoryIds: ids.length > 0 ? ids : undefined,
        pageNumber: this.pageNumber(),
        pageSize: this.PAGE_SIZE,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.initialLoading.set(false);
          if (res.status) {
            let items = res.items ?? [];

            // Client-side multi-filter if more than 1 category selected
            if (ids.length > 1) {
              items = items.filter((b) =>
                ids.some((id) => b.categoryIds.includes(id))
              );
            }

            if (initial || this.pageNumber() === 1) {
              this.blogs.set(items);
              const countMap: Record<string, number> = {};
              items.forEach((b) => (countMap[b.id] = b.totalReactions));
              this.blogReactionCountMap.set(countMap);
            } else {
              this.blogs.update((existing) => [...existing, ...items]);
              const newCounts: Record<string, number> = {};
              items.forEach((b) => (newCounts[b.id] = b.totalReactions));
              this.blogReactionCountMap.update((m) => ({ ...m, ...newCounts }));
            }
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

  loadMore(): void {
    if (this.allLoaded() || this.loading()) return;
    this.pageNumber.update((p) => p + 1);
    this.loadBlogs(false);
  }

  resetAndLoad(): void {
    this.pageNumber.set(1);
    this.blogs.set([]);
    this.totalCount.set(0);
    this.initialLoading.set(true);
    this.loadBlogs(true);
  }

  // --- Multi-select category dropdown ---
  toggleCategoryDropdown(): void {
    this.categoryDropdownOpen.update((v) => !v);
  }

  isCategorySelected(catId: string): boolean {
    return this.selectedCategoryIds().includes(catId);
  }

  toggleCategory(catId: string): void {
    const current = this.selectedCategoryIds();
    if (current.includes(catId)) {
      this.selectedCategoryIds.set(current.filter((id) => id !== catId));
    } else {
      this.selectedCategoryIds.set([...current, catId]);
    }
  }

  clearCategories(): void {
    this.selectedCategoryIds.set([]);
  }

  applyCategories(): void {
    this.categoryDropdownOpen.set(false);
    this.resetAndLoad();
  }

  // --- Likes (redirect to login if not authenticated) ---
  toggleBlogLike(blog: PublicBlogListItemDto, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.isLoggedIn()) {
      // Immediately redirect to login — do not silently fail
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    if (this.blogLikeLoadingMap()[blog.id]) return;

    const prevLiked = !!this.blogLikedMap()[blog.id];
    const prevCount = this.blogReactionCountMap()[blog.id] ?? blog.totalReactions;

    // Optimistic update
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
            // Revert optimistic update
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

  // --- Comments dialog (redirect to login if not authenticated) ---
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

  // --- Infinite scroll ---
  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const threshold = 300;

    if (scrollTop + winHeight >= docHeight - threshold) {
      this.loadMore();
    }
  }

  // Close category dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-multiselect')) {
      this.categoryDropdownOpen.set(false);
    }
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

  getCategoryName(catId: string): string {
    return this.categories().find((c) => c.id === catId)?.name ?? catId;
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
