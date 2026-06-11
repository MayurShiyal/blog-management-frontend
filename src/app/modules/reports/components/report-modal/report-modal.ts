import {
  Component,
  input,
  output,
  signal,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { ReportService } from '../../services/report.service';
import { ToastService } from '../../../../common/services/toast.service';
import { ReportType, REPORT_TYPE_LABELS } from '../../models/report.models';

export interface ReportTypeOption {
  value: ReportType;
  label: string;
}

@Component({
  selector: 'app-report-modal',
  imports: [CommonModule],
  templateUrl: './report-modal.html',
  styleUrl: './report-modal.scss',
})
export class ReportModalComponent implements OnDestroy {
  private readonly reportSvc = inject(ReportService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  /** Whether the modal is visible */
  show = input.required<boolean>();

  /** 'blog' or 'comment' */
  contentType = input.required<'blog' | 'comment'>();

  /** The id of the content being reported */
  contentId = input.required<string>();

  /** Short preview shown in the modal header (blog title or first ~80 chars of comment) */
  contentPreview = input<string>('');

  /** Emitted when the report was successfully submitted */
  reported = output<void>();

  /** Emitted when the user cancels */
  cancelled = output<void>();

  readonly REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
    { value: ReportType.Spam,                label: REPORT_TYPE_LABELS[ReportType.Spam] },
    { value: ReportType.InappropriateContent, label: REPORT_TYPE_LABELS[ReportType.InappropriateContent] },
    { value: ReportType.Harassment,           label: REPORT_TYPE_LABELS[ReportType.Harassment] },
    { value: ReportType.Other,                label: REPORT_TYPE_LABELS[ReportType.Other] },
  ];

  selectedType = signal<ReportType | null>(null);
  reasonText = signal('');
  submitted = signal(false);
  loading = signal(false);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectType(type: ReportType): void {
    this.selectedType.set(type);
  }

  onReasonInput(value: string): void {
    this.reasonText.set(value);
  }

  onSubmit(): void {
    this.submitted.set(true);
    if (this.selectedType() === null) return;

    const payload =
      this.contentType() === 'blog'
        ? { blogId: this.contentId(), type: this.selectedType()!, reason: this.reasonText().trim() || null }
        : { commentId: this.contentId(), type: this.selectedType()!, reason: this.reasonText().trim() || null };

    this.loading.set(true);
    this.reportSvc
      .createReport(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'Report submitted successfully.');
            this.resetState();
            this.reported.emit();
          } else {
            this.toast.show('danger', res.message || 'Failed to submit report.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          const e = err as { status?: number; error?: { message?: string } };
          if (e?.status === 409) {
            this.toast.show(
              'warning',
              `You have already reported this ${this.contentType()}.`
            );
            this.resetState();
            this.cancelled.emit();
          } else {
            this.toast.show('danger', e?.error?.message ?? 'An unexpected error occurred.');
          }
        },
      });
  }

  onCancel(): void {
    this.resetState();
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('report-modal-backdrop')) {
      this.onCancel();
    }
  }

  private resetState(): void {
    this.selectedType.set(null);
    this.reasonText.set('');
    this.submitted.set(false);
  }
}
