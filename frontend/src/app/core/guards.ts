import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
export const authGuard:CanActivateFn=()=>inject(AuthService).isLoggedIn || inject(Router).parseUrl('/login');
export const adminGuard:CanActivateFn=()=>inject(AuthService).isAdmin || inject(Router).parseUrl('/dashboard');
