import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class InputComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() label: string = '';
  @Input() id: string = 'input-' + Math.random().toString(36).substring(2, 9);
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() autocomplete: string = 'on';
  @Input() maxlength?: number;
}
