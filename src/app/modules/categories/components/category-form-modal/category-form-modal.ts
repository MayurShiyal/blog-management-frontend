import {
  Component,
  inject,
  input,
  output,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { InputComponent } from '../../../../common/components/text-fields/input/input';
import { TextareaComponent } from '../../../../common/components/text-fields/textarea/textarea';
import { CategoryDto } from '../../models';

export type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-category-form-modal',
  imports: [CommonModule, ReactiveFormsModule, InputComponent, TextareaComponent],
  templateUrl: './category-form-modal.html',
  styleUrl: './category-form-modal.scss',
})
export class CategoryFormModal implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  mode = input.required<ModalMode>();
  loading = input<boolean>(false);
  category = input<CategoryDto | null>(null);

  submitted = output<{
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
  }>();
  cancelled = output<void>();

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    description: ['', [Validators.maxLength(500)]],
    isActive: [true],
  });

  ngOnInit(): void {
    const cat = this.category();
    if (cat) {
      this.form.patchValue({
        name: cat.name,
        slug: cat.slug,
        description: cat.description ?? '',
        isActive: cat.isActive,
      });
    } else {
      this.form.reset({ isActive: true });
    }

    this.form
      .get('name')!
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        if (this.mode() === 'create') {
          this.form.get('slug')!.setValue(this.toSlug(val ?? ''), { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.submitted.emit({
      name: val.name!.trim(),
      slug: val.slug!.trim(),
      description: val.description?.trim() || null,
      isActive: val.isActive ?? true,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private toSlug(val: string): string {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
