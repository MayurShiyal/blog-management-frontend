import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { AdminReportService } from '../../services/admin-report.service';
import { ToastService } from '../../../../common/services/toast.service';
import { ReportHistoryItemDto, ReportStatus, REPORT_STATUS_LABELS } from '../../models/report.models';

@Component({
  selector: 'app-report-history-modal',
  imports: [CommonModule],
  templateUrl: './report-history-modal.html',
  styleUrl: './report-history-modal.scss',
})
export class ReportHistoryModalComponent implements OnDestroy {
  private readonly adminReportSvc = inject(AdminReportService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  show = input.required<boolean>();
  contentId = input.required<string>();
  contentType = input.required<'blog' | 'comment'>();
  contentPreview = input<string>('');

  closed = output<void>();

  items = signal<ReportHistoryItemDto[]>([]);
  loading = signal(false);

  constructor() {
    effect(() => {
      if (this.show() && this.contentId()) {
        this.loadHistory();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadHistory(): void {
    this.loading.set(true);
    this.items.set([]);
    this.adminReportSvc
      .getReportHistory(this.contentId(), this.contentType())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.items.set(res.items ?? []);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('rh-modal-backdrop')) {
      this.closed.emit();
    }
  }
}
