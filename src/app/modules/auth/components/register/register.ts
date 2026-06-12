import { Component, inject, signal, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  AsyncValidatorFn,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, of, Subject } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  take,
  takeUntil,
} from 'rxjs/operators';
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

  return isLong && hasUpper && hasLower && hasNumber && hasSpecial ? null : { pattern: true };
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
export class Register implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly roles = USER_ROLES;
  readonly routes = ROUTES;

  loading = signal(false);
  serverMsg = signal<{ type: 'success' | 'danger'; text: string } | null>(null);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: [''],
    email: [
      '',
      {
        validators: [Validators.required, Validators.email],
        asyncValidators: [this.emailUniqueValidator()],
        updateOn: 'blur',
      },
    ],
    password: ['', [Validators.required, passwordStrengthValidator]],
    role: [null as number | null, [Validators.required]],
  });

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private emailUniqueValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<{ [key: string]: any } | null> => {
      if (!control.value || control.hasError('email')) {
        return of(null);
      }
      return of(control.value).pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) =>
          this.auth.checkEmailExists(email).pipe(
            map((res) => (res.exists ? { emailExists: true } : null)),
            catchError(() => of(null))
          )
        ),
        take(1)
      );
    };
  }

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
      .pipe(takeUntil(this.destroy$))
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
            err?.error?.detail ?? err?.error?.message ?? err?.error?.title ?? 'Registration failed. Please try again.';
          this.serverMsg.set({ type: 'danger', text: msg });
        },
      });
  }
}
