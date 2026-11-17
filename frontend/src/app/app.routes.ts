import { Routes } from '@angular/router';
import { guestGuard, authGuard, roleGuard } from './core/auth/guards';
import { PublicLayout } from './shared/layout/public-layout';

/**
 * Two shells: the public gallery (art-first, cinematic) and the private studio (clear and fast).
 * Feature screens are lazy loaded.
 */
export const routes: Routes = [
  {
    path: '',
    component: PublicLayout,
    children: [
      { path: '', title: 'ATELIER — Art comes alive', loadComponent: () => import('./features/home/home-page') },
      { path: 'artworks', title: 'Discover art · ATELIER', loadComponent: () => import('./features/gallery/gallery-page') },
      {
        path: 'artworks/:slug',
        title: 'Artwork · ATELIER',
        loadComponent: () => import('./features/artwork-detail/artwork-detail-page'),
      },
      { path: 'artists', title: 'Artists · ATELIER', loadComponent: () => import('./features/artists/artists-page') },
      {
        path: 'artists/:id',
        title: 'Artist · ATELIER',
        loadComponent: () => import('./features/artists/artist-profile-page'),
      },
      {
        path: 'exhibitions',
        title: 'Exhibitions · ATELIER',
        loadComponent: () => import('./features/exhibitions/exhibitions-page'),
      },
      { path: 'auctions', title: 'Live auctions · ATELIER', loadComponent: () => import('./features/auctions/auctions-page') },
      {
        path: 'auctions/:id',
        title: 'Auction · ATELIER',
        loadComponent: () => import('./features/auctions/auction-room-page'),
      },
      {
        path: 'login',
        title: 'Sign in · ATELIER',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login-page'),
      },
      {
        path: 'register',
        title: 'Create an account · ATELIER',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register-page'),
      },
      {
        path: 'account',
        title: 'My collection · ATELIER',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/account-page'),
      },
      { path: 'forbidden', title: 'Access denied · ATELIER', loadComponent: () => import('./features/errors/forbidden-page') },
    ],
  },
  {
    path: 'studio',
    canActivate: [roleGuard('ADMIN', 'COLLABORATEUR')],
    loadChildren: () => import('./features/studio/studio.routes'),
  },
  { path: '**', title: 'Not found · ATELIER', loadComponent: () => import('./features/errors/not-found-page') },
];
