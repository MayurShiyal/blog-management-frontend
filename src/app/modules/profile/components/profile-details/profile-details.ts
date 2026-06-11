import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { AuthService } from '../../../../modules/auth/services/auth.service';
import { ToastService } from '../../../../common/services/toast.service';
import { PasswordComponent } from '../../../../common/components/text-fields/password/password';
import { ROUTES } from '../../../../common/constants/routes.constants';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword');
  const confirm = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    confirm.setErrors({ mismatch: true });
    return { mismatch: true };
  }
  if (confirm?.errors?.['mismatch']) {
    const { mismatch, ...rest } = confirm.errors;
    confirm.setErrors(Object.keys(rest).length ? rest : null);
  }
  return null;
}

@Component({
  selector: 'app-profile-details',
  imports: [CommonModule, ReactiveFormsModule, PasswordComponent],
  templateUrl: './profile-details.html',
  styleUrl: './profile-details.scss',
})
export class ProfileDetails {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly user = computed(() => this.authState.currentUser);
  readonly loading = signal(false);
  readonly serverMsg = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  form = this.fb.group(
    {
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  getFormControl(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverMsg.set(null);

    const val = this.form.getRawValue();

    this.auth
      .changePassword({
        oldPassword: val.oldPassword!,
        newPassword: val.newPassword!,
        confirmPassword: val.confirmPassword!,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.serverMsg.set({ type: 'success', text: res.message || 'Password changed successfully.' });
            this.form.reset();
            this.toast.show('success', 'Password updated successfully.');
          } else {
            this.serverMsg.set({ type: 'danger', text: res.message || 'Failed to change password.' });
            this.toast.show('danger', res.message || 'Failed to change password.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.message ?? err?.error?.title ?? 'Failed to change password. Please try again.';
          this.serverMsg.set({ type: 'danger', text: msg });
          this.toast.show('danger', msg);
        },
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }
}
