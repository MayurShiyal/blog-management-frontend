import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  title = signal<string>('Dashboard');
  subtitle = signal<string>('Welcome');
  showRefresh = signal<boolean>(false);
  refreshCallback = signal<(() => void) | null>(null);

  setHeader(
    title: string,
    subtitle: string,
    showRefresh: boolean = false,
    onRefresh: (() => void) | null = null
  ): void {
    this.title.set(title);
    this.subtitle.set(subtitle);
    this.showRefresh.set(showRefresh);
    this.refreshCallback.set(onRefresh);
  }
}
