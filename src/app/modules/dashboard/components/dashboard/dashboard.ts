import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { Chart, registerables } from 'chart.js';

import { DashboardService } from '../../services/dashboard.service';
import { AuthStateService } from '../../../../common/services/auth-state.service';
import { AuthService } from '../../../auth/services/auth.service';
import { LayoutService } from '../../../../common/services/layout.service';
import { ToastService } from '../../../../common/services/toast.service';
import {
  DashboardSummaryDto,
  DashboardStatusDto,
  DashboardBlogsDto,
  LatestBlogItemDto,
  MonthlyBlogCountDto,
} from '../../models/dashboard.models';

Chart.register(...registerables);
import { ROUTES } from '../../../../common/constants/routes.constants';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {
  readonly routes = ROUTES;
  private readonly svc = inject(DashboardService);
  private readonly authState = inject(AuthStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly layout = inject(LayoutService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('userDoughnutCanvas') userDoughnutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryDoughnutCanvas') categoryDoughnutRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyBarCanvas') monthlyBarRef!: ElementRef<HTMLCanvasElement>;

  user = signal<{ firstName?: string; email?: string; role?: string } | null>(null);
  loadingSummary = signal(true);
  loadingStatus = signal(true);
  loadingBlogs = signal(true);

  summary = signal<DashboardSummaryDto | null>(null);
  status = signal<DashboardStatusDto | null>(null);
  blogsData = signal<DashboardBlogsDto | null>(null);

  isAdmin = computed(() => this.authState.isAdmin);

  latestBlogs = computed<LatestBlogItemDto[]>(() => this.blogsData()?.latestBlogs ?? []);

  monthlyData = computed<MonthlyBlogCountDto[]>(() => this.blogsData()?.monthlyBlogCounts ?? []);

  private userChart?: Chart;
  private categoryChart?: Chart;
  private monthlyChart?: Chart;

  ngOnInit(): void {
    if (!this.authState.isLoggedIn) {
      this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      return;
    }
    const currentUser = this.authState.currentUser;
    this.user.set(currentUser);
    this.layout.setHeader('Dashboard', `Welcome back, ${currentUser?.firstName ?? ''}!`, true, () =>
      this.loadAll()
    );
    this.loadAll();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.userChart?.destroy();
    this.categoryChart?.destroy();
    this.monthlyChart?.destroy();
  }

  loadAll(): void {
    this.loadSummary();
    this.loadStatus();
    this.loadBlogs();
  }

  private loadSummary(): void {
    this.loadingSummary.set(true);
    this.svc
      .getSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            this.summary.set(res.data);
          } else {
            this.toast.show('danger', res.message || 'Failed to load summary.');
          }
          this.loadingSummary.set(false);
        },
        error: () => {
          this.toast.show('danger', 'Error loading dashboard summary.');
          this.loadingSummary.set(false);
        },
      });
  }

  private loadStatus(): void {
    this.loadingStatus.set(true);
    this.svc
      .getStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            this.status.set(res.data);
            setTimeout(() => {
              this.initStatusCharts();
              window.dispatchEvent(new Event('resize'));
            }, 200);
          } else {
            this.toast.show('danger', res.message || 'Failed to load status data.');
          }
          this.loadingStatus.set(false);
        },
        error: () => {
          this.toast.show('danger', 'Error loading status data.');
          this.loadingStatus.set(false);
        },
      });
  }

  private loadBlogs(): void {
    this.loadingBlogs.set(true);
    this.svc
      .getBlogs({ latestCount: 5, monthsBack: 12 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.status && res.data) {
            this.blogsData.set(res.data);
            setTimeout(() => {
              this.initMonthlyChart();
              window.dispatchEvent(new Event('resize'));
            }, 200);
          } else {
            this.toast.show('danger', res.message || 'Failed to load blog data.');
          }
          this.loadingBlogs.set(false);
        },
        error: () => {
          this.toast.show('danger', 'Error loading blog data.');
          this.loadingBlogs.set(false);
        },
      });
  }

  private initStatusCharts(): void {
    const st = this.status();
    if (!st) return;

    if (this.userDoughnutRef?.nativeElement) {
      this.userChart?.destroy();
      this.userChart = new Chart(this.userDoughnutRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Active', 'Inactive'],
          datasets: [
            {
              data: [st.users.active, st.users.inactive],
              backgroundColor: ['#3730A3', '#c7d2fe'],
              hoverBackgroundColor: ['#4338CA', '#a5b4fc'],
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 10,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          animation: { animateRotate: true, animateScale: true, duration: 800 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#94a3b8',
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                label: (ctx) => `  ${ctx.label}: ${ctx.parsed} users`,
              },
            },
          },
        },
      });
    }
    this.userChart?.resize();
    this.categoryChart?.resize();

    if (this.categoryDoughnutRef?.nativeElement) {
      this.categoryChart?.destroy();
      this.categoryChart = new Chart(this.categoryDoughnutRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Active', 'Inactive'],
          datasets: [
            {
              data: [st.categories.active, st.categories.inactive],
              backgroundColor: ['#6366f1', '#ddd6fe'],
              hoverBackgroundColor: ['#4f46e5', '#c4b5fd'],
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 10,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          animation: { animateRotate: true, animateScale: true, duration: 800 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#94a3b8',
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                label: (ctx) => `  ${ctx.label}: ${ctx.parsed} categories`,
              },
            },
          },
        },
      });
    }
  }

  private initMonthlyChart(): void {
    const data = this.monthlyData();
    if (!data.length || !this.monthlyBarRef?.nativeElement) return;

    const labels = data.map((d) => {
      const [year, month] = d.month.split('-');
      return new Date(+year, +month - 1).toLocaleString('default', {
        month: 'short',
        year: '2-digit',
      });
    });
    const counts = data.map((d) => d.count);

    this.monthlyChart?.destroy();
    this.monthlyChart = new Chart(this.monthlyBarRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Blogs published',
            data: counts,
            backgroundColor: 'rgba(55, 48, 163, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} blog${ctx.parsed.y !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 }, color: '#6b7280' },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f0f0f5' },
            ticks: {
              stepSize: 1,
              font: { size: 12 },
              color: '#6b7280',
            },
          },
        },
      },
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  userActivePercent(): number {
    const st = this.status();
    if (!st) return 0;
    const total = st.users.active + st.users.inactive;
    return total === 0 ? 0 : Math.round((st.users.active / total) * 100);
  }

  categoryActivePercent(): number {
    const st = this.status();
    if (!st) return 0;
    const total = st.categories.active + st.categories.inactive;
    return total === 0 ? 0 : Math.round((st.categories.active / total) * 100);
  }
}
