export const ROUTES = {
  AUTH: {
    ROOT: 'auth',
    LOGIN: {
      PATH: 'login',
      ABSOLUTE: '/auth/login',
    },
    REGISTER: {
      PATH: 'register',
      ABSOLUTE: '/auth/register',
    },
    VERIFY_EMAIL: {
      PATH: 'verify-email',
      ABSOLUTE: '/auth/verify-email',
    },
    FORGOT_PASSWORD: {
      PATH: 'forgot-password',
      ABSOLUTE: '/auth/forgot-password',
    },
    RESET_PASSWORD: {
      PATH: 'reset-password',
      ABSOLUTE: '/auth/reset-password',
    },
  },
  DASHBOARD: {
    HOME: {
      PATH: 'dashboard',
      ABSOLUTE: '/dashboard',
    },
    ADMIN: {
      PATH: 'admin/dashboard',
      ABSOLUTE: '/admin/dashboard',
    },
  },
  CATEGORIES: {
    LIST: {
      PATH: 'admin/categories',
      ABSOLUTE: '/admin/categories',
    },
  },
  USERS: {
    LIST: {
      PATH: 'admin/users',
      ABSOLUTE: '/admin/users',
    },
  },
  BLOG: {
    LIST: {
      PATH: 'blogs',
      ABSOLUTE: '/blogs',
    },
    CREATE: {
      PATH: 'blogs/create',
      ABSOLUTE: '/blogs/create',
    },
    EDIT: {
      PATH: 'blogs/edit/:id',
      ABSOLUTE: (id: string | number) => `/blogs/edit/${id}`,
    },
    DETAIL: {
      PATH: 'blogs/:id',
      ABSOLUTE: (id: string | number) => `/blogs/${id}`,
    },
  },
  REPORTS: {
    LIST: {
      PATH: 'admin/reports',
      ABSOLUTE: '/admin/reports',
    },
    HISTORY: {
      PATH: 'admin/reports/history',
      ABSOLUTE: '/admin/reports/history',
    },
  },
  COMMENTS: {
    HISTORY: {
      PATH: 'admin/comments',
      ABSOLUTE: '/admin/comments',
    },
  },
  PROFILE: {
    PATH: 'profile',
    ABSOLUTE: '/profile',
  },
  PUBLIC: {
    ROOT: 'public',
    BLOGS: {
      PATH: 'public/blogs',
      ABSOLUTE: '/public/blogs',
    },
    BLOG_DETAIL: {
      PATH: 'public/blogs/:id',
      ABSOLUTE: (id: string | number) => `/public/blogs/${id}`,
    },
  },
  ERROR: {
    FORBIDDEN: '/error/403',
    UNAUTHORIZED: '/error/401',
    NOT_FOUND: '/error/404',
    SERVER_ERROR: '/error/500',
  },
} as const;

export const APP_ROUTES = {
  LOGIN: 'auth/login',
  REGISTER: 'auth/register',
  VERIFY_EMAIL: 'auth/verify-email',
  FORGOT_PASSWORD: 'auth/forgot-password',
  RESET_PASSWORD: 'auth/reset-password',
  DASHBOARD: 'dashboard',
  ADMIN_DASHBOARD: 'admin/dashboard',
  ADMIN_CATEGORIES: 'admin/categories',
  ADMIN_USERS: 'admin/users',
  BLOGS: 'blogs',
  BLOGS_CREATE: 'blogs/create',
  BLOGS_EDIT: 'blogs/edit',
  BLOGS_DETAIL: 'blogs',
} as const;
