import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { lastValueFrom } from 'rxjs'; // 👈 IMPORT THIS

import { routes } from './app.routes';
import { authInterceptor } from './common/interceptor/auth-interceptor';
import { AuthStateService } from './common/services/auth-state.service';

function initializeAuth(authState: AuthStateService) {
  return () => lastValueFrom(authState.initialize());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthStateService],
      multi: true,
    },
  ],
};