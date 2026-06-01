import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { BlogService } from '../../services/blog.service';
import { CategoryService } from '../../../categories/services/category.service';
import { StorageService } from '../../../../common/services/storage';
import { AuthService } from '../../../auth/services/auth.service';
import { BlogListItemDto, BlogStatus, BlogStatusEnum } from '../../models/blog.models';
import { CategoryDto } from '../../../categories/models/category.models';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { DeleteModal } from '../../../../common/components/delete-modal/delete-modal';
import { ROUTES } from '../../../../common/constants/routes.constants';

type ViewMode = 'grid' | 'list';

interface AuthorOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-blog-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DeleteModal],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.scss',
})
export class BlogList implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly blogSvc = inject(BlogService);
  private readonly catSvc = inject(CategoryService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  user = signal<{ firstName?: string; email?: string; role?: string } | null>(null);
  isAdmin = computed(() => this.storage.isAdmin());
  isAuthor = computed(() => this.user()?.role === 'Author');

  blogs = signal<BlogListItemDto[]>([]);
  totalCount = signal(0);
  totalPages = signal(0);
  pageNumber = signal(1);
  pageSize = signal(10);
  loading = signal(false);

  categories = signal<CategoryDto[]>([]);
  searchControl = new FormControl<string>('');
  searchQuery = signal('');
  categoryFilter = signal<string | null>(null);
  statusFilter = signal<string>('');
  sortBy = signal<string>('createdAt');
  sortDesc = signal<boolean>(true);

  authorOptions = signal<AuthorOption[]>([]);
  authorFilter = signal<string>('');

  viewMode = signal<ViewMode>('grid');

  authorTab = signal<'mine' | 'public'>('mine');

  publishedCount = signal(0);
  pendingCount = signal(0);
  rejectedCount = signal(0);
  draftCount = signal(0);

  sidebarOpen = signal(false);

  deleteOpen = signal(false);
  deleteTargetId = signal<string | null>(null);
  deleteTargetTitle = signal('');
  deleteLoading = signal(false);

  rejectOpen = signal(false);
  rejectTargetId = signal<string | null>(null);
  rejectTargetTitle = signal('');
  rejectLoading = signal(false);
  rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
  });

  pages = computed(() => {
    const tp = this.totalPages();
    if (tp <= 1) return [];
    const current = this.pageNumber();
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, current - delta); i <= Math.min(tp, current + delta); i++) {
      range.push(i);
    }
    return range;
  });

  updateHeader(): void {
    let title = 'Published Blogs';
    let subtitle = 'Explore recent insights and thoughts';
    if (this.isAdmin()) {
      title = 'Blog Moderation';
      subtitle = 'Review, approve and manage all blog articles';
    } else if (this.isAuthor() && this.authorTab() === 'mine') {
      title = 'My Blog Posts';
      subtitle = 'Write, track and edit your content drafts';
    }
    this.layout.setHeader(title, subtitle, true, () => this.loadBlogs());
  }

  ngOnInit(): void {
    if (!this.storage.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }
    this.user.set(this.storage.getUser<{ firstName: string; email: string; role: string }>());

    if (this.isAuthor()) {
      this.authorTab.set('mine');
    } else {
      this.authorTab.set('public');
    }

    this.updateHeader();

    this.loadCategories();

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.searchQuery.set(val ?? '');
        this.pageNumber.set(1);
        this.loadBlogs();
      });

    this.loadBlogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.catSvc
      .getActive()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            const data = res.data as unknown as CategoryDto[];
            this.categories.set(Array.isArray(data) ? data : []);
          }
        },
        error: (err) =>
          this.toast.show('danger', 'Failed to load categories: ' + this.extractError(err)),
      });
  }

  loadBlogs(): void {
    this.loading.set(true);

    const isMine = this.isAuthor() && this.authorTab() === 'mine';

    this.blogSvc
      .getBlogs({
        search: this.searchQuery(),
        categoryId: this.categoryFilter() !== null ? this.categoryFilter()! : undefined,
        status: (() => {
          const s = this.statusFilter() || undefined;
          if (this.isAdmin() && (s === 'Draft' || !s)) {
            return s === 'Draft' ? undefined : s;
          }
          return s;
        })(),
        mine: this.isAuthor() ? isMine : undefined,
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortDesc: this.sortDesc(),
        authorId: this.isAdmin() && this.authorFilter() ? this.authorFilter() : undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            const items = this.isAdmin()
              ? (res.items ?? []).filter((b) => b.status !== 'Draft')
              : res.items ?? [];
            this.blogs.set(items);
            this.totalCount.set(res.totalCount ?? 0);

            const size = res.pageSize || this.pageSize();
            this.totalPages.set(Math.ceil((res.totalCount ?? 0) / size));

            this.updateStats(items);
            if (this.isAdmin()) {
              this.buildAuthorOptions(items);
            }
          } else {
            this.toast.show('danger', res.message || 'Failed to load blogs.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  buildAuthorOptions(items: BlogListItemDto[]): void {
    const existing = this.authorOptions();
    const existingIds = new Set(existing.map((a) => a.id));
    const newEntries: AuthorOption[] = [];
    items.forEach((blog) => {
      if (blog.authorId && blog.authorName && !existingIds.has(blog.authorId)) {
        existingIds.add(blog.authorId);
        newEntries.push({ id: blog.authorId, name: blog.authorName });
      }
    });
    if (newEntries.length > 0) {
      this.authorOptions.update((opts) => [...opts, ...newEntries]);
    }
  }

  updateStats(items: BlogListItemDto[]): void {
    const visibleItems = this.isAdmin() ? items.filter((x) => x.status !== 'Draft') : items;
    let pub = 0,
      pend = 0,
      rej = 0,
      draft = 0;
    visibleItems.forEach((x) => {
      if (x.status === 'Published') pub++;
      else if (x.status === 'PendingApproval') pend++;
      else if (x.status === 'Rejected') rej++;
      else if (x.status === 'Draft') draft++;
    });
    this.publishedCount.set(pub);
    this.pendingCount.set(pend);
    this.rejectedCount.set(rej);
    this.draftCount.set(draft);
  }

  onTabChange(tab: 'mine' | 'public'): void {
    this.authorTab.set(tab);
    this.pageNumber.set(1);
    this.categoryFilter.set(null);
    if (tab === 'public') {
      this.statusFilter.set('Published');
    } else {
      this.statusFilter.set('');
    }
    this.updateHeader();
    this.loadBlogs();
  }

  onCategoryChange(catId: string): void {
    if (!catId || catId === '') {
      this.categoryFilter.set(null);
    } else {
      // FIXED: Removed parseInt() to support string/guid IDs directly
      this.categoryFilter.set(catId);
    }
    this.pageNumber.set(1);
    this.loadBlogs();
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadBlogs();
  }

  onAuthorChange(authorId: string): void {
    this.authorFilter.set(authorId);
    this.pageNumber.set(1);
    this.loadBlogs();
  }

  onSortChange(field: string): void {
    if (this.sortBy() === field) {
      this.sortDesc.update((v) => !v);
    } else {
      this.sortBy.set(field);
      this.sortDesc.set(true);
    }
    this.pageNumber.set(1);
    this.loadBlogs();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadBlogs();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  approveBlog(blog: BlogListItemDto): void {
    if (blog.status !== 'PendingApproval') {
      this.toast.show('warning', 'Only blogs with Pending Approval status can be approved.');
      return;
    }
    this.blogSvc
      .updateStatus(blog.id, { status: BlogStatusEnum.Published })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.toast.show('success', res.message || 'Blog approved and published!');
            this.loadBlogs();
          } else {
            this.toast.show('danger', res.message || 'Failed to approve blog.');
          }
        },
        error: (err) => this.toast.show('danger', this.extractError(err)),
      });
  }

  openRejectModal(blog: BlogListItemDto): void {
    if (blog.status !== 'PendingApproval') {
      this.toast.show('warning', 'Only blogs with Pending Approval status can be rejected.');
      return;
    }
    this.rejectTargetId.set(blog.id);
    this.rejectTargetTitle.set(blog.title);
    this.rejectForm.reset();
    this.rejectOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectOpen.set(false);
    this.rejectTargetId.set(null);
    this.rejectTargetTitle.set('');
  }

  submitRejection(): void {
    this.rejectForm.markAllAsTouched();
    if (this.rejectForm.invalid) return;

    const id = this.rejectTargetId();
    const reason = this.rejectForm.get('reason')?.value;
    if (!id || !reason) return;

    this.rejectLoading.set(true);
    this.blogSvc
      .updateStatus(id, {
        status: BlogStatusEnum.Rejected,
        rejectionReason: reason.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.rejectLoading.set(false);
          if (res.status) {
            this.toast.show('warning', `Blog rejected. Reason: ${reason}`);
            this.closeRejectModal();
            this.loadBlogs();
          } else {
            this.toast.show('danger', res.message || 'Failed to reject blog.');
          }
        },
        error: (err) => {
          this.rejectLoading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  confirmDelete(blog: BlogListItemDto): void {
    this.deleteTargetId.set(blog.id);
    this.deleteTargetTitle.set(blog.title);
    this.deleteOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteOpen.set(false);
    this.deleteTargetId.set(null);
    this.deleteTargetTitle.set('');
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (!id) return;

    this.deleteLoading.set(true);
    this.blogSvc
      .delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.deleteLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'Blog deleted successfully.');
            this.cancelDelete();
            if (this.blogs().length === 1 && this.pageNumber() > 1) {
              this.pageNumber.update((p) => p - 1);
            }
            this.loadBlogs();
          } else {
            this.toast.show('danger', res.message || 'Failed to delete blog.');
            this.cancelDelete();
          }
        },
        error: (err) => {
          this.deleteLoading.set(false);
          this.toast.show('danger', this.extractError(err));
          this.cancelDelete();
        },
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }

  isEditable(blog: BlogListItemDto): boolean {
    if (this.isAdmin()) return false;
    return blog.status === 'Draft' || blog.status === 'Rejected';
  }

  canAdminModerate(blog: BlogListItemDto): boolean {
    return this.isAdmin() && blog.status === 'PendingApproval';
  }

  getStatusClass(status: BlogStatus): string {
    switch (status) {
      case 'Published':
        return 'status-published';
      case 'PendingApproval':
        return 'status-pending';
      case 'Rejected':
        return 'status-rejected';
      case 'Draft':
        return 'status-draft';
      default:
        return 'status-draft';
    }
  }

  getStatusLabel(status: BlogStatus): string {
    switch (status) {
      case 'Published':
        return 'Published';
      case 'PendingApproval':
        return 'Pending Approval';
      case 'Rejected':
        return 'Rejected';
      case 'Draft':
        return 'Draft';
      default:
        return status;
    }
  }

  getCategoryLabel(blog: BlogListItemDto): string {
    const names = blog.categoryNames;
    if (!names || names.length === 0) return 'Uncategorized';
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  }
}