import { Component,inject,OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Client,Projet,Status } from '../core/models';
@Component({standalone:true,imports:[FormsModule,CommonModule],template:`
<div class="page"><div class="page-heading"><div><div class="eyebrow">PORTEFEUILLE</div><h1>Projets</h1><p>Budgets, échéances et progression des projets.</p></div><button class="btn btn-primary" (click)="newProject()">+ Nouveau projet</button></div>
@if(error){<div class="alert alert-danger">{{error}}</div>}
@if(editing){<section class="panel mb-4"><h3>{{form.id?'Modifier':'Créer'}} un projet</h3><form (ngSubmit)="save()" #f="ngForm"><div class="row g-3">
<div class="col-md-6"><label>Libellé *</label><input class="form-control" name="libelle" [(ngModel)]="form.libelle" required></div>
<div class="col-md-6"><label>Client *</label><select class="form-select" name="clientId" [(ngModel)]="form.clientId" required><option [ngValue]="undefined">Sélectionner...</option>@for(c of clients;track c.id){<option [ngValue]="c.id">{{c.nom}}</option>}</select></div>
<div class="col-md-12"><label>Description</label><textarea class="form-control" name="description" [(ngModel)]="form.description" rows="2"></textarea></div>
<div class="col-md-4"><label>Budget *</label><input type="number" min="0" class="form-control" name="budget" [(ngModel)]="form.budget" required></div>
<div class="col-md-4"><label>Durée (jours)</label><input type="number" min="0" class="form-control" name="duree" [(ngModel)]="form.duree"></div>
<div class="col-md-4"><label>Progression (0–100)</label><input type="number" min="0" max="100" class="form-control" name="progression" [(ngModel)]="form.progression"></div>
<div class="col-md-4"><label>Début</label><input type="date" class="form-control" name="dateDebut" [(ngModel)]="form.dateDebut"></div>
<div class="col-md-4"><label>Fin</label><input type="date" class="form-control" name="dateFin" [(ngModel)]="form.dateFin"></div>
<div class="col-md-4"><label>Statut</label><select class="form-select" name="statut" [(ngModel)]="form.statut"><option value="A_FAIRE">À faire</option><option value="EN_COURS">En cours</option><option value="TERMINE">Terminé</option></select></div>
</div><div class="d-flex gap-2 mt-3"><button class="btn btn-primary" [disabled]="f.invalid||busy">Enregistrer</button><button type="button" class="btn btn-light" (click)="editing=false">Annuler</button></div></form></section>}
<div class="panel"><div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3"><h3>Liste des projets ({{filtered.length}})</h3><div class="d-flex gap-2"><input class="form-control search" placeholder="Rechercher..." [(ngModel)]="query"><select class="form-select" [(ngModel)]="filter"><option value="">Tous statuts</option><option value="A_FAIRE">À faire</option><option value="EN_COURS">En cours</option><option value="TERMINE">Terminé</option><option value="RETARD">En retard</option></select></div></div>
<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Projet</th><th>Client</th><th>Budget</th><th>Statut</th><th>Échéance</th><th>Progression</th><th>Actions</th></tr></thead><tbody>
@for(p of filtered;track p.id){<tr><td><strong>{{p.libelle}}</strong><div class="muted small">{{p.description}}</div></td><td>{{p.client?.nom}}</td><td>{{p.budget | number:'1.2-2'}}</td><td><span class="status" [class.late]="isLate(p)">{{isLate(p)?'En retard':label(p.statut)}}</span></td><td>{{p.dateFin||'—'}}</td><td><div class="progress" style="height:7px"><div class="progress-bar" [style.width.%]="p.progression"></div></div><small>{{p.progression}} %</small></td><td>@if(auth.isAdmin){<button class="btn btn-sm btn-outline-secondary me-1" (click)="edit(p)">Modifier</button><button class="btn btn-sm btn-outline-danger" (click)="remove(p)">Supprimer</button>}@else{<span class="muted">Lecture seule</span>}</td></tr>}
@empty{<tr><td colspan="7" class="muted py-4">Aucun projet.</td></tr>}
</tbody></table></div></div></div>`})
export class ProjectsComponent implements OnInit {
api=inject(ApiService);auth=inject(AuthService);items:Projet[]=[];clients:Client[]=[];query='';filter='';error='';editing=false;busy=false;form:Projet=this.empty();
empty():Projet{return {libelle:'',description:'',budget:0,duree:0,dateDebut:'',dateFin:'',statut:'A_FAIRE',progression:0,clientId:undefined}}
ngOnInit(){this.load()}
load(){this.api.projects().subscribe({next:r=>this.items=r,error:()=>this.error='Chargement impossible'});this.api.clients().subscribe({next:r=>this.clients=r})}
isLate(p:Projet){return p.statut!=='TERMINE'&&!!p.dateFin&&p.dateFin<new Date().toISOString().slice(0,10)}
label(s:Status){return ({A_FAIRE:'À faire',EN_COURS:'En cours',TERMINE:'Terminé'} as Record<Status,string>)[s]}
get filtered(){let q=this.query.toLowerCase();return this.items.filter(p=>(p.libelle.toLowerCase().includes(q)||p.client?.nom.toLowerCase().includes(q))&&(!this.filter||(this.filter==='RETARD'?this.isLate(p):p.statut===this.filter)))}
newProject(){this.form=this.empty();this.editing=true;this.error=''}
edit(p:Projet){this.form={...p,clientId:p.client?.id};this.editing=true;this.error=''}
save(){this.busy=true;let req=this.form.id?this.api.updateProject(this.form.id,this.form):this.api.createProject(this.form);req.subscribe({next:()=>{this.busy=false;this.editing=false;this.load()},error:e=>{this.busy=false;this.error=e.error?.error||'Enregistrement impossible'}})}
remove(p:Projet){if(!confirm('Supprimer '+p.libelle+' ?'))return;this.api.deleteProject(p.id!).subscribe({next:()=>this.load(),error:()=>this.error='Suppression impossible'})}
}
