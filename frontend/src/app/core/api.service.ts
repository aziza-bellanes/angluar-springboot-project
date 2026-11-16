import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Client,Projet,Stats,User } from './models';
@Injectable({providedIn:'root'}) export class ApiService {
private http=inject(HttpClient);private url=environment.apiUrl;
clients(){return this.http.get<Client[]>(this.url+'/clients')}
client(id:number){return this.http.get<Client>(this.url+'/clients/'+id)}
createClient(body:Client){return this.http.post<Client>(this.url+'/clients',body)}
updateClient(id:number,body:Client){return this.http.put<Client>(this.url+'/clients/'+id,body)}
deleteClient(id:number){return this.http.delete<void>(this.url+'/clients/'+id)}
projects(){return this.http.get<Projet[]>(this.url+'/projets')}
project(id:number){return this.http.get<Projet>(this.url+'/projets/'+id)}
createProject(body:Projet){return this.http.post<Projet>(this.url+'/projets',body)}
updateProject(id:number,body:Projet){return this.http.put<Projet>(this.url+'/projets/'+id,body)}
deleteProject(id:number){return this.http.delete<void>(this.url+'/projets/'+id)}
stats(){return this.http.get<Stats>(this.url+'/dashboard/stats')}
users(){return this.http.get<User[]>(this.url+'/admin/users')}
setRoles(id:number,roles:string[]){return this.http.put<User>(this.url+'/admin/users/'+id+'/roles',{roles})}
}
