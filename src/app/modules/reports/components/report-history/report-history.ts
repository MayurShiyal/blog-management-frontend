import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { AdminReportService } from '../../services/admin-report.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import {
  ReportHistoryItemDto,
  ReportStatus,
  ReportType,
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
} from '../../models/report.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

// Extended model for the all-reports history endpoint
export interface AllReportHistoryItemDto extends ReportHistoryItemDto {
  contentId: string;
  contentType: 'blog' | 'comment';
  contentPreview: string;
  reportType?: number;
}

export interface GetAllReportHistoryResponse {
  status: boolean;
  message: string;
  items: AllReportHistoryItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

@Component({
  selector: 'app-report-history',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './report-history.html',
  styleUrl: './report-history.scss',
})
export class ReportHistory implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(AdminReportService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;
  // ── State ────────────────────────────────────────────────────────────────
  activeTab = signal<'all' | 'blog' | 'comment'>('all');
  items = signal<AllReportHistoryItemDto[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  pageSize = signal(15);
  readonly pageSizeOptions = [15, 30, 50];
  loading = signal(false);

  statusFilter = signal<ReportStatus | null>(null);
  searchQuery = signal('');
  statusDropdownOpen = signal(false);

  searchControl = this.fb.control<string>('');

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);
  pages = computed(() => {
    const tp = this.totalPages();
    if (tp <= 1) return [];
    const cur = this.pageNumber();
    const start = Math.max(1, cur - 2);
    const end = Math.min(tp, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  selectedStatusLabel = computed(() => {
    if (this.statusFilter() === null) return 'All Statuses';
    return REPORT_STATUS_LABELS[this.statusFilter()!] ?? 'Status';
  });

  readonly STATUS_OPTIONS = [
    { value: ReportStatus.Open,        label: REPORT_STATUS_LABELS[ReportStatus.Open] },
    { value: ReportStatus.UnderReview, label: REPORT_STATUS_LABELS[ReportStatus.UnderReview] },
    { value: ReportStatus.Approved,    label: REPORT_STATUS_LABELS[ReportStatus.Approved] },
    { value: ReportStatus.Rejected,    label: REPORT_STATUS_LABELS[ReportStatus.Rejected] },
  ];

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!this.authState.isLoggedIn || !this.authState.isAdmin) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    this.layout.setHeader(
      'Report History',
      'Full history of all reported blogs and comments.',
      true,
      () => this.loadHistory()
    );

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.searchQuery.set(val ?? '');
        this.pageNumber.set(1);
        this.loadHistory();
      });

    document.addEventListener('click', this.closeDropdownsOnOutsideClick, true);

    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.closeDropdownsOnOutsideClick, true);
  }

  private closeDropdownsOnOutsideClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.statusDropdownOpen.set(false);
    }
  };

  // ── Data loading ─────────────────────────────────────────────────────────
  loadHistory(): void {
    this.loading.set(true);
    const contentType = this.activeTab() === 'all' ? undefined : this.activeTab() as 'blog' | 'comment';

    this.svc
      .getAllReportHistory({
        contentType,
        status: this.statusFilter() ?? undefined,
        search: this.searchQuery() || undefined,
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.items.set(res.items ?? []);
            this.totalCount.set(res.totalCount ?? 0);
          } else {
            this.toast.show('danger', res.message || 'Failed to load report history.');
          }
        },
        error: () => {
          this.loading.set(false);
          this.toast.show('danger', 'Failed to load report history.');
        },
      });
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  switchTab(tab: 'all' | 'blog' | 'comment'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.pageNumber.set(1);
    this.searchQuery.set('');
    this.searchControl.setValue('', { emitEvent: false });
    this.statusFilter.set(null);
    this.loadHistory();
  }

  toggleStatusDropdown(): void {
    this.statusDropdownOpen.update((v) => !v);
  }

  setStatusFilter(status: ReportStatus | null): void {
    this.statusFilter.set(status);
    this.statusDropdownOpen.set(false);
    this.pageNumber.set(1);
    this.loadHistory();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadHistory();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadHistory();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  getStatusLabel(status: ReportStatus): string {
    return REPORT_STATUS_LABELS[status] ?? 'Unknown';
  }

  getTypeLabel(reportType: number): string {
    return (REPORT_TYPE_LABELS as Record<number, string>)[reportType] ?? 'Other';
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
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
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

  goBack(): void {
    this.router.navigate([ROUTES.REPORTS.LIST.ABSOLUTE]);
  }
}