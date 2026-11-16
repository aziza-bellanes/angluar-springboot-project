import { HttpInterceptorFn,HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError,throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
export const authInterceptor:HttpInterceptorFn=(req,next)=>{
const auth=inject(AuthService);const router=inject(Router);const token=auth.token;
const request=token?req.clone({setHeaders:{Authorization:'Bearer '+token}}):req;
return next(request).pipe(catchError((err:HttpErrorResponse)=>{if(err.status===401&& !req.url.includes('/auth/login'))auth.logout();return throwError(()=>err)}));
};
