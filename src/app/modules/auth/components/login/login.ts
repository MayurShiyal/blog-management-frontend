import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ROUTES } from '../../../../common/constants/routes.constants';
import { EmailComponent } from '../../../../common/components/text-fields/email/email';
import { PasswordComponent } from '../../../../common/components/text-fields/password/password';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, EmailComponent, PasswordComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly routes = ROUTES;

  loading = signal(false);
  serverMsg = signal<{ type: 'success' | 'danger'; text: string } | null>(null);
  isAdminPortal = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    const isAdmin =
      this.route.snapshot.data['isAdminPortal'] || this.router.url.includes('admin-login');
    this.isAdminPortal.set(isAdmin);
  }

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.serverMsg.set(null);

    const val = this.form.getRawValue();
    this.auth
      .login({
        email: val.email!.trim().toLowerCase(),
        password: val.password!,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.status) {
            const role = res.data?.role ?? '';

            if (this.isAdminPortal() && role !== 'Admin') {
              this.auth.logout().subscribe();
              this.serverMsg.set({
                type: 'danger',
                text: 'Access denied. This portal is for administrators only.',
              });
              return;
            }

            const welcomeMsg = this.isAdminPortal()
              ? 'Welcome, Admin! Redirecting…'
              : 'Login successful! Redirecting…';
            this.serverMsg.set({ type: 'success', text: welcomeMsg });

            let targetRoute: string;
            if (role === 'Admin') {
              targetRoute = ROUTES.DASHBOARD.ADMIN.ABSOLUTE;
            } else if (role === 'Author') {
              targetRoute = ROUTES.DASHBOARD.HOME.ABSOLUTE;
            } else {
              const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
              targetRoute = returnUrl ?? ROUTES.PUBLIC.BLOGS.ABSOLUTE;
            }
            setTimeout(() => this.router.navigateByUrl(targetRoute), 800);
          } else {
            this.serverMsg.set({ type: 'danger', text: res.message });
          }
        },
        error: (err) => {
          this.loading.set(false);
          const msg =
            err?.error?.message ??
            err?.error?.title ??
            'Login failed. Please check your credentials.';
          this.serverMsg.set({ type: 'danger', text: msg });
        },
      });
  }
}
