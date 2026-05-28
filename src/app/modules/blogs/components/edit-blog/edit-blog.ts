import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { BlogService } from '../../services/blog.service';
import { CategoryService } from '../../../categories/services/category.service';
import { StorageService } from '../../../../common/services/storage';
import { AuthService } from '../../../auth/services/auth.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import { InputComponent } from '../../../../common/components/text-fields/input/input';
import { TextareaComponent } from '../../../../common/components/text-fields/textarea/textarea';
import { CategoryDto } from '../../../categories/models/category.models';
import { GetBlogByIdDto, BlogListItemDto, BlogStatusEnum } from '../../models/blog.models';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-edit-blog',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputComponent, TextareaComponent],
  templateUrl: './edit-blog.html',
  styleUrl: './edit-blog.scss',
})
export class EditBlog implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly blogSvc = inject(BlogService);
  private readonly catSvc = inject(CategoryService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  readonly routes = ROUTES;

  user = signal<{ firstName?: string; email?: string; role?: string; id?: string } | null>(null);
  isAdmin = signal(false);

  blogId: string | null = null;
  blog = signal<GetBlogByIdDto | null>(null);
  categories = signal<CategoryDto[]>([]);
  formLoading = signal(false);
  draftLoading = signal(false);
  dataLoading = signal(true);

  isEditable = signal(false);

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

    const currentUser = this.storage.getUser<{
      firstName: string;
      email: string;
      role: string;
      id: string;
    }>();
    this.user.set(currentUser);
    this.isAdmin.set(this.storage.isAdmin());

    this.blogId = this.route.snapshot.paramMap.get('id');
    if (!this.blogId) {
      this.toast.show('danger', 'Blog ID is missing.');
      this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]);
      return;
    }

    this.layout.setHeader('Edit Blog Post', 'Modify your article details.', false);
    this.loadData();

    this.form
      .get('title')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        if (this.isEditable()) {
          this.form.get('slug')!.setValue(this.toSlug(val ?? ''), { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    if (!this.blogId) return;

    this.dataLoading.set(true);

    forkJoin({
      blog: this.blogSvc.getById(this.blogId),
      categories: this.catSvc.getActive(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ blog: blogRes, categories: catRes }) => {
          this.dataLoading.set(false);

          if (catRes.status && catRes.data) {
            const data = catRes.data as unknown as CategoryDto[];
            this.categories.set(Array.isArray(data) ? data : []);
          }

          if (blogRes.status && blogRes.data) {
            const blogData = blogRes.data;
            this.blog.set(blogData);
            this.layout.setHeader(
              'Edit: ' + blogData.title,
              'Modify your article details.',
              true,
              () => this.loadData()
            );

            const currentUser = this.user();
            const isAdmin = this.isAdmin();
            const isOwner = currentUser?.role === 'Author';

            if (!isOwner && !isAdmin) {
              this.toast.show('danger', 'You do not have permission to view this blog post.');
              setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
              return;
            }

            const editableByAuthor =
              isOwner && (blogData.status === 'Draft' || blogData.status === 'Rejected');
            this.isEditable.set(editableByAuthor);

            this.patchFormFromBlog(blogData);

            if (!editableByAuthor) {
              this.form.disable();
              if (!isAdmin) {
                this.toast.show(
                  'warning',
                  `This blog post is currently "${blogData.status}" and cannot be edited.`
                );
              }
            }
          } else {
            this.toast.show('danger', blogRes.message || 'Failed to load blog details.');
            setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
          }
        },
        error: (err) => {
          this.dataLoading.set(false);
          this.toast.show('danger', 'Failed to retrieve blog data: ' + this.extractError(err));
          setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
        },
      });
  }

  private patchFormFromBlog(blogData: GetBlogByIdDto | BlogListItemDto): void {
    const resolvedIds: number[] = Array.isArray(blogData.categoryIds)
      ? blogData.categoryIds.filter((id) => id > 0)
      : [];

    this.form.patchValue({
      title: blogData.title ?? '',
      slug: blogData.slug ?? '',
      shortDescription: blogData.shortDescription ?? '',
      content: blogData.content ?? '',
      thumbnailUrl: blogData.thumbnailUrl ?? '',
    });
    this.form.controls.categoryIds.setValue(resolvedIds);
  }

  saveDraft(): void {
    if (!this.isEditable()) return;

    this.form.get('title')?.markAsTouched();
    this.form.get('categoryIds')?.markAsTouched();

    if (this.form.get('title')?.invalid || this.form.get('categoryIds')?.invalid) {
      this.toast.show('warning', 'Title and category are required to save.');
      return;
    }

    const val = this.form.getRawValue();
    const payload = {
      title: val.title!.trim(),
      slug: val.slug!.trim(),
      shortDescription: val.shortDescription?.trim() || null,
      content: val.content?.trim() || '',
      thumbnailUrl: val.thumbnailUrl?.trim() || null,
      categoryIds: val.categoryIds ?? [],
    };

    if (!this.blogId) return;

    this.draftLoading.set(true);
    this.blogSvc
      .update(this.blogId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.draftLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'Draft saved successfully.');
            if (res.data) {
              this.blog.set(res.data as unknown as GetBlogByIdDto);
              this.patchFormFromBlog(res.data);
            }
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

  submitForApproval(): void {
    if (!this.isEditable()) return;

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

    if (!this.blogId) return;

    this.formLoading.set(true);
    this.blogSvc
      .update(this.blogId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.formLoading.set(false);
          if (res.status) {
            this.toast.show('success', res.message || 'Blog submitted for Admin approval!');
            setTimeout(() => this.router.navigate([ROUTES.BLOG.LIST.ABSOLUTE]), 1500);
          } else {
            this.toast.show('danger', res.message || 'Failed to submit blog.');
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
