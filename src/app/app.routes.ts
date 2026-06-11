import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard, authorOrAdminGuard, visitorGuard } from './common/guards/auth-guard';
import { ROUTES } from './common/constants/routes.constants';

export const routes: Routes = [
  { path: '', redirectTo: ROUTES.PUBLIC.BLOGS.ABSOLUTE.substring(1), pathMatch: 'full' },

  {
    path: ROUTES.PUBLIC.ROOT,
    canActivate: [visitorGuard],
    loadComponent: () =>
      import('./common/components/layout/visitor-layout/visitor-layout').then((m) => m.VisitorLayout),
    children: [
      { path: '', redirectTo: 'blogs', pathMatch: 'full' },
      {
        path: 'blogs',
        loadComponent: () =>
          import('./modules/public/components/public-blog-list/public-blog-list').then(
            (m) => m.PublicBlogList
          ),
      },
      {
        path: 'blogs/:id',
        loadComponent: () =>
          import('./modules/public/components/public-blog-detail/public-blog-detail').then(
            (m) => m.PublicBlogDetail
          ),
      },
    ],
  },

  {
    path: ROUTES.AUTH.ROOT,
    loadComponent: () =>
      import('./common/components/layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: '', redirectTo: ROUTES.AUTH.LOGIN.PATH, pathMatch: 'full' },

      {
        path: ROUTES.AUTH.LOGIN.PATH,
        canActivate: [guestGuard],
        loadComponent: () => import('./modules/auth/components/login/login').then((m) => m.Login),
      },

      {
        path: ROUTES.AUTH.REGISTER.PATH,
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./modules/auth/components/register/register').then((m) => m.Register),
      },

      {
        path: ROUTES.AUTH.VERIFY_EMAIL.PATH,
        loadComponent: () =>
          import('./modules/auth/components/verify-email/verify-email').then((m) => m.VerifyEmail),
      },

      {
        path: ROUTES.AUTH.FORGOT_PASSWORD.PATH,
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./modules/auth/components/forgot-password/forgot-password').then(
            (m) => m.ForgotPassword
          ),
      },

      {
        path: ROUTES.AUTH.RESET_PASSWORD.PATH,
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./modules/auth/components/reset-password/reset-password').then(
            (m) => m.ResetPassword
          ),
      },
    ],
  },

  {
    path: '',
    loadComponent: () =>
      import('./common/components/layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [authorOrAdminGuard],
    children: [
      {
        path: 'profile',
        canActivate: [authorOrAdminGuard],
        loadComponent: () =>
          import('./modules/profile/components/profile-details/profile-details').then(
            (m) => m.ProfileDetails
          ),
      },
      {
        path: ROUTES.DASHBOARD.HOME.PATH,
        canActivate: [authorOrAdminGuard],
        loadComponent: () => import('./modules/dashboard/components/home/home').then((m) => m.Home),
      },

      {
        path: ROUTES.DASHBOARD.ADMIN.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/dashboard/components/dashboard/dashboard').then((m) => m.Dashboard),
      },

      {
        path: ROUTES.CATEGORIES.LIST.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/categories/components/category-list/category-list').then(
            (m) => m.CategoryList
          ),
      },

      {
        path: ROUTES.USERS.LIST.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/users/components/user-list/user-list').then((m) => m.UserList),
      },

      {
        path: ROUTES.REPORTS.LIST.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/reports/components/admin-reports/admin-reports').then(
            (m) => m.AdminReports
          ),
      },

      {
        path: ROUTES.REPORTS.HISTORY.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/reports/components/report-history/report-history').then(
            (m) => m.ReportHistory
          ),
      },

      {
        path: ROUTES.BLOG.LIST.PATH,
        canActivate: [authorOrAdminGuard],
        loadComponent: () =>
          import('./modules/blogs/components/blog-list/blog-list').then((m) => m.BlogList),
      },
      {
        path: ROUTES.BLOG.CREATE.PATH,
        canActivate: [authorOrAdminGuard],
        loadComponent: () =>
          import('./modules/blogs/components/create-blog/create-blog').then((m) => m.CreateBlog),
      },
      {
        path: ROUTES.BLOG.EDIT.PATH,
        canActivate: [authorOrAdminGuard],
        loadComponent: () =>
          import('./modules/blogs/components/edit-blog/edit-blog').then((m) => m.EditBlog),
      },
      {
        path: ROUTES.BLOG.DETAIL.PATH,
        canActivate: [authorOrAdminGuard],
        loadComponent: () =>
          import('./modules/blogs/components/blog-detail/blog-detail').then((m) => m.BlogDetail),
      },
    ],
  },

  {
    path: '',
    loadComponent: () =>
      import('./common/components/layout/visitor-layout/visitor-layout').then((m) => m.VisitorLayout),
    children: [
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./modules/profile/components/profile-details/profile-details').then(
            (m) => m.ProfileDetails
          ),
      },
    ],
  },

  // Error pages
  {
    path: 'error/:code',
    loadComponent: () =>
      import('./common/components/error-page/error-page').then((m) => m.ErrorPage),
  },

  { path: '**', redirectTo: ROUTES.PUBLIC.BLOGS.ABSOLUTE.substring(1) },
];
