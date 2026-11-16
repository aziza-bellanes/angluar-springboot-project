import { Component,inject } from '@angular/core';
import { RouterLink,RouterLinkActive,RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
@Component({selector:'app-root',standalone:true,imports:[RouterLink,RouterLinkActive,RouterOutlet],template:`
@if(auth.isLoggedIn){<aside class="sidebar"><div class="brand">◈ PSM <small>Smart Manager</small></div><nav>
<a routerLink="/dashboard" routerLinkActive="active">◫ Tableau de bord</a>
<a routerLink="/clients" routerLinkActive="active">♧ Clients</a>
<a routerLink="/projets" routerLinkActive="active">▤ Projets</a>
@if(auth.isAdmin){<a routerLink="/utilisateurs" routerLinkActive="active">♙ Utilisateurs</a>}
</nav><div class="sidebar-footer"><span>{{auth.user()?.prenom}} {{auth.user()?.nom}}</span><small>{{auth.isAdmin?'Administrateur':'Collaborateur'}}</small><button class="btn btn-outline-light btn-sm mt-3" (click)="auth.logout()">Déconnexion</button></div></aside>}
<main [class.with-sidebar]="auth.isLoggedIn"><router-outlet/></main>`})
export class AppComponent {auth=inject(AuthService)}
