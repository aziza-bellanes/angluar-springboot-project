import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

/**
 * Attaches the JWT to API calls and ends the session when the server rejects it (401),
 * sending the visitor back to the login page with a return URL.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const token = auth.token();
  const isApi = request.url.startsWith('/api/');
  const authorized =
    token && isApi ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      const isAuthCall = request.url.startsWith('/api/auth/login') || request.url.startsWith('/api/auth/register');
      if (error instanceof HttpErrorResponse && error.status === 401 && token && !isAuthCall) {
        auth.logout(router.url);
      }
      return throwError(() => error);
    }),
  );
};
