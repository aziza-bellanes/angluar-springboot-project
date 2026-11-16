import { Component,inject,OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Client,Projet } from '../core/models';
@Component({standalone:true,imports:[FormsModule,CommonModule],template:`
<div class="page"><div class="page-heading"><div><div class="eyebrow">RÉPERTOIRE</div><h1>Clients</h1><p>Informations et projets associés à chaque client.</p></div><button class="btn btn-primary" (click)="newClient()">+ Nouveau client</button></div>
@if(error){<div class="alert alert-danger">{{error}}</div>}
@if(editing){<section class="panel mb-4"><h3>{{form.id?'Modifier':'Ajouter'}} un client</h3><form (ngSubmit)="save()" #f="ngForm"><div class="row g-3"><div class="col-md-6"><label>Nom *</label><input class="form-control" name="nom" [(ngModel)]="form.nom" required></div><div class="col-md-6"><label>Email *</label><input type="email" class="form-control" name="email" [(ngModel)]="form.email" required></div><div class="col-md-6"><label>Téléphone</label><input class="form-control" name="tel" [(ngModel)]="form.tel"></div><div class="col-md-6"><label>Adresse</label><input class="form-control" name="adresse" [(ngModel)]="form.adresse"></div></div><div class="mt-3 d-flex gap-2"><button class="btn btn-primary" [disabled]="f.invalid||busy">Enregistrer</button><button type="button" class="btn btn-light" (click)="editing=false">Annuler</button></div></form></section>}
<div class="panel"><div class="d-flex justify-content-between align-items-center mb-3"><h3>Liste des clients ({{filtered.length}})</h3><input class="form-control search" placeholder="Rechercher un client..." [(ngModel)]="query"></div>
<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Adresse</th><th>Projets</th><th>Actions</th></tr></thead><tbody>
@for(c of filtered;track c.id){<tr><td><strong>{{c.nom}}</strong></td><td>{{c.email}}</td><td>{{c.tel||'—'}}</td><td>{{c.adresse||'—'}}</td><td>{{count(c.id!)}}</td><td><button class="btn btn-sm btn-outline-primary me-1" (click)="selected=selected===c.id?null:c.id!">Détails</button>@if(auth.isAdmin){<button class="btn btn-sm btn-outline-secondary me-1" (click)="edit(c)">Modifier</button><button class="btn btn-sm btn-outline-danger" (click)="remove(c)">Supprimer</button>}</td></tr>
@if(selected===c.id){<tr><td colspan="6" class="detail-row"><strong>Projets de {{c.nom}}</strong><ul>@for(p of projectsFor(c.id!);track p.id){<li>{{p.libelle}} · {{p.budget | number:'1.2-2'}} · {{p.statut}}</li>}@empty{<li>Aucun projet associé</li>}</ul><strong>Budget total : {{budget(c.id!) | number:'1.2-2'}}</strong></td></tr>}
}@empty{<tr><td colspan="6" class="muted py-4">Aucun client.</td></tr>}
</tbody></table></div></div></div>`})
export class ClientsComponent implements OnInit {
api=inject(ApiService);auth=inject(AuthService);items:Client[]=[];projects:Projet[]=[];query='';editing=false;busy=false;selected:number|null=null;error='';form:Client=this.empty();
empty():Client{return {nom:'',email:'',tel:'',adresse:''}}
ngOnInit(){this.load()}
load(){this.api.clients().subscribe({next:r=>this.items=r,error:e=>this.error=e.error?.error||'Chargement impossible'});this.api.projects().subscribe({next:r=>this.projects=r})}
get filtered(){let q=this.query.toLowerCase();return this.items.filter(c=>c.nom.toLowerCase().includes(q)||c.email.toLowerCase().includes(q))}
newClient(){this.form=this.empty();this.editing=true;this.error=''}
edit(c:Client){this.form={...c};this.editing=true;this.error=''}
save(){this.busy=true;let req=this.form.id?this.api.updateClient(this.form.id,this.form):this.api.createClient(this.form);req.subscribe({next:()=>{this.busy=false;this.editing=false;this.load()},error:e=>{this.busy=false;this.error=e.error?.error||'Échec de l’enregistrement'}})}
remove(c:Client){if(!confirm('Supprimer '+c.nom+' ?'))return;this.api.deleteClient(c.id!).subscribe({next:()=>this.load(),error:e=>this.error=e.error?.error||'Suppression refusée'})}
projectsFor(id:number){return this.projects.filter(p=>p.client?.id===id)}
count(id:number){return this.projectsFor(id).length}
budget(id:number){return this.projectsFor(id).reduce((sum,p)=>sum+Number(p.budget),0)}
}
