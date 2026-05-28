import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
})
export class TextareaComponent {
  @Input({ required: true }) control!: FormControl;
  @Input() label: string = '';
  @Input() id: string = 'textarea-' + Math.random().toString(36).substring(2, 9);
  @Input() placeholder: string = '';
  @Input() rows: number = 4;
  @Input() maxlength?: number;
}
