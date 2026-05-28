import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { EmailComponent } from '../../../../common/components/text-fields/email/email';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, EmailComponent],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly routes = ROUTES;

  loading = signal(false);
  submitted = signal(false);
  serverMsg = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverMsg.set(null);

    const email = this.form.getRawValue().email!.trim().toLowerCase();

    this.auth.forgotPassword({ email }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.submitted.set(true);
        this.serverMsg.set({
          type: 'success',
          text: res.message,
        });
      },
      error: (err) => {
        this.loading.set(false);
        const msg =
          err?.error?.message ?? err?.error?.title ?? 'Something went wrong. Please try again.';
        this.serverMsg.set({ type: 'danger', text: msg });
      },
    });
  }
}
