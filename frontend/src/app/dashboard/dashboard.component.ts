import { Component,OnInit,inject } from '@angular/core';
import { CommonModule,DecimalPipe,CurrencyPipe,DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Stats,Projet } from '../core/models';
@Component({standalone:true,imports:[CommonModule,RouterLink],template:`
<div class="page"><div class="page-heading"><div><div class="eyebrow">VUE D'ENSEMBLE</div><h1>Tableau de bord</h1><p>Indicateurs calculés depuis vos projets enregistrés.</p></div><a routerLink="/projets" class="btn btn-primary">Voir les projets</a></div>
@if(error){<div class="alert alert-danger">{{error}}</div>}
@if(stats){<div class="kpi-grid">
@for(card of cards;track card.label){<div class="panel kpi"><div class="kpi-icon">{{card.icon}}</div><div class="muted">{{card.label}}</div><div class="kpi-value">{{card.value}}</div></div>}
</div><div class="dashboard-grid mt-4"><section class="panel"><h3>Répartition des projets</h3><p class="muted small">Vue synthétique par statut</p>
<div class="chart-row"><span>À faire</span><div class="chart-track"><div class="chart-bar todo" [style.width.%]="chartWidth(aFaire)"></div></div><strong>{{aFaire}}</strong></div>
<div class="chart-row"><span>En cours</span><div class="chart-track"><div class="chart-bar active" [style.width.%]="chartWidth(stats.enCours)"></div></div><strong>{{stats.enCours}}</strong></div>
<div class="chart-row"><span>Terminés</span><div class="chart-track"><div class="chart-bar done" [style.width.%]="chartWidth(stats.termines)"></div></div><strong>{{stats.termines}}</strong></div>
</section><section class="panel alert-summary"><h3>Suivi des échéances</h3><div class="deadline-number">{{stats.enRetard}}</div><p>projet{{stats.enRetard===1?'':'s'}} en retard</p><a routerLink="/projets" class="btn btn-outline-primary btn-sm">Examiner les échéances</a></section></div>
<div class="panel mt-4"><div class="d-flex justify-content-between align-items-center"><h3>Projets récents</h3><a routerLink="/projets">Tous les projets</a></div>
<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Projet</th><th>Client</th><th>Statut</th><th>Budget</th></tr></thead><tbody>
@for(p of stats.recents;track p.id){<tr><td>{{p.libelle}}</td><td>{{p.client?.nom}}</td><td><span class="status">{{statusLabel(p.statut)}}</span></td><td>{{p.budget | number:'1.2-2'}}</td></tr>}@empty{<tr><td colspan="4" class="muted py-4">Aucun projet enregistré.</td></tr>}
</tbody></table></div></div>}
</div>`})
export class DashboardComponent implements OnInit {
private api=inject(ApiService);stats:Stats|null=null;error='';
ngOnInit(){this.api.stats().subscribe({next:s=>this.stats=s,error:()=>this.error='Impossible de charger le tableau de bord.'})}
get cards(){const s=this.stats!;return[{label:'Clients',value:s.clients,icon:'♧'},{label:'Projets',value:s.projets,icon:'▤'},{label:'En cours',value:s.enCours,icon:'◉'},{label:'Terminés',value:s.termines,icon:'✓'},{label:'En retard',value:s.enRetard,icon:'!'},{label:'Budget total',value:s.budgetTotal.toLocaleString('fr-FR'),icon:'€'}]}
get aFaire(){return Math.max(0,(this.stats?.projets??0)-(this.stats?.enCours??0)-(this.stats?.termines??0))}
chartWidth(value:number){const total=this.stats?.projets??0;return total?Math.max(4,Math.round(value/total*100)):0}
statusLabel(s:string){return ({A_FAIRE:'À faire',EN_COURS:'En cours',TERMINE:'Terminé'} as Record<string,string>)[s]||s}
}
