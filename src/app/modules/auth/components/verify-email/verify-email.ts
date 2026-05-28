import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly routes = ROUTES;

  /** 'loading' | 'success' | 'error' */
  state   = signal<'loading' | 'success' | 'error'>('loading');
  message = signal<string>('Verifying your email, please wait…');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('error');
      this.message.set('Verification token is missing. Please use the link from your email.');
      return;
    }

    this.http
      .get<{ status: boolean; message: string }>(
        `${environment.apiUrl}/api/user/verify-email`,
        { params: { token } }
      )
      .subscribe({
        next: (res) => {
          if (res.status) {
            this.state.set('success');
            this.message.set(res.message ?? 'Email verified successfully. You can now log in.');
            // Redirect to login after 3 seconds
            setTimeout(() => this.router.navigate([this.routes.AUTH.LOGIN.ABSOLUTE]), 3000);
          } else {
            this.state.set('error');
            this.message.set(res.message ?? 'Verification failed. The token may be invalid or already used.');
          }
        },
        error: (err) => {
          this.state.set('error');
          this.message.set(
            err?.error?.message ?? 'Verification failed. Please try again or contact support.'
          );
        },
      });
  }
}