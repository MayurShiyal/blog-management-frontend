import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { USER_ROLES } from '../../models/auth-roles.models';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { InputComponent } from '../../../../common/components/text-fields/input/input';
import { EmailComponent } from '../../../../common/components/text-fields/email/email';
import { PasswordComponent } from '../../../../common/components/text-fields/password/password';

function passwordStrengthValidator(control: AbstractControl) {
  const val: string = control.value ?? '';
  if (!val) return null;
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasNumber = /\d/.test(val);
  const hasSpecial = /[^A-Za-z0-9]/.test(val);
  const isLong = val.length >= 8;
  return isLong && hasUpper && hasLower && hasNumber && hasSpecial ? null : { passwordWeak: true };
}

@Component({
  selector: 'app-register',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputComponent,
    EmailComponent,
    PasswordComponent,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly roles = USER_ROLES;
  readonly routes = ROUTES;

  loading = signal(false);
  serverMsg = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrengthValidator]],
    role: [null as number | null, [Validators.required]],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverMsg.set(null);

    const val = this.form.getRawValue();
    this.auth
      .register({
        firstName: val.firstName!.trim(),
        lastName: val.lastName?.trim() || undefined,
        email: val.email!.trim().toLowerCase(),
        password: val.password!,
        role: Number(val.role),
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            this.serverMsg.set({ type: 'success', text: res.message });
            this.form.reset();
            setTimeout(() => this.router.navigate([this.routes.AUTH.LOGIN.ABSOLUTE]), 2000);
          } else {
            this.serverMsg.set({ type: 'danger', text: res.message });
          }
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err?.error?.message ?? err?.error?.title ?? 'Registration failed. Please try again.';
          this.serverMsg.set({ type: 'danger', text: msg });
        },
      });
  }
}
