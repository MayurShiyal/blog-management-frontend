import { Component, inject, HostListener, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';
import { ToastComponent } from '../../toast/toast';
import { StorageService } from '../../../services/storage';
import { AuthService } from '../../../../modules/auth/services/auth.service';
import { ROUTES } from '../../../constants/routes.constants';

@Component({
  selector: 'app-public-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, ToastComponent],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  readonly toastService = inject(ToastService);
  readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly routes = ROUTES;
  readonly currentYear = new Date().getFullYear();

  profileMenuOpen = signal(false);

  isLoggedIn(): boolean {
    return this.storage.isLoggedIn();
  }

  getUser(): { firstName?: string; email?: string } | null {
    return this.storage.getUser<{ firstName?: string; email?: string }>();
  }

  getUserInitial(): string {
    const user = this.getUser();
    return (user?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  }

  getUserDisplayName(): string {
    const user = this.getUser();
    return user?.firstName ?? user?.email ?? 'User';
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
    this.profileMenuOpen.set(false);
    this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.visitor-profile-menu-wrap')) {
      this.profileMenuOpen.set(false);
    }
  }
}
