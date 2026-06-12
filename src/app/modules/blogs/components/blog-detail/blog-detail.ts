import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { BlogService } from '../../services/blog.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { AuthService } from '../../../auth/services/auth.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { DeleteModal } from '../../../../common/components/delete-modal/delete-modal';
import { GetBlogByIdDto, BlogStatus, BlogStatusEnum } from '../../models/blog.models';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { extractApiErrorMessage } from '../../../../common/utils/error.utils';

@Component({
  selector: 'app-blog-detail',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, DeleteModal],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.scss',
})
export class BlogDetail implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly blogSvc = inject(BlogService);
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  user = signal<{ firstName?: string; email?: string; role?: string } | null>(null);
  isAdmin = computed(() => this.authState.isAdmin);

  blog = signal<GetBlogByIdDto | null>(null);
  loading = signal(true);
  errorMsg = signal<string | null>(null);

  deleteOpen = signal(false);
  deleteLoading = signal(false);

  rejectOpen = signal(false);
  rejectLoading = signal(false);
  rejectForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(300)]],
  });

  ngOnInit(): void {
    if (!this.authState.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    this.user.set(this.authState.currentUser);

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMsg.set('Blog ID is missing.');
      this.loading.set(false);
      return;
    }

    this.layout.setHeader('Blog Details', 'Loading article...', true, () =>
      this.loadBlogDetail(id)
    );
    this.loadBlogDetail(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBlogDetail(id: string): void {
    this.loading.set(true);
    this.errorMsg.set(null);

    this.blogSvc
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status && res.data) {
            this.blog.set(res.data);
            this.layout.setHeader(res.data.title, 'Review and manage this blog post.', true, () =>
              this.loadBlogDetail(id)
            );
          } else {
            this.errorMsg.set(res.message || 'Failed to load blog post details.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          const errorMsg = this.extractError(err);
          this.errorMsg.set(errorMsg);
        },
      });
  }

  isEditable(): boolean {
    const b = this.blog();
    if (!b) return false;

    const eligibleStatus = b.status === 'Draft';

    const currentUser = this.user();
    const isOwner = currentUser?.role === 'Author';

    return eligibleStatus && isOwner;
  }

  approveBlog(): void {
    const currentBlog = this.blog();
    if (!currentBlog) return;

    if (currentBlog.status !== 'PendingApproval') {
      this.toast.show('warning', 'Only blogs with Pending Approval status can be approved.');
      return;
    }

    this.blogSvc
      .updateStatus(currentBlog.id, { status: BlogStatusEnum.Published })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.toast.show('success', res.message || 'Blog approved and published successfully!');
            this.loadBlogDetail(currentBlog.id);
          } else {
            this.toast.show('danger', res.message || 'Failed to approve blog.');
          }
        },
        error: (err) => this.toast.show('danger', this.extractError(err)),
      });
  }

  openRejectModal(): void {
    const currentBlog = this.blog();
    if (!currentBlog) return;

    if (currentBlog.status !== 'PendingApproval') {
      this.toast.show('warning', 'Only blogs with Pending Approval status can be rejected.');
      return;
    }
    this.rejectForm.reset();
    this.rejectOpen.set(true);
  }

  closeRejectModal(): void {
    this.rejectOpen.set(false);
  }

  submitRejection(): void {
    this.rejectForm.markAllAsTouched();
    if (this.rejectForm.invalid) return;

    const currentBlog = this.blog();
    const reason = this.rejectForm.get('reason')?.value;
    if (!currentBlog || !reason) return;

    this.rejectLoading.set(true);
    this.blogSvc
      .updateStatus(currentBlog.id, {
        status: BlogStatusEnum.Rejected,
        rejectionReason: reason.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.rejectLoading.set(false);
          if (res.status) {
            this.closeRejectModal();
            this.toast.show('warning', `Blog rejected. Reason: ${reason}`);
            this.loadBlogDetail(currentBlog.id);
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

  confirmDelete(): void {
    this.deleteOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteOpen.set(false);
  }

  executeDelete(): void {
    const currentBlog = this.blog();
    if (!currentBlog) return;

    this.deleteLoading.set(true);
    this.blogSvc
      .delete(currentBlog.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.deleteLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'Blog deleted successfully.');
            this.cancelDelete();
            setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
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

  getStatusClass(status: BlogStatus | undefined): string {
    if (!status) return 'status-draft';
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

  getStatusLabel(status: BlogStatus | undefined): string {
    if (!status) return '';
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

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string }; status?: number };
    if (e?.status === 403) {
      return 'Access Denied: You do not have permission to view this article.';
    }
    if (e?.status === 404) {
      return 'Not Found: The requested article does not exist or has been deleted.';
    }
    return extractApiErrorMessage(err, 'An unexpected error occurred while loading this article.');
  }
}
