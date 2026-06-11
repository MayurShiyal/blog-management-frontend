import {
  Component,
  input,
  output,
  signal,
  inject,
  effect,
  OnDestroy,
  computed,
  AfterViewChecked,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AdminCommentService } from '../../services/admin-comment.service';
import { CommentService } from '../../services/comment.service';
import { ToastService } from '../../../../common/services/toast.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { ReportModalComponent } from '../../../reports/components/report-modal/report-modal';
import { CommentDto } from '../../models/comment.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-blog-comments-modal',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ReportModalComponent],
  templateUrl: './blog-comments-modal.html',
  styleUrl: './blog-comments-modal.scss',
})
export class BlogCommentsModalComponent implements OnDestroy, AfterViewChecked {
  private readonly commentSvc = inject(AdminCommentService);
  private readonly publicCommentSvc = inject(CommentService);
  private readonly toast = inject(ToastService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly el = inject(ElementRef);
  private readonly destroy$ = new Subject<void>();

  show = input.required<boolean>();
  blogId = input.required<string>();
  blogTitle = input<string>('');
  totalComments = input<number>(0);
  /** When set, the modal will auto-scroll to and highlight this comment after loading */
  highlightCommentId = input<string | null>(null);

  closed = output<void>();

  readonly routes = ROUTES;

  comments = signal<CommentDto[]>([]);
  loading = signal(false);
  pageNumber = signal(1);
  pageSize = signal(20);
  totalCount = signal(0);
  expandedReplies = signal<Set<string>>(new Set());

  // Reply state
  replyOpenFor = signal<string | null>(null);
  replyForms: Record<string, ReturnType<typeof this.fb.group>> = {};
  replySubmitting = signal(false);

  // Report state
  reportModalOpen = signal(false);
  reportTargetId = signal<string | null>(null);
  reportTargetPreview = signal('');

  // Highlight scroll tracking
  private _shouldScroll = false;
  private _scrolled = false;

  readonly isAdmin = computed(() => this.authState.isAdmin);
  readonly isLoggedIn = computed(() => this.authState.isLoggedIn);

  constructor() {
    effect(() => {
      if (this.show() && this.blogId()) {
        this.pageNumber.set(1);
        this.comments.set([]);
        this.totalCount.set(0);
        this.expandedReplies.set(new Set());
        this.replyOpenFor.set(null);
        this._scrolled = false;
        this._shouldScroll = false;
        this.loadComments();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this._shouldScroll && !this._scrolled && this.highlightCommentId()) {
      const target = this.el.nativeElement.querySelector(
        `[data-comment-id="${this.highlightCommentId()}"]`
      ) as HTMLElement | null;
      if (target) {
        this._scrolled = true;
        this._shouldScroll = false;
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      }
    }
  }

  loadComments(): void {
    this.loading.set(true);
    // Admins use the admin endpoint (sees hidden/reported); others use public
    const call = this.isAdmin()
      ? this.commentSvc.getAdminCommentsByBlog(this.blogId(), this.pageNumber(), this.pageSize())
      : this.commentSvc.getCommentsByBlog(this.blogId(), this.pageNumber(), this.pageSize());

    call.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.status) {
          const existing = this.pageNumber() === 1 ? [] : this.comments();
          const incoming = res.items ?? [];
          this.comments.set([...existing, ...incoming]);
          this.totalCount.set(res.totalCount ?? 0);

          // Auto-expand replies for the highlighted comment if it's a reply
          const hid = this.highlightCommentId();
          if (hid) {
            this._shouldScroll = true;
            // If highlighted id is a reply, expand its parent
            const parent = incoming.find(c => c.replies?.some(r => r.id === hid));
            if (parent) {
              this.expandedReplies.update(s => {
                const n = new Set(s);
                n.add(parent.id);
                return n;
              });
            }
          }
        } else {
          this.toast.show('danger', res.message || 'Failed to load comments.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('danger', 'Failed to load comments.');
      },
    });
  }

  loadMore(): void {
    this.pageNumber.update((p) => p + 1);
    this.loadComments();
  }

  hasMore(): boolean {
    return this.comments().length < this.totalCount();
  }

  toggleReplies(commentId: string): void {
    this.expandedReplies.update((set) => {
      const next = new Set(set);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  isRepliesExpanded(commentId: string): boolean {
    return this.expandedReplies().has(commentId);
  }

  // ── Reply ──────────────────────────────────────────────────────────────
  openReply(commentId: string): void {
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      this.closed.emit();
      return;
    }
    if (this.replyOpenFor() === commentId) {
      this.replyOpenFor.set(null);
      return;
    }
    this.replyOpenFor.set(commentId);
    if (!this.replyForms[commentId]) {
      this.replyForms[commentId] = this.fb.group({
        content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(1000)]],
      });
    }
  }

  cancelReply(): void {
    this.replyOpenFor.set(null);
  }

  submitReply(comment: CommentDto): void {
    const form = this.replyForms[comment.id];
    if (!form) return;
    form.markAllAsTouched();
    if (form.invalid) return;

    const content = form.get('content')?.value?.trim();
    if (!content) return;

    this.replySubmitting.set(true);
    this.publicCommentSvc
      .addReply({ blogId: this.blogId(), parentCommentId: comment.id, content })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.replySubmitting.set(false);
          if (res.status) {
            form.reset();
            this.replyOpenFor.set(null);
            this.toast.show('success', 'Reply added successfully.');
            this.pageNumber.set(1);
            this.comments.set([]);
            this.loadComments();
          } else {
            this.toast.show('danger', res.message || 'Failed to add reply.');
          }
        },
        error: () => {
          this.replySubmitting.set(false);
          this.toast.show('danger', 'Failed to add reply.');
        },
      });
  }

  // ── Report ─────────────────────────────────────────────────────────────
  openReport(commentId: string, content: string, commentUserId: string): void {
    if (!this.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      this.closed.emit();
      return;
    }
    const currentUser = this.authState.currentUser;
    if (currentUser && currentUser.id === commentUserId) {
      this.toast.show('warning', 'You cannot report your own comment.');
      return;
    }
    const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
    this.reportTargetId.set(commentId);
    this.reportTargetPreview.set(preview);
    this.reportModalOpen.set(true);
  }

  closeReport(): void {
    this.reportModalOpen.set(false);
    this.reportTargetId.set(null);
    this.reportTargetPreview.set('');
  }

  onReported(): void {
    this.closeReport();
    this.pageNumber.set(1);
    this.comments.set([]);
    this.loadComments();
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  navigateToBlog(): void {
    if (this.blogId()) {
      this.closed.emit();
      this.router.navigate([ROUTES.BLOG.DETAIL.ABSOLUTE(this.blogId())]);
    }
  }

  // ── Backdrop / close ───────────────────────────────────────────────────
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('bcm-backdrop')) {
      this.closed.emit();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  }

  formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
