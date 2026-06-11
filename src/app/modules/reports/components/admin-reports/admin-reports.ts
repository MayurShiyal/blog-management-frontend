import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { AdminReportService } from '../../services/admin-report.service';
import { AdminCommentService } from '../../../comments/services/admin-comment.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { BlogCommentsModalComponent } from '../../../comments/components/blog-comments-modal/blog-comments-modal';
import {
  ReportedContentItemDto,
  ReportStatus,
  REPORT_STATUS_LABELS,
} from '../../models/report.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

export interface StatusOption {
  value: ReportStatus;
  label: string;
}

@Component({
  selector: 'app-admin-reports',
  imports: [CommonModule, ReactiveFormsModule, BlogCommentsModalComponent],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.scss',
})
export class AdminReports implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(AdminReportService);
  private readonly commentSvc = inject(AdminCommentService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  readonly STATUS_OPTIONS: StatusOption[] = [
    { value: ReportStatus.Open,        label: REPORT_STATUS_LABELS[ReportStatus.Open] },
    { value: ReportStatus.UnderReview, label: REPORT_STATUS_LABELS[ReportStatus.UnderReview] },
    { value: ReportStatus.Approved,    label: REPORT_STATUS_LABELS[ReportStatus.Approved] },
    { value: ReportStatus.Rejected,    label: REPORT_STATUS_LABELS[ReportStatus.Rejected] },
  ];

  // ── State ────────────────────────────────────────────────────────────────
  activeTab = signal<'blog' | 'comment'>('blog');
  items = signal<ReportedContentItemDto[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 30];
  loading = signal(false);

  statusFilter = signal<ReportStatus | null>(null);
  searchQuery = signal('');
  sortBy = signal('lastreported');
  sortDesc = signal(true);

  statusDropdownOpen = signal(false);
  openRowDropdown = signal<string | null>(null);

  // Blog comments modal (used when admin clicks eye on a reported comment)
  commentsModalOpen = signal(false);
  commentsModalBlogId = signal<string | null>(null);
  commentsModalBlogTitle = signal('');
  commentsModalHighlightId = signal<string | null>(null);
  commentsModalLoading = signal(false);

  searchControl = this.fb.control<string>('');

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);
  pages = computed(() => {
    const tp = this.totalPages();
    if (tp <= 1) return [];
    return Array.from({ length: tp }, (_, i) => i + 1);
  });

  selectedStatusLabel = computed(() => {
    if (this.statusFilter() === null) return 'All Statuses';
    return REPORT_STATUS_LABELS[this.statusFilter()!] ?? 'Status';
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!this.authState.isLoggedIn || !this.authState.isAdmin) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    this.layout.setHeader(
      'Reports',
      'Review and manage reported blogs and comments.',
      true,
      () => this.loadItems()
    );

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.searchQuery.set(val ?? '');
        this.pageNumber.set(1);
        this.loadItems();
      });

    // Close dropdowns when clicking outside
    document.addEventListener('click', this.closeDropdownsOnOutsideClick, true);

    this.loadItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.closeDropdownsOnOutsideClick, true);
  }

  private closeDropdownsOnOutsideClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.status-dropdown-wrap') && !target.closest('.dropdown')) {
      this.statusDropdownOpen.set(false);
      this.openRowDropdown.set(null);
    }
  };

  // ── Data loading ─────────────────────────────────────────────────────────
  loadItems(): void {
    this.loading.set(true);
    this.svc
      .getReportedContents({
        contentType: this.activeTab(),
        status: this.statusFilter() ?? undefined,
        search: this.searchQuery() || undefined,
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortDesc: this.sortDesc(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.items.set(res.items ?? []);
            this.totalCount.set(res.totalCount ?? 0);
          } else {
            this.toast.show('danger', res.message || 'Failed to load reports.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  // ── Tab / filter controls ─────────────────────────────────────────────────
  switchTab(tab: 'blog' | 'comment'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.pageNumber.set(1);
    this.searchQuery.set('');
    this.searchControl.setValue('', { emitEvent: false });
    this.statusFilter.set(null);
    this.loadItems();
  }

  toggleStatusDropdown(): void {
    this.statusDropdownOpen.update((v) => !v);
    this.openRowDropdown.set(null);
  }

  setStatusFilter(status: ReportStatus | null): void {
    this.statusFilter.set(status);
    this.statusDropdownOpen.set(false);
    this.pageNumber.set(1);
    this.loadItems();
  }

  toggleSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortDesc.update((v) => !v);
    } else {
      this.sortBy.set(column);
      this.sortDesc.set(true);
    }
    this.pageNumber.set(1);
    this.loadItems();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadItems();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadItems();
  }

  toggleRowDropdown(contentId: string): void {
    this.openRowDropdown.update((v) => (v === contentId ? null : contentId));
    this.statusDropdownOpen.set(false);
  }

  // ── View actions ──────────────────────────────────────────────────────────
  viewBlog(item: ReportedContentItemDto): void {
    this.router.navigate([ROUTES.BLOG.DETAIL.ABSOLUTE(item.contentId)]);
  }

  viewComment(item: ReportedContentItemDto): void {
    if (item.blogId) {
      this.commentsModalBlogId.set(item.blogId);
      this.commentsModalBlogTitle.set(item.blogTitle ?? '');
      this.commentsModalHighlightId.set(item.contentId);
      this.commentsModalOpen.set(true);
      return;
    }

    // Fallback: resolve the blogId via the admin comment history endpoint
    this.commentsModalLoading.set(true);
    this.commentsModalOpen.set(false);
    this.commentSvc
      .getCommentHistory({ isReported: true, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.commentsModalLoading.set(false);
          const match = res.items?.find(
            (h) => h.commentId === item.contentId
          );
          if (match?.blogId) {
            this.commentsModalBlogId.set(match.blogId);
            this.commentsModalBlogTitle.set(match.blogTitle ?? '');
            this.commentsModalHighlightId.set(item.contentId);
            this.commentsModalOpen.set(true);
          } else {
            this.toast.show('warning', 'Could not locate the blog for this comment.');
          }
        },
        error: () => {
          this.commentsModalLoading.set(false);
          this.toast.show('danger', 'Failed to load comment details.');
        },
      });
  }

  closeCommentsModal(): void {
    this.commentsModalOpen.set(false);
    this.commentsModalBlogId.set(null);
    this.commentsModalHighlightId.set(null);
  }

  // ── Update status ─────────────────────────────────────────────────────────
  updateStatus(item: ReportedContentItemDto, newStatus: ReportStatus): void {
    this.openRowDropdown.set(null);
    const adminId = this.authState.currentUser?.id ?? null;
    this.svc
      .updateReportStatus(item.contentId, this.activeTab(), { status: newStatus }, adminId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.toast.show('success', res.message || 'Report status updated.');
            this.loadItems();
          } else {
            this.toast.show('danger', res.message || 'Failed to update status.');
          }
        },
        error: (err) => this.toast.show('danger', this.extractError(err)),
      });
  }

  // ── History navigation ────────────────────────────────────────────────────
  goToHistory(): void {
    this.router.navigate([ROUTES.REPORTS.HISTORY.ABSOLUTE]);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  isFinalStatus(status: ReportStatus): boolean {
    return status === ReportStatus.Approved || status === ReportStatus.Rejected;
  }

  getStatusLabel(status: ReportStatus): string {
    return REPORT_STATUS_LABELS[status] ?? 'Unknown';
  }

  getStatusClass(status: ReportStatus): string {
    switch (status) {
      case ReportStatus.Open:        return 'open';
      case ReportStatus.UnderReview: return 'review';
      case ReportStatus.Approved:    return 'approved';
      case ReportStatus.Rejected:    return 'rejected';
      default:                       return 'open';
    }
  }

  getInitials(name: string): string {
    if (!name) return '?';
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
    });
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}