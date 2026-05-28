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

  token = '';

  form = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
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
            this.serverMsg.set({ type: 'danger', text: res.message });
          }
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err?.error?.message ?? err?.error?.title ?? 'Password reset failed. Please try again.';
          this.serverMsg.set({ type: 'danger', text: msg });
        },
      });
  }
}
