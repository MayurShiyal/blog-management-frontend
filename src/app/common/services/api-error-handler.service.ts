import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { ROUTES } from '../constants/routes.constants';

export interface ApiError {
  status: number;
  title: string;
  message: string;
  detail?: string;
}

export const HTTP_ERROR_MESSAGES: Record<number, ApiError> = {
  400: {
    status: 400,
    title: 'Bad Request',
    message: 'The request was invalid. Please check your input and try again.',
  },
  401: {
    status: 401,
    title: 'Authentication Required',
    message: 'You must be logged in to perform this action. Please sign in and try again.',
  },
  403: {
    status: 403,
    title: 'Access Denied',
    message: 'You do not have permission to access this page or perform this action.',
  },
  404: {
    status: 404,
    title: 'Not Found',
    message: 'The requested resource could not be found.',
  },
  409: {
    status: 409,
    title: 'Conflict',
    message: 'This action conflicts with the current state of the resource.',
  },
  422: {
    status: 422,
    title: 'Validation Error',
    message: 'The provided data is invalid. Please review your input.',
  },
  429: {
    status: 429,
    title: 'Too Many Requests',
    message: 'You have made too many requests. Please wait a moment and try again.',
  },
  500: {
    status: 500,
    title: 'Server Error',
    message: 'An unexpected server error occurred. Please try again later.',
  },
  502: {
    status: 502,
    title: 'Service Unavailable',
    message: 'The server is temporarily unavailable. Please try again later.',
  },
  503: {
    status: 503,
    title: 'Service Unavailable',
    message: 'The service is currently unavailable. Please try again later.',
  },
};

@Injectable({ providedIn: 'root' })
export class ApiErrorHandlerService {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /**
   * Returns a human-friendly error object for a given HTTP error response.
   */
  getApiError(error: HttpErrorResponse): ApiError {
    const knownError = HTTP_ERROR_MESSAGES[error.status];
    if (knownError) {
      // Try to extract a more specific server-side message if available
      const serverMessage: string | undefined =
        error.error?.message || error.error?.title || undefined;
      return {
        ...knownError,
        detail: serverMessage,
      };
    }

    // Network / CORS / unknown errors
    if (error.status === 0) {
      return {
        status: 0,
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
      };
    }

    return {
      status: error.status,
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      detail: error.message,
    };
  }

  /**
   * Shows a toast notification for the error. For 401/403, optionally navigates.
   */
  handleWithToast(error: HttpErrorResponse, navigate = false): void {
    const apiError = this.getApiError(error);
    this.toast.show('danger', apiError.message);

    if (navigate) {
      if (error.status === 401) {
        this.router.navigate([ROUTES.AUTH.LOGIN.ABSOLUTE]);
      } else if (error.status === 403) {
        this.router.navigate([ROUTES.ERROR.FORBIDDEN]);
      }
    }
  }

  /**
   * Navigates to the appropriate error page based on status code.
   */
  navigateToErrorPage(status: number): void {
    switch (status) {
      case 401:
        this.router.navigate([ROUTES.ERROR.UNAUTHORIZED]);
        break;
      case 403:
        this.router.navigate([ROUTES.ERROR.FORBIDDEN]);
        break;
      case 404:
        this.router.navigate([ROUTES.ERROR.NOT_FOUND]);
        break;
      default:
        this.router.navigate([ROUTES.ERROR.SERVER_ERROR]);
        break;
    }
  }

  /**
   * Returns a user-friendly message string for a status code.
   */
  getMessageForStatus(status: number): string {
    return HTTP_ERROR_MESSAGES[status]?.message ?? 'An unexpected error occurred.';
  }
}
