import { Component,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],template:`
<div class="auth-layout"><div class="auth-panel"><div class="eyebrow">PSM SMART MANAGER</div><h1>{{isRegister?'Créer un compte':'Bienvenue !'}}</h1><p class="muted">Gestion des clients et des projets</p>
<form (ngSubmit)="submit()">
@if(isRegister){<div class="row g-2"><div class="col"><label>Prénom</label><input class="form-control" name="prenom" [(ngModel)]="form.prenom" required></div><div class="col"><label>Nom</label><input class="form-control" name="nom" [(ngModel)]="form.nom" required></div></div><label>Téléphone</label><input class="form-control" name="tel" [(ngModel)]="form.tel">}
<label>Email</label><input class="form-control" type="email" name="email" [(ngModel)]="form.email" required>
<label>Mot de passe</label><input class="form-control" type="password" name="password" [(ngModel)]="form.password" minlength="8" required>
@if(error){<div class="alert alert-danger mt-3">{{error}}</div>}
<button class="btn btn-primary w-100 mt-4" [disabled]="loading">{{loading?'Veuillez patienter...':(isRegister?'S’inscrire':'Se connecter')}}</button>
</form><p class="text-center mt-3">@if(isRegister){Déjà inscrit ? <a routerLink="/login">Connexion</a>}@else{Pas encore de compte ? <a routerLink="/register">Inscription</a>}</p>
</div></div>`})
export class AuthComponent {
private auth=inject(AuthService);private router=inject(Router);
get isRegister(){return this.router.url.startsWith('/register')}
form={nom:'',prenom:'',tel:'',email:'',password:''};error='';loading=false;
submit(){this.error='';this.loading=true;const request=this.isRegister?this.auth.register(this.form):this.auth.login(this.form.email,this.form.password);
request.subscribe({next:()=>{this.loading=false;this.router.navigateByUrl('/dashboard')},error:e=>{this.loading=false;this.error=e.error?.error||'Échec de la connexion au serveur'}})}
}
