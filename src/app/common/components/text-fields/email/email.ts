import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-email',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './email.html',
})
export class EmailComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() label: string = 'Email Address';
  @Input() id: string = 'email-' + Math.random().toString(36).substring(2, 9);
  @Input() placeholder: string = 'your@email.com';
}
