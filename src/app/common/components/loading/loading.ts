import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'loading.html',
})
export class LoadingComponent {
  @Input() message: string = 'Loading details...';
  @Input() size: number = 2.5;
}