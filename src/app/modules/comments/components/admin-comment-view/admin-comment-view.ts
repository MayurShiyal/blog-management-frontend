import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommentDto } from '../../models/comment.models';
import { BlogListItemDto } from '../../../blogs/models/blog.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-admin-comment-view',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-comment-view.html',
  styleUrl: './admin-comment-view.scss',
})
export class AdminCommentViewComponent {
  show = input.required<boolean>();
  comment = input.required<CommentDto>();
  blog = input<BlogListItemDto | null>(null);

  closed = output<void>();

  readonly routes = ROUTES;

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('acv-backdrop')) {
      this.closed.emit();
    }
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

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
