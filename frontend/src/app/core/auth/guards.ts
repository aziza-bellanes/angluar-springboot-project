import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleName } from '../models/api.models';
import { AuthStore } from './auth.store';

/** Requires a signed-in user; otherwise redirects to /login with the requested URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Requires one of the given roles. The backend remains the real security boundary. */
export function roleGuard(...roles: RoleName[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    return auth.hasRole(...roles) || router.createUrlTree(['/forbidden']);
  };
}

/** Keeps signed-in users away from the login and registration pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return !auth.isAuthenticated() || inject(Router).createUrlTree([auth.isStaff() ? '/studio' : '/account']);
};
