export interface User {id:number;nom:string;prenom:string;email:string;tel?:string;roles:string[]}
export interface Client {id?:number;nom:string;email:string;tel:string;adresse:string}
export type Status='A_FAIRE'|'EN_COURS'|'TERMINE';
export interface Projet {id?:number;libelle:string;description:string;budget:number;duree:number;dateDebut:string;dateFin:string;statut:Status;progression:number;clientId?:number;client?:Client}
export interface Stats {clients:number;projets:number;enCours:number;termines:number;enRetard:number;budgetTotal:number;recents:Projet[]}
