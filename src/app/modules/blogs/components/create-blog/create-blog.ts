import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { BlogService } from '../../services/blog.service';
import { CategoryService } from '../../../categories/services/category.service';
import { StorageService } from '../../../../common/services/storage';
import { AuthService } from '../../../auth/services/auth.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { InputComponent } from '../../../../common/components/text-fields/input/input';
import { TextareaComponent } from '../../../../common/components/text-fields/textarea/textarea';
import { CategoryDto } from '../../../categories/models/category.models';
import { BlogStatusEnum } from '../../models/blog.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-create-blog',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputComponent, TextareaComponent],
  templateUrl: './create-blog.html',
  styleUrl: './create-blog.scss',
})
export class CreateBlog implements OnInit, OnDestroy {
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
  isAdmin = signal(false);

  categories = signal<CategoryDto[]>([]);
  formLoading = signal(false);
  draftLoading = signal(false);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    shortDescription: ['', [Validators.maxLength(300)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
    thumbnailUrl: ['', [Validators.pattern(/^https?:\/\/.*$/)]],
    categoryIds: this.fb.nonNullable.control<number[]>([], Validators.required),
  });

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }

  ngOnInit(): void {
    if (!this.storage.isLoggedIn()) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    const currentUser = this.storage.getUser<{ firstName: string; email: string; role: string }>();
    this.user.set(currentUser);
    this.isAdmin.set(this.storage.isAdmin());

    if (currentUser?.role !== 'Author' && !this.storage.isAdmin()) {
      this.toast.show('danger', 'Only Authors can create new blogs.');
      this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]);
      return;
    }

    this.layout.setHeader(
      'Create Blog Post',
      'Write and publish a new article to the blog hub.',
      false
    );
    this.loadCategories();

    this.form
      .get('title')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.form.get('slug')!.setValue(this.toSlug(val ?? ''), { emitEvent: false });
      });
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

  saveAsDraft(): void {
    this.form.get('title')?.markAsTouched();
    this.form.get('categoryIds')?.markAsTouched();

    if (this.form.get('title')?.invalid || this.form.get('categoryIds')?.invalid) {
      this.toast.show('warning', 'Please provide at least a title and category to save as draft.');
      return;
    }

    const val = this.form.getRawValue();
    const payload = {
      title: val.title!.trim(),
      slug: val.slug?.trim() || this.toSlug(val.title!),
      shortDescription: val.shortDescription?.trim() || null,
      content: val.content?.trim() || '',
      thumbnailUrl: val.thumbnailUrl?.trim() || null,
      categoryIds: val.categoryIds ?? [],
      status: BlogStatusEnum.Draft,
    };

    this.draftLoading.set(true);

    this.blogSvc
      .create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.draftLoading.set(false);
          if (res.status) {
            this.toast.show(
              'success',
              res.message || 'Blog saved as draft. You can edit and submit it later.'
            );
            setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
          } else {
            this.toast.show('danger', res.message || 'Failed to save draft.');
          }
        },
        error: (err) => {
          this.draftLoading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  submitForm(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    const payload = {
      title: val.title!.trim(),
      slug: val.slug!.trim(),
      shortDescription: val.shortDescription?.trim() || null,
      content: val.content!.trim(),
      thumbnailUrl: val.thumbnailUrl?.trim() || null,
      categoryIds: val.categoryIds ?? [],
      status: BlogStatusEnum.PendingApproval,
    };

    this.formLoading.set(true);

    this.blogSvc
      .create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.formLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'Blog submitted for Admin approval!');
            setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
          } else {
            this.toast.show('danger', res.message || 'Failed to create blog post.');
          }
        },
        error: (err) => {
          this.formLoading.set(false);
          this.toast.show('danger', this.extractError(err));
        },
      });
  }

  onCategorySelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selectedId = Number(select.value);
    const current = this.form.controls.categoryIds.value ?? [];

    if (current.includes(selectedId)) {
      this.form.controls.categoryIds.setValue(current.filter((id) => id !== selectedId));
    } else {
      this.form.controls.categoryIds.setValue([...current, selectedId]);
    }
    select.value = '';
  }

  getCategoryName(categoryId: number): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }

  removeCategory(categoryId: number): void {
    const current = this.form.controls.categoryIds.value ?? [];
    this.form.controls.categoryIds.setValue(current.filter((id) => id !== categoryId));
  }

  isCategorySelected(categoryId: number): boolean {
    return this.form.controls.categoryIds.value.includes(categoryId);
  }

  toSlug(val: string): string {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private extractError(err: unknown): string {
    const e = err as { error?: { message?: string; title?: string } };
    return e?.error?.message ?? e?.error?.title ?? 'An unexpected error occurred.';
  }
}
