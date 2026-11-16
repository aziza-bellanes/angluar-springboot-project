import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User } from './models';
interface AuthResult {token:string;user:User}
@Injectable({providedIn:'root'}) export class AuthService {
private http=inject(HttpClient);private router=inject(Router);
user=signal<User|null>(this.readUser());
private readUser():User|null {try{return JSON.parse(sessionStorage.getItem('psm_user')||'null')}catch{return null}}
get token(){return sessionStorage.getItem('psm_token')}
get isAdmin(){return this.user()?.roles.includes('ADMIN')??false}
get isLoggedIn(){return !!this.token}
login(email:string,password:string){return this.http.post<AuthResult>(environment.apiUrl+'/auth/login',{email,password}).pipe(tap(res=>this.store(res)))}
register(payload:Record<string,string>){return this.http.post<AuthResult>(environment.apiUrl+'/auth/register',payload).pipe(tap(res=>this.store(res)))}
private store(res:AuthResult){sessionStorage.setItem('psm_token',res.token);sessionStorage.setItem('psm_user',JSON.stringify(res.user));this.user.set(res.user)}
logout(){sessionStorage.removeItem('psm_token');sessionStorage.removeItem('psm_user');this.user.set(null);this.router.navigateByUrl('/login')}
}
