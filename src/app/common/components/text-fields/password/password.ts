import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ROUTES } from '../../../constants/routes.constants';

@Component({
  selector: 'app-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './password.html',
})
export class PasswordComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() label: string = 'Password';
  @Input() id: string = 'password-' + Math.random().toString(36).substring(2, 9);
  @Input() placeholder: string = 'Your password';
  @Input() autocomplete: string = 'current-password';
  @Input() showForgotLink: boolean = false;
  @Input() forgotLink: string = ROUTES.AUTH.FORGOT_PASSWORD.ABSOLUTE;

  showPass = signal(false);

  togglePass(): void {
    this.showPass.update((v) => !v);
  }
}
