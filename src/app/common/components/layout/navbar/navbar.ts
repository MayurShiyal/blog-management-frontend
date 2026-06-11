import { Component, inject, HostListener, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthStateService } from '../../../services/auth-state.service';
import { AuthService } from '../../../../modules/auth/services/auth.service';
import { ROUTES } from '../../../constants/routes.constants';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly routes = ROUTES;
  
  // State Management Signals
  profileMenuOpen = signal(false);
  sidebarOpen = signal(false); // Added for responsive mobile drawer tracking

  // Auth Selectors converted elegantly to Signals
  isLoggedIn = toSignal(this.authState.isLoggedIn$, { initialValue: this.authState.isLoggedIn });
  currentUser = toSignal(this.authState.user$, { initialValue: this.authState.currentUser });

  getUserInitial(): string {
    const user = this.currentUser();
    return (user?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    return user?.firstName ?? user?.email ?? 'User';
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((v) => !v);
    if (this.profileMenuOpen()) {
      this.sidebarOpen.set(false); // UX: Close the main menu if the profile dropdown is popped
    }
  }

  // Implemented the placeholder to cleanly toggle the signal state
  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
    if (this.sidebarOpen()) {
      this.profileMenuOpen.set(false); // UX: Close the profile dropdown if the mobile menu is opened
    }
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.profileMenuOpen.set(false);
      this.sidebarOpen.set(false);
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
    });
  }

  // Combined HostListener to safely detect clicks outside dropdown elements
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // 1. Close profile dropdown if clicking outside its container wrapper
    if (!target.closest('.navbar-profile-wrap')) {
      this.profileMenuOpen.set(false);
    }

    // 2. Close mobile sidebar menu if clicking outside the collapsible core menu card or its toggle wrapper
    if (this.sidebarOpen() && !target.closest('.navbar-collapse') && !target.closest('.navbar-toggler')) {
      this.sidebarOpen.set(false);
    }
  }
}