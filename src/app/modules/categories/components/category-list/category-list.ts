import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { CategoryService } from '../../services/category.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { DeleteModal } from '../../../../common/components/delete-modal/delete-modal';
import { CategoryTable } from '../category-table/category-table';
import { CategoryFormModal, ModalMode } from '../category-form-modal/category-form-modal';
import { CategoryDto, CreateCategoryRequest, UpdateCategoryRequest } from '../../models';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { CategoryStats } from '../category-stats/category-stats';
import { extractApiErrorMessage } from '../../../../common/utils/error.utils';

export type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-category-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeleteModal,
    CategoryTable,
    CategoryFormModal,
    CategoryStats
  ],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss',
})
export class CategoryList implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(CategoryService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  categories = signal<CategoryDto[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  pageSize = signal(10);
  readonly pageSizeOptions = [10, 20, 30];
  loading = signal(false);
  formLoading = signal(false);

  statusFilter = signal<StatusFilter>('all');
  searchQuery = signal('');

  isAdmin = computed(() => this.authState.isAdmin);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  pages = computed(() => {
    const tp = this.totalPages();
    if (tp <= 1) return [];
    return Array.from({ length: tp }, (_, i) => i + 1);
  });

  modalMode = signal<ModalMode>('create');
  modalOpen = signal(false);
  editingCategory = signal<CategoryDto | null>(null);

  deleteOpen = signal(false);
  deleteTargetId = signal<string | null>(null);
  deleteTargetName = signal('');
  deleteLoading = signal(false);

  searchControl = this.fb.control<string>('');

  ngOnInit(): void {
    if (!this.authState.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    this.layout.setHeader(
      'Categories',
      'Create and organize categories for blog posts.',
      true,
      () => this.loadCategories()
    );

    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((val) => {
        this.searchQuery.set(val ?? '');
        this.pageNumber.set(1);
        this.loadCategories();
      });

    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.loading.set(true);
    const isActiveParam =
      this.statusFilter() === 'active' ? true : this.statusFilter() === 'inactive' ? false : null;

    this.svc
      .getAll(this.pageNumber(), this.pageSize(), this.searchQuery(), isActiveParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.categories.set(res.items ?? []);
            this.totalCount.set(res.totalCount ?? 0);
          } else {
            this.toast.show('danger', res.message || 'Failed to load categories.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  setStatusFilter(filter: StatusFilter): void {
    if (this.statusFilter() === filter) return;
    this.statusFilter.set(filter);
    this.pageNumber.set(1);
    this.loadCategories();
  }

  onDropdownFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as StatusFilter;
    this.setStatusFilter(value);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadCategories();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.loadCategories();
  }

  openCreateModal(): void {
    this.modalMode.set('create');
    this.editingCategory.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(cat: CategoryDto): void {
    this.modalMode.set('edit');
    this.editingCategory.set(cat);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingCategory.set(null);
  }

  onFormSubmitted(payload: {
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
  }): void {
    this.formLoading.set(true);

    if (this.modalMode() === 'create') {
      this.svc
        .create(payload as CreateCategoryRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.formLoading.set(false);
            if (res.status) {
              this.toast.show('success', res.message || 'Category created successfully.');
              this.closeModal();
              this.loadCategories();
            } else {
              this.toast.show('danger', res.message || 'Failed to create category.');
            }
          },
          error: (err) => {
            this.formLoading.set(false);
            this.toast.show('danger', this.extractError(err));
          },
        });
    } else {
      const id = this.editingCategory()!.id;
      this.svc
        .update(id, payload as UpdateCategoryRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.formLoading.set(false);
            if (res.status) {
              this.toast.show('success', res.message || 'Category updated successfully.');
              this.closeModal();
              this.loadCategories();
            } else {
              this.toast.show('danger', res.message || 'Failed to update category.');
            }
          },
          error: (err) => {
            this.formLoading.set(false);
            this.toast.show('danger', this.extractError(err));
          },
        });
    }
  }

  toggleStatus(cat: CategoryDto): void {
    const payload: UpdateCategoryRequest = {
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? null,
      isActive: !cat.isActive,
    };
    this.svc
      .update(cat.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.toast.show(
              'success',
              `Category marked as ${!cat.isActive ? 'Active' : 'Inactive'}.`
            );
            this.loadCategories();
          } else {
            this.toast.show('danger', res.message || 'Failed to update status.');
          }
        },
        error: (err) => this.toast.show('danger', this.extractError(err)),
      });
  }

  confirmDelete(cat: CategoryDto): void {
    this.deleteTargetId.set(cat.id);
    this.deleteTargetName.set(cat.name);
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
            this.toast.show('success', res.message || 'Category deleted successfully.');
            this.cancelDelete();
            const remaining = this.categories().length - 1;
            if (remaining === 0 && this.pageNumber() > 1) {
              this.pageNumber.update((p) => p - 1);
            }
            this.loadCategories();
          } else {
            this.toast.show('danger', res.message || 'Failed to delete category.');
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
    return extractApiErrorMessage(err);
  }
}
