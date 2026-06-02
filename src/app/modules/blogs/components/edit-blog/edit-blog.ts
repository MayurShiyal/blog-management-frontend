import { Component, inject, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { BlogService } from '../../services/blog.service';
import { CategoryService } from '../../../categories/services/category.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
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
  private readonly authState = inject(AuthStateService);
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

  categoryDropdownOpen = signal(false);

  thumbnailPreview = signal<string | null>(null);
  thumbnailFile = signal<File | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    shortDescription: ['', [Validators.maxLength(300)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
    thumbnailUrl: [''],
    categoryIds: this.fb.nonNullable.control<string[]>([], Validators.required),
  });

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }

  get selectedCategoryLabel(): string {
    const ids = this.form.controls.categoryIds.value;
    if (!ids || ids.length === 0) return 'Select categories';
    if (ids.length === 1) {
      const cat = this.categories().find((c) => c.id === ids[0]);
      return cat?.name ?? '1 selected';
    }
    return `${ids.length} categories selected`;
  }

  ngOnInit(): void {
    if (!this.authState.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }

    const currentUser = this.authState.currentUser;
    this.user.set(currentUser);
    this.isAdmin.set(this.authState.isAdmin);

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

            if (blogData.thumbnailUrl) {
              this.thumbnailPreview.set(blogData.thumbnailUrl);
            }

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
    const resolvedIds: string[] = Array.isArray(blogData.categoryIds)
      ? (blogData.categoryIds as string[]).filter((id) => !!id)
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

  toggleCategoryDropdown(): void {
    if (!this.isEditable()) return;
    this.categoryDropdownOpen.update((v) => !v);
  }

  isCategorySelected(categoryId: string): boolean {
    return this.form.controls.categoryIds.value.includes(categoryId);
  }

  toggleCategory(categoryId: string): void {
    if (!this.isEditable()) return;
    const current = this.form.controls.categoryIds.value ?? [];
    if (current.includes(categoryId)) {
      this.form.controls.categoryIds.setValue(current.filter((id) => id !== categoryId));
    } else {
      this.form.controls.categoryIds.setValue([...current, categoryId]);
    }
  }

  removeCategory(categoryId: string): void {
    if (!this.isEditable()) return;
    const current = this.form.controls.categoryIds.value ?? [];
    this.form.controls.categoryIds.setValue(current.filter((id) => id !== categoryId));
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find((c) => c.id === categoryId)?.name ?? '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.category-multiselect-wrap')) {
      this.categoryDropdownOpen.set(false);
    }
  }

  onFileSelected(event: Event): void {
    if (!this.isEditable()) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.show('danger', 'Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.show('danger', 'Image must be smaller than 5MB.');
      return;
    }

    this.thumbnailFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.thumbnailPreview.set(dataUrl);
      this.form.controls.thumbnailUrl.setValue(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  removeThumbnail(): void {
    if (!this.isEditable()) return;
    this.thumbnailFile.set(null);
    this.thumbnailPreview.set(null);
    this.form.controls.thumbnailUrl.setValue('');
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
