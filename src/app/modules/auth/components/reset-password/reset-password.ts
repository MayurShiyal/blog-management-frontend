import { Component, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { PasswordComponent } from '../../../../common/components/text-fields/password/password';

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

function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = control.value ?? '';
  if (!value) return null;
  const errors: ValidationErrors = {};
  if (!/[A-Z]/.test(value)) errors['noUppercase'] = true;
  if (!/[a-z]/.test(value)) errors['noLowercase'] = true;
  if (!/[0-9]/.test(value)) errors['noNumber'] = true;
  if (!/[^A-Za-z0-9]/.test(value)) errors['noSpecialChar'] = true;
  return Object.keys(errors).length ? errors : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly routes = ROUTES;

  loading = signal(false);
  success = signal(false);
  serverMsg = signal<{ type: 'success' | 'danger'; text: string } | null>(null);
  invalidToken = signal(false);
  expiredLink = signal(false);

  token = '';

  form = this.fb.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100),
          strongPasswordValidator,
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.invalidToken.set(true);
    }
  }

  get pwdCtrl() {
    return this.form.controls.newPassword;
  }

  get confirmCtrl() {
    return this.form.controls.confirmPassword;
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token) return;

    this.loading.set(true);
    this.serverMsg.set(null);

    const val = this.form.getRawValue();

    this.auth
      .resetPassword({
        token: this.token,
        newPassword: val.newPassword!,
        confirmPassword: val.confirmPassword!,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.success.set(true);
            this.serverMsg.set({ type: 'success', text: res.message });
            setTimeout(() => this.router.navigate([this.routes.AUTH.LOGIN.ABSOLUTE]), 3000);
          } else {
            const msg = res.message ?? '';
            if (msg.toLowerCase().includes('expired')) {
              this.expiredLink.set(true);
            }
            this.serverMsg.set({ type: 'danger', text: msg });
          }
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err?.error?.detail ??
            err?.error?.message ??
            err?.error?.title ??
            'Password reset failed. Please try again.';
          if (msg.toLowerCase().includes('expired')) {
            this.expiredLink.set(true);
            this.serverMsg.set({
              type: 'danger',
              text: 'Password reset link has expired. Please request a new reset link.',
            });
          } else {
            this.serverMsg.set({ type: 'danger', text: msg });
          }
        },
      });
  }
}
