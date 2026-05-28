import { Component, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputComponent } from '../../../../common/components/text-fields/input/input';
import { UserListItemDto, UpdateUserRequest } from '../../models';

@Component({
  selector: 'app-user-edit-modal',
  imports: [CommonModule, ReactiveFormsModule, InputComponent],
  templateUrl: './user-edit-modal.html',
  styleUrl: './user-edit-modal.scss',
})
export class UserEditModal implements OnInit {
  private readonly fb = inject(FormBuilder);

  user = input.required<UserListItemDto>();
  loading = input<boolean>(false);

  submitted = output<UpdateUserRequest>();
  cancelled = output<void>();

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastName: ['', [Validators.maxLength(100)]],
  });

  ngOnInit(): void {
    const u = this.user();
    this.form.patchValue({
      firstName: u.firstName,
      lastName: u.lastName ?? '',
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const val = this.form.getRawValue();
    this.submitted.emit({
      firstName: val.firstName!.trim(),
      lastName: val.lastName?.trim() || null,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
