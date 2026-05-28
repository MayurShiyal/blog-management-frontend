import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './common/guards/auth-guard';
import { ROUTES } from './common/constants/routes.constants';

export const routes: Routes = [
  // Redirect root to login
  { path: '', redirectTo: ROUTES.AUTH.LOGIN.ABSOLUTE.substring(1), pathMatch: 'full' },

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

  // Protected pages wrapped in AdminLayout shell
  {
    path: '',
    loadComponent: () =>
      import('./common/components/layout/admin-layout/admin-layout').then((m) => m.AdminLayout),
    canActivate: [authGuard],
    children: [
      // Generic dashboard (redirects admins to /admin/dashboard)
      {
        path: ROUTES.DASHBOARD.HOME.PATH,
        loadComponent: () => import('./modules/dashboard/components/home/home').then((m) => m.Home),
      },

      // Admin Dashboard
      {
        path: ROUTES.DASHBOARD.ADMIN.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/dashboard/components/dashboard/dashboard').then((m) => m.Dashboard),
      },

      // Admin Category management
      {
        path: ROUTES.CATEGORIES.LIST.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/categories/components/category-list/category-list').then(
            (m) => m.CategoryList
          ),
      },

      // Admin User management
      {
        path: ROUTES.USERS.LIST.PATH,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./modules/users/components/user-list/user-list').then((m) => m.UserList),
      },

      // Blogs
      {
        path: ROUTES.BLOG.LIST.PATH,
        loadComponent: () =>
          import('./modules/blogs/components/blog-list/blog-list').then((m) => m.BlogList),
      },
      {
        path: ROUTES.BLOG.CREATE.PATH,
        loadComponent: () =>
          import('./modules/blogs/components/create-blog/create-blog').then((m) => m.CreateBlog),
      },
      {
        path: ROUTES.BLOG.EDIT.PATH,
        loadComponent: () =>
          import('./modules/blogs/components/edit-blog/edit-blog').then((m) => m.EditBlog),
      },
      {
        path: ROUTES.BLOG.DETAIL.PATH,
        loadComponent: () =>
          import('./modules/blogs/components/blog-detail/blog-detail').then((m) => m.BlogDetail),
      },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: ROUTES.AUTH.LOGIN.ABSOLUTE.substring(1) },
];
