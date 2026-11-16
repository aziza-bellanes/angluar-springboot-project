import { Routes } from '@angular/router';
import { authGuard,adminGuard } from './core/guards';
import { AuthComponent } from './auth/auth.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ClientsComponent } from './clients/clients.component';
import { ProjectsComponent } from './projects/projects.component';
import { AdminComponent } from './admin/admin.component';
export const routes:Routes=[
{path:'',pathMatch:'full',redirectTo:'dashboard'},
{path:'login',component:AuthComponent},
{path:'register',component:AuthComponent},
{path:'dashboard',component:DashboardComponent,canActivate:[authGuard]},
{path:'clients',component:ClientsComponent,canActivate:[authGuard]},
{path:'projets',component:ProjectsComponent,canActivate:[authGuard]},
{path:'utilisateurs',component:AdminComponent,canActivate:[authGuard,adminGuard]},
{path:'**',redirectTo:'dashboard'}];
