import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../toast/toast';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-visitor-layout',
  imports: [RouterOutlet, ToastComponent, Navbar, Footer],
  templateUrl: './visitor-layout.html',
  styleUrl: './visitor-layout.scss',
})
export class VisitorLayout {
  readonly toastService = inject(ToastService);
}
