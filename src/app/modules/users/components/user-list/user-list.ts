import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { AdminUserService } from '../../services/admin-user.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { DeleteModal } from '../../../../common/components/delete-modal/delete-modal';
import { UserFilters, RoleFilter, StatusFilter } from '../user-filters/user-filters';
import { UserTable } from '../user-table/user-table';
import { UserEditModal } from '../user-edit-modal/user-edit-modal';
import {
  UserListItemDto,
  UpdateUserRequest,
  UpdateUserStatusRequest,
  UserStatus,
} from '../../models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-user-list',
  imports: [CommonModule, ReactiveFormsModule, DeleteModal, UserFilters, UserTable, UserEditModal],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(AdminUserService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  users = signal<UserListItemDto[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  pageSize = signal(10);
  loading = signal(false);
  formLoading = signal(false);

  roleFilter = signal<RoleFilter>('');
  statusFilter = signal<StatusFilter>('');
  searchQuery = signal('');

  isAdmin = computed(() => this.authState.isAdmin);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  pages = computed(() => {
    const tp = this.totalPages();
    if (tp <= 1) return [];
    return Array.from({ length: tp }, (_, i) => i + 1);
  });

  modalOpen = signal(false);
  editingUser = signal<UserListItemDto | null>(null);

  deleteOpen = signal(false);
  deleteTargetId = signal<string | null>(null);
  deleteTargetName = signal('');
  deleteLoading = signal(false);

  searchControl = this.fb.control<string>('');

  ngOnInit(): void {
    if (!this.authState.isLoggedIn || !this.authState.isAdmin) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    this.layout.setHeader('Users', 'Manage author and visitor user accounts.', true, () =>
      this.loadUsers()
    );

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.searchQuery.set(val ?? '');
        this.pageNumber.set(1);
        this.loadUsers();
      });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.svc
      .getUsers({
        search: this.searchQuery() || undefined,
        role: this.roleFilter() || undefined,
        status: this.statusFilter() || undefined,
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.users.set(res.items ?? []);
            this.totalCount.set(res.totalCount ?? 0);
          } else {
            this.toast.show('danger', res.message || 'Failed to load users.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  setRoleFilter(role: RoleFilter): void {
    if (this.roleFilter() === role) return;
    this.roleFilter.set(role);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  setStatusFilter(status: StatusFilter): void {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadUsers();
  }

  openEditModal(user: UserListItemDto): void {
    this.editingUser.set(user);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingUser.set(null);
  }

  onFormSubmitted(payload: UpdateUserRequest): void {
    this.formLoading.set(true);
    const id = this.editingUser()!.id;

    this.svc
      .update(id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.formLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'User updated successfully.');
            this.closeModal();
            this.loadUsers();
          } else {
            this.toast.show('danger', res.message || 'Failed to update user.');
          }
        },
        error: (err) => {
          this.formLoading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  toggleStatus(user: UserListItemDto): void {
    const newStatus = user.status === 'Active' ? UserStatus.Inactive : UserStatus.Active;
    const payload: UpdateUserStatusRequest = { status: newStatus };

    this.svc
      .updateStatus(user.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.toast.show(
              'success',
              `User marked as ${newStatus === UserStatus.Active ? 'Active' : 'Inactive'}.`
            );
            this.loadUsers();
          } else {
            this.toast.show('danger', res.message || 'Failed to update status.');
          }
        },
        error: (err) => this.toast.show('danger', this.extractError(err)),
      });
  }

  confirmDelete(user: UserListItemDto): void {
    this.deleteTargetId.set(user.id);
    this.deleteTargetName.set(user.fullName);
    this.deleteOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteOpen.set(false);
    this.deleteTargetId.set(null);
    this.deleteTargetName.set('');
  }

  executeDelete(): void {
    const id = this.deleteTargetId();
    if (!id) return;

    this.deleteLoading.set(true);
    this.svc
      .delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.deleteLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'User deleted successfully.');
            this.cancelDelete();
            const remaining = this.users().length - 1;
            if (remaining === 0 && this.pageNumber() > 1) {
              this.pageNumber.update((p) => p - 1);
            }
            this.loadUsers();
          } else {
            this.toast.show('danger', res.message || 'Failed to delete user.');
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

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
