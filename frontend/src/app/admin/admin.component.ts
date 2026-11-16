import { Component,inject,OnInit } from '@angular/core';
import { ApiService } from '../core/api.service';
import { User } from '../core/models';
@Component({standalone:true,template:`<div class="page"><div class="page-heading"><div><div class="eyebrow">ADMINISTRATION</div><h1>Utilisateurs</h1><p>Attribution des permissions par rôle.</p></div></div>
@if(error){<div class="alert alert-danger">{{error}}</div>}
<div class="panel"><table class="table align-middle"><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôles</th><th>Actions</th></tr></thead><tbody>
@for(u of users;track u.id){<tr><td>{{u.prenom}} {{u.nom}}</td><td>{{u.email}}</td><td>{{u.roles.join(', ')}}</td><td><button class="btn btn-sm btn-outline-primary" (click)="toggle(u)">{{u.roles.includes('ADMIN')?'Passer collaborateur':'Promouvoir Admin'}}</button></td></tr>}
</tbody></table></div></div>`})
export class AdminComponent implements OnInit {api=inject(ApiService);users:User[]=[];error='';
ngOnInit(){this.load()}
load(){this.api.users().subscribe({next:r=>this.users=r,error:()=>this.error='Accès refusé'})}
toggle(u:User){const roles=u.roles.includes('ADMIN')?['COLLABORATEUR']:['ADMIN'];if(!confirm('Modifier les droits de '+u.email+' ?'))return;this.api.setRoles(u.id,roles).subscribe({next:()=>this.load(),error:()=>this.error='Modification impossible'})}
}
